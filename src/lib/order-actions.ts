"use server";

import { db, isDbConnected } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc, sql, and, or, ilike } from "drizzle-orm";
import { verifyAdmin } from "@/lib/admin-auth";
import { sanitizeError } from "@/lib/error-utils";
import { logAudit } from "@/lib/audit";
import { getProfile } from "@/lib/actions";
import { parseLegacyBankInfo, normalizeBankAccounts, type BankAccountItem } from "@/lib/whatsapp-order";
import { CreateOrderInputSchema, type CreateOrderInput } from "@/lib/validations";

export type { BankAccountItem, CreateOrderInput };


export interface InternationalPaymentConfig {
  paypalUrl?: string;
  wiseInfo?: string;
  stripeUrl?: string;
  instructionsEn?: string;
}

export interface StoreConfig {
  adminWhatsapp: string;
  bankAccounts: BankAccountItem[];
  qrisImageUrl: string;
  internationalPayment: InternationalPaymentConfig;
  storeNotice?: string;
}

const DEFAULT_STORE_CONFIG: StoreConfig = {
  adminWhatsapp: "",
  bankAccounts: [],
  qrisImageUrl: "",
  internationalPayment: {
    paypalUrl: "",
    wiseInfo: "",
    stripeUrl: "",
    instructionsEn: "Please send payment via PayPal or Wise to our account, then confirm via WhatsApp chat.",
  },
  storeNotice: "",
};


/**
 * Mengambil konfigurasi toko terpusat dari tabel settings (key "store_config").
 * Bila belum pernah diatur, fallback otomatis ke paymentQrUrl & paymentBankInfo di profil.
 */
export async function getStoreConfig(): Promise<StoreConfig> {
  const profile = await getProfile().catch(() => null);

  if (!isDbConnected) {
    return {
      ...DEFAULT_STORE_CONFIG,
      adminWhatsapp: profile?.phone || "",
      qrisImageUrl: profile?.paymentQrUrl || "",
      bankAccounts: normalizeBankAccounts(parseLegacyBankInfo(profile?.paymentBankInfo)),
    };
  }

  try {
    const row = await db.query.settings.findFirst({
      where: eq(schema.settings.key, "store_config"),
    });

    if (row && row.value && typeof row.value === "object") {
      const cfg = row.value as Partial<StoreConfig>;
      const rawBankAccounts = Array.isArray(cfg.bankAccounts) && cfg.bankAccounts.length > 0
        ? cfg.bankAccounts
        : parseLegacyBankInfo(profile?.paymentBankInfo);
      const bankAccounts = normalizeBankAccounts(rawBankAccounts);

      return {
        adminWhatsapp: cfg.adminWhatsapp || profile?.phone || "",
        bankAccounts,
        qrisImageUrl: cfg.qrisImageUrl || profile?.paymentQrUrl || "",
        internationalPayment: {
          paypalUrl: cfg.internationalPayment?.paypalUrl || "",
          wiseInfo: cfg.internationalPayment?.wiseInfo || "",
          stripeUrl: cfg.internationalPayment?.stripeUrl || "",
          instructionsEn: cfg.internationalPayment?.instructionsEn || DEFAULT_STORE_CONFIG.internationalPayment.instructionsEn,
        },
        storeNotice: cfg.storeNotice || "",
      };
    }

    // Fallback awal ke profil
    return {
      ...DEFAULT_STORE_CONFIG,
      adminWhatsapp: profile?.phone || "",
      qrisImageUrl: profile?.paymentQrUrl || "",
      bankAccounts: normalizeBankAccounts(parseLegacyBankInfo(profile?.paymentBankInfo)),
    };
  } catch (err) {
    console.error("[order-actions] getStoreConfig gagal:", err);
    return {
      ...DEFAULT_STORE_CONFIG,
      adminWhatsapp: profile?.phone || "",
      qrisImageUrl: profile?.paymentQrUrl || "",
      bankAccounts: normalizeBankAccounts(parseLegacyBankInfo(profile?.paymentBankInfo)),
    };
  }
}

/**
 * Menyimpan konfigurasi toko oleh admin terotentikasi.
 */
export async function saveStoreConfig(data: Partial<StoreConfig>) {
  try {
    await verifyAdmin();
    if (!isDbConnected) {
      return { success: false, error: "Database tidak terhubung" };
    }

    const current = await getStoreConfig();
    const updated: StoreConfig = {
      adminWhatsapp: data.adminWhatsapp !== undefined ? data.adminWhatsapp.trim() : current.adminWhatsapp,
      bankAccounts: Array.isArray(data.bankAccounts) ? normalizeBankAccounts(data.bankAccounts) : current.bankAccounts,
      qrisImageUrl: data.qrisImageUrl !== undefined ? data.qrisImageUrl.trim() : current.qrisImageUrl,
      internationalPayment: {
        ...current.internationalPayment,
        ...(data.internationalPayment || {}),
      },
      storeNotice: data.storeNotice !== undefined ? data.storeNotice.trim() : current.storeNotice,
    };

    await db
      .insert(schema.settings)
      .values({
        key: "store_config",
        value: updated,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: schema.settings.key,
        set: {
          value: updated,
          updatedAt: new Date(),
        },
      });

    await logAudit({
      action: "UPDATE",
      entity: "SETTINGS",
      entityId: "store_config",
      detail: `Memperbarui konfigurasi toko (WA Admin: ${updated.adminWhatsapp || "-"})`,
    });

    return { success: true, message: "Pengaturan toko berhasil disimpan!" };
  } catch (err) {
    return { success: false, error: sanitizeError(err) };
  }
}

// ==========================================
// ORDER CREATION
// ==========================================


/**
 * Menyimpan pesanan baru ke tabel orders dan meng-upsert data pembeli ke tabel customers.
 */
export async function createOrder(input: CreateOrderInput) {
  try {
    const parsed = CreateOrderInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Data pesanan tidak valid",
      };
    }

    const data = parsed.data;
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, "0");
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yyyy = now.getFullYear();
    const dateStr = `${dd}${mm}${yyyy}`;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `INV-${dateStr}-${randomSuffix}`;
    const cleanPhone = data.customerPhone.replace(/\D/g, "");

    if (!isDbConnected) {
      return {
        success: true,
        invoiceNumber,
        orderId: `order-local-${Date.now()}`,
        message: "Pesanan tercatat (mode offline)",
      };
    }

    // 1. Simpan pesanan
    const [insertedOrder] = await db
      .insert(schema.orders)
      .values({
        invoiceNumber,
        customerName: data.customerName.trim(),
        customerPhone: data.customerPhone.trim(),
        customerEmail: data.customerEmail?.trim() || null,
        customerAddress: data.customerAddress?.trim() || null,
        customerNotes: data.customerNotes?.trim() || null,
        items: data.items,
        totalAmount: data.totalAmount,
        currency: data.currency,
        paymentMethod: data.paymentMethod,
        paymentProofUrl: data.paymentProofUrl?.trim() || null,
        status: "pending",
        referralCode: data.referralCode?.trim() || null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // 2. Upsert ke tabel customers untuk keperluan promosi/retensi
    try {
      if (cleanPhone) {
        const existingCust = await db.query.customers.findFirst({
          where: eq(schema.customers.phone, cleanPhone),
        });

        const newTags: string[] = existingCust?.tags || [];
        if (!newTags.includes("Pelanggan Baru") && !existingCust) {
          newTags.push("Pelanggan Baru");
        }
        if (data.currency === "USD" && !newTags.includes("Pembeli Internasional")) {
          newTags.push("Pembeli Internasional");
        }
        if (data.paymentMethod === "freelanceops" && !newTags.includes("Klien Jasa Proyek")) {
          newTags.push("Klien Jasa Proyek");
        }
        if (existingCust && existingCust.totalOrders >= 2 && !newTags.includes("Pelanggan Setia")) {
          newTags.push("Pelanggan Setia");
        }

        if (existingCust) {
          await db
            .update(schema.customers)
            .set({
              name: data.customerName.trim(),
              email: data.customerEmail?.trim() || existingCust.email,
              address: data.customerAddress?.trim() || existingCust.address,
              totalOrders: existingCust.totalOrders + 1,
              totalSpent: existingCust.totalSpent + data.totalAmount,
              lastOrderAt: now,
              tags: newTags,
              updatedAt: now,
            })
            .where(eq(schema.customers.id, existingCust.id));
        } else {
          await db.insert(schema.customers).values({
            name: data.customerName.trim(),
            phone: cleanPhone,
            email: data.customerEmail?.trim() || null,
            address: data.customerAddress?.trim() || null,
            totalOrders: 1,
            totalSpent: data.totalAmount,
            lastOrderAt: now,
            tags: newTags,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    } catch (custErr) {
      console.warn("[order-actions] upsert customer gagal (non-fatal):", custErr);
    }

    return {
      success: true,
      invoiceNumber,
      orderId: insertedOrder?.id || invoiceNumber,
      message: "Pesanan berhasil dicatat!",
    };
  } catch (err) {
    console.error("[order-actions] createOrder gagal:", err);
    return { success: false, error: sanitizeError(err) };
  }
}

// ==========================================
// ADMIN ORDER MANAGEMENT
// ==========================================

export interface OrderFilterParams {
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export async function getOrders(filters: OrderFilterParams = {}) {
  try {
    await verifyAdmin();
    if (!isDbConnected) {
      return { success: true, orders: [], total: 0 };
    }

    const { status, search, limit = 50, offset = 0 } = filters;
    const conditions = [];

    if (status && status !== "all") {
      conditions.push(eq(schema.orders.status, status));
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(schema.orders.invoiceNumber, q),
          ilike(schema.orders.customerName, q),
          ilike(schema.orders.customerPhone, q),
          ilike(schema.orders.customerEmail, q),
          ilike(schema.orders.referralCode, q)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const list = await db.query.orders.findMany({
      where: whereClause,
      orderBy: [desc(schema.orders.createdAt)],
      limit,
      offset,
    });

    return { success: true, orders: list, total: list.length };
  } catch (err) {
    return { success: false, error: sanitizeError(err), orders: [], total: 0 };
  }
}

/**
 * Mendapatkan detail pesanan berdasarkan nomor invoice (Akses Publik / Mandiri).
 */
export async function getOrderByInvoice(invoiceNumber: string) {
  if (!isDbConnected || !invoiceNumber) return null;
  try {
    const row = await db.query.orders.findFirst({
      where: eq(schema.orders.invoiceNumber, invoiceNumber.trim()),
    });
    return row || null;
  } catch (err) {
    console.error("[order-actions] getOrderByInvoice error:", err);
    return null;
  }
}

/**
 * Memperbarui status pesanan, catatan admin, atau tautan proyek FreelanceOps.
 */
export async function updateOrderStatus(
  orderId: string,
  status: "pending" | "paid" | "processing" | "completed" | "cancelled",
  adminNotes?: string,
  projectUrl?: string
) {
  try {
    await verifyAdmin();
    if (!isDbConnected) {
      return { success: false, error: "Database tidak terhubung" };
    }

    const existing = await db.query.orders.findFirst({
      where: eq(schema.orders.id, orderId),
    });

    if (!existing) {
      return { success: false, error: "Pesanan tidak ditemukan" };
    }

    await db
      .update(schema.orders)
      .set({
        status,
        adminNotes: adminNotes !== undefined ? adminNotes.trim() : existing.adminNotes,
        projectUrl: projectUrl !== undefined ? projectUrl.trim() : existing.projectUrl,
        updatedAt: new Date(),
      })
      .where(eq(schema.orders.id, orderId));

    await logAudit({
      action: "UPDATE",
      entity: "ORDER",
      entityId: orderId,
      detail: `Mengubah status pesanan ${existing.invoiceNumber} -> ${status.toUpperCase()}`,
    });

    return { success: true, message: `Status pesanan berhasil diubah menjadi ${status}!` };
  } catch (err) {
    return { success: false, error: sanitizeError(err) };
  }
}

/**
 * Menghitung jumlah pesanan berstatus "pending" untuk notifikasi admin.
 */
export async function getPendingOrdersCount(): Promise<number> {
  if (!isDbConnected) return 0;
  try {
    const rows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.orders)
      .where(eq(schema.orders.status, "pending"));
    return rows[0]?.count || 0;
  } catch {
    return 0;
  }
}

// ==========================================
// CUSTOMER DIRECTORY (RETENSI & PROMO)
// ==========================================

export async function getCustomers(searchQuery?: string) {
  try {
    await verifyAdmin();
    if (!isDbConnected) {
      return { success: true, customers: [], total: 0 };
    }

    let whereClause = undefined;
    if (searchQuery && searchQuery.trim()) {
      const q = `%${searchQuery.trim()}%`;
      whereClause = or(
        ilike(schema.customers.name, q),
        ilike(schema.customers.phone, q),
        ilike(schema.customers.email, q),
        ilike(schema.customers.address, q)
      );
    }

    const list = await db.query.customers.findMany({
      where: whereClause,
      orderBy: [desc(schema.customers.lastOrderAt)],
      limit: 100,
    });

    return { success: true, customers: list, total: list.length };
  } catch (err) {
    return { success: false, error: sanitizeError(err), customers: [], total: 0 };
  }
}

/**
 * Menghapus pesanan oleh admin.
 */
export async function deleteOrder(orderId: string) {
  try {
    await verifyAdmin();
    if (!isDbConnected) {
      return { success: false, error: "Database tidak terhubung" };
    }

    const existing = await db.query.orders.findFirst({
      where: eq(schema.orders.id, orderId),
    });

    if (!existing) {
      return { success: false, error: "Pesanan tidak ditemukan" };
    }

    await db.delete(schema.orders).where(eq(schema.orders.id, orderId));

    await logAudit({
      action: "DELETE",
      entity: "ORDER",
      entityId: orderId,
      detail: `Menghapus pesanan ${existing.invoiceNumber}`,
    });

    return { success: true, message: `Pesanan ${existing.invoiceNumber} berhasil dihapus!` };
  } catch (err) {
    return { success: false, error: sanitizeError(err) };
  }
}

