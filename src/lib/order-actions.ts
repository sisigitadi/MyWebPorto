"use server";

import { db, isDbConnected } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc, sql, and, or, ilike, inArray } from "drizzle-orm";
import { headers } from "next/headers";
import { verifyAdmin } from "@/lib/admin-auth";
import { sanitizeError } from "@/lib/error-utils";
import { logAudit } from "@/lib/audit";
import { getProfile } from "@/lib/actions";
import { parseLegacyBankInfo, normalizeBankAccounts, type BankAccountItem } from "@/lib/whatsapp-order";
import { CreateOrderInputSchema, type CreateOrderInput } from "@/lib/validations";
import { matchesImageSignature, putMedia } from "@/lib/storage";
import { rateLimit, cleanupRateLimits } from "@/lib/rate-limit";

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
// ORDER CREATION & SECURITY HELPERS
// ==========================================

const ORDER_RATE_LIMIT = 10;
const ORDER_RATE_WINDOW_MS = 5 * 60_000;
const INVOICE_ALPHANUM = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ";

async function orderClientIp(): Promise<string> {
  try {
    const h = await headers();
    const fwd = h.get("x-forwarded-for");
    if (fwd) return fwd.split(",")[0].trim();
    return h.get("x-real-ip") || "unknown";
  } catch {
    return "unknown";
  }
}

function generateInvoiceSuffix(len = 4): string {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => INVOICE_ALPHANUM[b % INVOICE_ALPHANUM.length]).join("");
}

function maskPhone(phone: string): string {
  const trimmed = (phone || "").trim();
  if (trimmed.length <= 6) return "***";
  return `${trimmed.slice(0, 4)}****${trimmed.slice(-3)}`;
}

function maskEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const trimmed = email.trim();
  const atIdx = trimmed.indexOf("@");
  if (atIdx <= 1) return `***${trimmed.slice(Math.max(0, atIdx))}`;
  return `${trimmed.slice(0, 2)}***${trimmed.slice(atIdx)}`;
}

function maskAddress(address: string | null | undefined): string | null {
  if (!address) return null;
  const trimmed = address.trim();
  if (trimmed.length <= 8) return "***";
  return `${trimmed.slice(0, 6)}...`;
}

function maskPublicOrderPii(order: schema.Order): schema.Order {
  return {
    ...order,
    customerPhone: maskPhone(order.customerPhone),
    customerEmail: maskEmail(order.customerEmail),
    customerAddress: maskAddress(order.customerAddress),
    adminNotes: null,
  };
}

/**
 * Menyimpan pesanan baru ke tabel orders dan meng-upsert data pembeli ke tabel customers.
 */
export async function createOrder(input: CreateOrderInput) {
  try {
    const ip = await orderClientIp();
    const rl = rateLimit(`create-order:${ip}`, ORDER_RATE_LIMIT, ORDER_RATE_WINDOW_MS);
    cleanupRateLimits();
    if (!rl.allowed) {
      return {
        success: false,
        error: "Terlalu banyak permintaan pembuatan pesanan. Silakan tunggu beberapa menit.",
      };
    }

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
    const randomSuffix = generateInvoiceSuffix(4);
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

    // Validasi harga, ketersediaan, & stok langsung dari tabel products di server
    const requestedProductIds = Array.from(new Set(data.items.map((it) => it.productId)));
    const dbProducts = await db
      .select()
      .from(schema.products)
      .where(inArray(schema.products.id, requestedProductIds));
    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    const authoritativeItems: schema.Order["items"] = [];
    for (const item of data.items) {
      const dbProd = productMap.get(item.productId);
      if (!dbProd || !dbProd.published) {
        return {
          success: false,
          error: `Produk "${item.title}" tidak ditemukan atau sedang tidak tersedia.`,
        };
      }
      if (dbProd.stock !== null && dbProd.stock !== undefined && dbProd.stock < item.quantity) {
        return {
          success: false,
          error:
            dbProd.stock <= 0
              ? `Stok untuk produk "${dbProd.title}" sudah habis.`
              : `Stok untuk produk "${dbProd.title}" hanya tersisa ${dbProd.stock}.`,
        };
      }
      const authoritativePrice = typeof dbProd.priceAmount === "number" && dbProd.priceAmount >= 0 ? dbProd.priceAmount : 0;
      authoritativeItems.push({
        productId: dbProd.id,
        title: dbProd.title,
        titleEn: dbProd.titleEn || item.titleEn || null,
        price: authoritativePrice,
        quantity: item.quantity,
        subtotal: authoritativePrice * item.quantity,
        imageUrl: dbProd.imageUrl || item.imageUrl || null,
      });
    }

    const authoritativeTotal = authoritativeItems.reduce((sum, it) => sum + it.subtotal, 0);

    // 1. Simpan pesanan & kurangi stok produk terbatas secara atomik
    const insertedOrder = await db.transaction(async (tx) => {
      for (const item of authoritativeItems) {
        const dbProd = productMap.get(item.productId);
        if (dbProd && dbProd.stock !== null && dbProd.stock !== undefined) {
          const updatedStock = await tx
            .update(schema.products)
            .set({
              stock: sql`${schema.products.stock} - ${item.quantity}`,
              updatedAt: now,
            })
            .where(
              and(
                eq(schema.products.id, item.productId),
                sql`${schema.products.stock} >= ${item.quantity}`
              )
            )
            .returning({ id: schema.products.id });
          if (updatedStock.length === 0) {
            throw new Error(`Stok untuk produk "${dbProd.title}" tidak mencukupi.`);
          }
        }
      }

      const [created] = await tx
        .insert(schema.orders)
        .values({
          invoiceNumber,
          customerName: data.customerName.trim(),
          customerPhone: data.customerPhone.trim(),
          customerEmail: data.customerEmail?.trim() || null,
          customerAddress: data.customerAddress?.trim() || null,
          customerNotes: data.customerNotes?.trim() || null,
          items: authoritativeItems,
          totalAmount: authoritativeTotal,
          currency: "IDR",
          paymentMethod: data.paymentMethod,
          paymentProofUrl: data.paymentProofUrl?.trim() || null,
          status: "pending",
          referralCode: data.referralCode?.trim() || null,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return created;
    });

    // 2. Upsert ke tabel customers untuk keperluan promosi/retensi (totalSpent hanya bertambah saat pesanan dibayar)
    try {
      if (cleanPhone) {
        const existingCust = await db.query.customers.findFirst({
          where: eq(schema.customers.phone, cleanPhone),
        });

        const newTags: string[] = existingCust?.tags || [];
        if (!newTags.includes("Pelanggan Baru") && !existingCust) {
          newTags.push("Pelanggan Baru");
        }
        if (data.paymentMethod === "paypal" && !newTags.includes("Pembeli Internasional")) {
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
            totalSpent: 0,
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

    revalidatePath("/");
    revalidatePath("/toko");
    revalidatePath("/admin/orders");
    revalidatePath("/admin/customers");

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
      where: eq(schema.orders.invoiceNumber, invoiceNumber.trim().toUpperCase()),
    });
    return row ? maskPublicOrderPii(row) : null;
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

    const wasPaid =
      existing.status === "paid" ||
      existing.status === "processing" ||
      existing.status === "completed";
    const isNowPaid =
      status === "paid" || status === "processing" || status === "completed";

    await db
      .update(schema.orders)
      .set({
        status,
        adminNotes: adminNotes !== undefined ? adminNotes.trim() : existing.adminNotes,
        projectUrl: projectUrl !== undefined ? projectUrl.trim() : existing.projectUrl,
        updatedAt: new Date(),
      })
      .where(eq(schema.orders.id, orderId));

    // Akumulasikan totalSpent pelanggan saat pesanan berubah menjadi terbayar
    if (!wasPaid && isNowPaid && existing.totalAmount > 0) {
      const cleanPhone = existing.customerPhone.replace(/\D/g, "");
      if (cleanPhone) {
        try {
          await db
            .update(schema.customers)
            .set({
              totalSpent: sql`${schema.customers.totalSpent} + ${existing.totalAmount}`,
              updatedAt: new Date(),
            })
            .where(eq(schema.customers.phone, cleanPhone));
        } catch (custErr) {
          console.warn("[order-actions] update totalSpent gagal:", custErr);
        }
      }
    }

    await logAudit({
      action: "UPDATE",
      entity: "ORDER",
      entityId: orderId,
      detail: `Mengubah status pesanan ${existing.invoiceNumber} -> ${status.toUpperCase()}`,
    });

    revalidatePath("/admin/orders");
    revalidatePath("/admin/customers");
    revalidatePath(`/order/${existing.invoiceNumber}`);

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
    await verifyAdmin();
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

    revalidatePath("/admin/orders");
    revalidatePath(`/order/${existing.invoiceNumber}`);

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
    const ip = await orderClientIp();
    const rl = rateLimit(`upload-proof:${ip}`, ORDER_RATE_LIMIT, ORDER_RATE_WINDOW_MS);
    cleanupRateLimits();
    if (!rl.allowed) {
      return {
        success: false,
        error: "Terlalu banyak percobaan unggah bukti pembayaran. Silakan tunggu beberapa menit.",
      };
    }

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
    const normalizedMime = file.type === "image/jpg" ? "image/jpeg" : file.type;

    if (!isDbConnected) {
      return {
        success: true,
        paymentProofUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop",
        message: "Bukti transfer tercatat (mode offline lokal).",
      };
    }

    const order = await db.query.orders.findFirst({
      where: eq(schema.orders.invoiceNumber, invoiceNumber.trim().toUpperCase()),
    });

    if (!order) {
      return { success: false, error: "Pesanan dengan nomor invoice tersebut tidak ditemukan." };
    }

    if (order.status !== "pending") {
      return {
        success: false,
        error: "Bukti pembayaran hanya dapat diunggah atau diganti untuk pesanan yang masih berstatus menunggu pembayaran.",
      };
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
    if (!matchesImageSignature(buffer, normalizedMime)) {
      return {
        success: false,
        error: "Isi file gambar tidak valid atau tidak sesuai dengan format JPG/PNG/WEBP.",
      };
    }
    const fileName = file.name || `proof-${order.invoiceNumber}.jpg`;

    const res = await putMedia(fileName, buffer, normalizedMime);
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

