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
import { putMedia } from "@/lib/storage";

export type { BankAccountItem, CreateOrderInput };


import { cache } from "react";
import { revalidatePath } from "next/cache";
import {
  DEFAULT_STORE_CONFIG,
  type InternationalPaymentConfig,
  type PaymentMethodsConfig,
  type StoreConfig,
} from "./store-config";

export type { InternationalPaymentConfig, PaymentMethodsConfig, StoreConfig };


/**
 * Mengambil konfigurasi toko terpusat dari tabel settings (key "store_config").
 * Bila belum pernah diatur, fallback otomatis ke paymentQrUrl & paymentBankInfo di profil.
 */
const getStoreConfigInternal = cache(async (): Promise<StoreConfig> => {
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
        qrisMerchantName: cfg.qrisMerchantName || "",
        paymentMethods: {
          qris: cfg.paymentMethods?.qris !== false,
          bank: cfg.paymentMethods?.bank !== false,
          paypal: cfg.paymentMethods?.paypal !== false,
          wa_direct: cfg.paymentMethods?.wa_direct !== false,
        },
        internationalPayment: {
          paypalUrl: cfg.internationalPayment?.paypalUrl || "",
          wiseInfo: cfg.internationalPayment?.wiseInfo || "",
          stripeUrl: cfg.internationalPayment?.stripeUrl || "",
          instructionsEn: cfg.internationalPayment?.instructionsEn || DEFAULT_STORE_CONFIG.internationalPayment.instructionsEn,
        },
        storeNotice: cfg.storeNotice || "",
        whatsappOnlyMode: Boolean(cfg.whatsappOnlyMode),
        allowPaymentProofUpload: cfg.allowPaymentProofUpload !== false,
      };
    }

    // Fallback awal ke profil
    return {
      ...DEFAULT_STORE_CONFIG,
      adminWhatsapp: profile?.phone || "",
      qrisImageUrl: profile?.paymentQrUrl || "",
      bankAccounts: normalizeBankAccounts(parseLegacyBankInfo(profile?.paymentBankInfo)),
      whatsappOnlyMode: false,
      allowPaymentProofUpload: true,
    };
  } catch (err) {
    console.error("[order-actions] getStoreConfig gagal:", err);
    return {
      ...DEFAULT_STORE_CONFIG,
      adminWhatsapp: profile?.phone || "",
      qrisImageUrl: profile?.paymentQrUrl || "",
      bankAccounts: normalizeBankAccounts(parseLegacyBankInfo(profile?.paymentBankInfo)),
      whatsappOnlyMode: false,
      allowPaymentProofUpload: true,
    };
  }
});

export async function getStoreConfig(): Promise<StoreConfig> {
  return getStoreConfigInternal();
}

/**
 * Menyimpan konfigurasi toko oleh admin terotentikasi.
 * Otomatis menyinkronkan data rekening ke profil pemilik dan merevalidasi halaman publik.
 */
export async function saveStoreConfig(data: Partial<StoreConfig>) {
  try {
    await verifyAdmin();
    if (!isDbConnected) {
      return { success: false, error: "Database tidak terhubung" };
    }

    const current = await getStoreConfig();
    const updatedBankAccounts = Array.isArray(data.bankAccounts)
      ? normalizeBankAccounts(data.bankAccounts)
      : current.bankAccounts;

    const updated: StoreConfig = {
      adminWhatsapp: data.adminWhatsapp !== undefined ? data.adminWhatsapp.trim() : current.adminWhatsapp,
      bankAccounts: updatedBankAccounts,
      qrisImageUrl: data.qrisImageUrl !== undefined ? data.qrisImageUrl.trim() : current.qrisImageUrl,
      qrisMerchantName: data.qrisMerchantName !== undefined ? data.qrisMerchantName.trim() : (current.qrisMerchantName || ""),
      paymentMethods: {
        qris: data.paymentMethods?.qris !== undefined ? Boolean(data.paymentMethods.qris) : (current.paymentMethods?.qris !== false),
        bank: data.paymentMethods?.bank !== undefined ? Boolean(data.paymentMethods.bank) : (current.paymentMethods?.bank !== false),
        paypal: data.paymentMethods?.paypal !== undefined ? Boolean(data.paymentMethods.paypal) : (current.paymentMethods?.paypal !== false),
        wa_direct: data.paymentMethods?.wa_direct !== undefined ? Boolean(data.paymentMethods.wa_direct) : (current.paymentMethods?.wa_direct !== false),
      },
      internationalPayment: {
        ...current.internationalPayment,
        ...(data.internationalPayment || {}),
      },
      storeNotice: data.storeNotice !== undefined ? data.storeNotice.trim() : current.storeNotice,
      whatsappOnlyMode: data.whatsappOnlyMode !== undefined ? Boolean(data.whatsappOnlyMode) : Boolean(current.whatsappOnlyMode),
      allowPaymentProofUpload: data.allowPaymentProofUpload !== undefined ? Boolean(data.allowPaymentProofUpload) : (current.allowPaymentProofUpload !== false),
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

    // Sinkronisasi nomor rekening aktif ke profil pemilik
    const activeBanks = updatedBankAccounts.filter((b) => b.isActive !== false);
    const legacyBankInfoText = activeBanks.length > 0
      ? activeBanks
          .map((b) => `${b.bankName} ${b.accountNumber}${b.accountHolder ? ` a.n. ${b.accountHolder}` : ""}${b.notes ? ` (${b.notes})` : ""}`)
          .join("\n")
      : "";

    try {
      await db
        .update(schema.profiles)
        .set({
          paymentBankInfo: legacyBankInfoText,
          paymentQrUrl: updated.qrisImageUrl || null,
          updatedAt: new Date(),
        })
        .where(eq(schema.profiles.id, "owner"));
    } catch (syncErr) {
      console.warn("[order-actions] Gagal sinkronisasi data rekening ke profile:", syncErr);
    }

    await logAudit({
      action: "UPDATE",
      entity: "SETTINGS",
      entityId: "store_config",
      detail: `Memperbarui konfigurasi metode pembayaran & rekening (WA: ${updated.adminWhatsapp || "-"}, ${updatedBankAccounts.length} rekening)`,
    });

    // Revalidasi rute yang terpengaruh konfigurasi toko
    revalidatePath("/");
    revalidatePath("/(public)", "layout");
    revalidatePath("/toko");
    revalidatePath("/admin/profile");
    revalidatePath("/admin/orders");

    return {
      success: true,
      message: "Pengaturan metode pembayaran & rekening berhasil disimpan dan langsung aktif di publik!",
    };
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

/**
 * Mengunggah bukti pembayaran oleh pembeli mandiri pada halaman invoice /order/[invoice].
 */
export async function uploadPaymentProof(invoiceNumber: string, formData: FormData) {
  try {
    const file = formData.get("file") as File | null;
    if (!file || file.size === 0) {
      return { success: false, error: "File bukti pembayaran tidak ditemukan." };
    }

    // Maksimal 5MB
    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: "Ukuran file bukti pembayaran maksimal 5MB." };
    }

    const allowedMimes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!allowedMimes.includes(file.type)) {
      return { success: false, error: "Format file harus berupa gambar (JPG, PNG, atau WEBP)." };
    }

    if (!isDbConnected) {
      return {
        success: true,
        paymentProofUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop",
        message: "Bukti transfer tercatat (mode offline lokal).",
      };
    }

    const order = await db.query.orders.findFirst({
      where: eq(schema.orders.invoiceNumber, invoiceNumber.trim()),
    });

    if (!order) {
      return { success: false, error: "Pesanan dengan nomor invoice tersebut tidak ditemukan." };
    }

    if (order.status === "cancelled") {
      return { success: false, error: "Pesanan ini sudah dibatalkan dan tidak dapat menerima bukti pembayaran." };
    }

    const storeConfig = await getStoreConfig();
    if (storeConfig.allowPaymentProofUpload === false) {
      return {
        success: false,
        error: "Upload bukti transfer mandiri via web sedang dinonaktifkan oleh admin. Silakan kirimkan bukti pembayaran Anda langsung via WhatsApp.",
      };
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = file.name || `proof-${order.invoiceNumber}.jpg`;

    const res = await putMedia(fileName, buffer, file.type);
    if (!res.ok) {
      return { success: false, error: res.error || "Gagal menyimpan file bukti pembayaran." };
    }

    const paymentProofUrl = `/api/media/${res.id}`;
    const now = new Date();

    await db
      .update(schema.orders)
      .set({
        paymentProofUrl,
        updatedAt: now,
      })
      .where(eq(schema.orders.id, order.id));

    await logAudit({
      action: "UPDATE",
      entity: "ORDER",
      entityId: order.invoiceNumber,
      detail: `Pembeli mengunggah bukti pembayaran untuk invoice ${order.invoiceNumber} (${paymentProofUrl})`,
    });

    revalidatePath(`/order/${invoiceNumber}`);
    revalidatePath("/admin/orders");

    return {
      success: true,
      paymentProofUrl,
      message: "Bukti transfer berhasil diunggah! Admin akan segera memverifikasi pesanan Anda.",
    };
  } catch (err) {
    console.error("[order-actions] uploadPaymentProof gagal:", err);
    return { success: false, error: sanitizeError(err) };
  }
}

