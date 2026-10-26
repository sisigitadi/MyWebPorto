import {
  getProfile,
  getServices,
  getProducts,
  getProjects,
  getArticles,
} from "@/lib/actions";
import { getStoreConfig, getOrderByInvoice } from "@/lib/order-actions";
import { DEFAULT_STORE_CONFIG } from "@/lib/store-config";
import { getWABotConfig } from "./wa-storage";
import type { WABotConfig, WAKnowledgeFAQ } from "./wa-types";
import type { ProductData, ServiceData, ProjectData, ArticleData } from "@/lib/dummy-data";

export interface CompiledKnowledgeContext {
  systemPrompt: string;
  config: WABotConfig;
  rawSummary: {
    productsCount: number;
    servicesCount: number;
    projectsCount: number;
    bankAccountsCount: number;
    faqsCount: number;
  };
}

/**
 * Membangun konteks knowledge komprehensif untuk WhatsApp Bot.
 * Menggabungkan live database porto (produk, jasa, bank) + custom admin input.
 */
export async function buildWhatsAppBotKnowledge(): Promise<CompiledKnowledgeContext> {
  const [profile, services, products, projects, _articles, storeConfig, botConfig] =
    await Promise.all([
      getProfile().catch(() => ({
        name: "Sigit Adi Irianto",
        headline: "Artificial Intelligence | Cybersecurity",
        bio: "Spesialis pengembangan AI dan rekayasa keamanan siber.",
        email: "sigit@sigitadi.id",
        phone: "+6281234567890",
        location: "Indonesia",
        skills: ["AI Engineering", "Cybersecurity", "Fullstack Web", "Next.js"],
      })),
      getServices().catch((): ServiceData[] => []),
      getProducts().catch((): ProductData[] => []),
      getProjects().catch((): ProjectData[] => []),
      getArticles().catch((): ArticleData[] => []),
      getStoreConfig().catch(() => DEFAULT_STORE_CONFIG),
      getWABotConfig(),
    ]);

  // Format Produk & Harga
  const activeProducts = products.filter((p) => p.published);
  const productsText = activeProducts.length
    ? activeProducts
        .map((p, idx) => {
          const price = p.priceFormatted || "Hubungi Admin";
          const priceEn = p.priceLabelEn ? ` (${p.priceLabelEn})` : "";
          const stock = p.stock !== null && p.stock !== undefined ? ` [Stok: ${p.stock}]` : "";
          const link = p.slug ? `https://sigitadi.id/toko/${p.slug}` : "https://sigitadi.id/#produk";
          return `${idx + 1}. *${p.title}* - Harga: ${price}${priceEn}${stock}\n   Deskripsi: ${p.description.slice(0, 160)}\n   Link: ${link}`;
        })
        .join("\n\n")
    : "Belum ada produk aktif di etalase.";

  // Format Layanan & Jasa
  const activeServices = services.filter((s) => s.published);
  const servicesText = activeServices.length
    ? activeServices
        .map((s, idx) => `${idx + 1}. *${s.title}*: ${s.description.slice(0, 160)}`)
        .join("\n")
    : "Layanan utama: Jasa Pembuatan Website, Pengembangan Sistem AI, Audit Keamanan Siber, Konsultasi IT.";

  // Format Rekening & Pembayaran (Hanya yang berstatus AKTIF)
  const isBankEnabled = storeConfig.paymentMethods?.bank !== false;
  const isQrisEnabled = storeConfig.paymentMethods?.qris !== false && Boolean(storeConfig.qrisImageUrl);
  const isPaypalEnabled = storeConfig.paymentMethods?.paypal !== false;

  const bankAccounts = isBankEnabled
    ? (storeConfig.bankAccounts || []).filter((b) => b.isActive !== false)
    : [];
  const banksText = bankAccounts.length
    ? bankAccounts
        .map((b) => `• Bank ${b.bankName}: *${b.accountNumber}* a.n ${b.accountHolder}${b.notes ? ` (${b.notes})` : ""}`)
        .join("\n")
    : isBankEnabled
      ? "• Transfer Bank: Mandiri, BNI, BSI (Nomor rekening tertera di invoice/saat konfirmasi)"
      : "• Transfer Bank: Sedang dinonaktifkan sementara.";

  const intlPaymentText = isPaypalEnabled
    ? [
        storeConfig.internationalPayment?.paypalUrl
          ? `• PayPal: ${storeConfig.internationalPayment.paypalUrl}`
          : null,
        storeConfig.internationalPayment?.wiseInfo
          ? `• Wise/Transfer Internasional: ${storeConfig.internationalPayment.wiseInfo}`
          : null,
        storeConfig.internationalPayment?.instructionsEn
          ? `• Petunjuk: ${storeConfig.internationalPayment.instructionsEn}`
          : null,
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  // Format FAQ Kustom Admin
  const activeFaqs = botConfig.faqs.filter((f) => f.enabled);
  const faqsText = activeFaqs.length
    ? activeFaqs
        .map((f, idx) => `Q${idx + 1}: ${f.question}\nA${idx + 1}: ${f.answer}`)
        .join("\n\n")
    : "Belum ada FAQ kustom.";

  const qrisStatusText = isQrisEnabled
    ? "• Pembayaran instan QRIS aktif di halaman checkout website."
    : "• Pembayaran QRIS saat ini sedang dinonaktifkan.";

  // Susun System Prompt Komprehensif
  const systemPrompt = `
=== IDENTITAS & PERSONA BOT ===
Nama Bot: ${botConfig.botName || "Sigit AI Assistant"}
Pemilik Website: ${profile.name} (${profile.headline})
Kontak Resmi: Email ${profile.email || "-"}, WhatsApp Admin ${storeConfig.adminWhatsapp || profile.phone || "-"}
Website Utama: https://sigitadi.id
Platform Jasa & Kolaborasi Freelance: https://freelanceops.sigitadi.id

=== INSTRUKSI PERCAKAPAN ===
${botConfig.personaPrompt}

=== KEBIJAKAN & SOP BISNIS (INPUT ADMIN) ===
${botConfig.businessSOP || "Balas secara ramah dan tawarkan bantuan solusi terbaik."}

=== KATALOG PRODUK DIGITAL TERBARU ===
${productsText}

=== LAYANAN & JASA YANG TERSEDIA ===
${servicesText}
(Catatan: Untuk negosiasi dan manajemen proyek jasa terstruktur, klien juga bisa diarahkan ke https://freelanceops.sigitadi.id)

=== REKENING & METODE PEMBAYARAN RESMI ===
${banksText}
${intlPaymentText ? `\nPembayaran Internasional:\n${intlPaymentText}` : ""}
${qrisStatusText}

=== DAFTAR TANYA JAWAB (FAQ KUSTOM ADMIN) ===
${faqsText}

=== ATURAN FORMAT BALASAN WHATSAPP ===
1. Format teks menggunakan kaidah pesan WhatsApp (gunakan *tebal* untuk kata penting atau angka, bullet points rapi).
2. Jawaban harus padat, jelas, ramah, dan tidak bertele-tele (maksimal 2-3 paragraf pendek).
3. Jika penanya bertanya tentang harga atau produk tertentu, berikan harga resmi dan nomor rekening/link checkout yang relevan.
4. Jangan pernah mengarang nomor rekening lain selain yang tertera di atas.
5. Jika ada pertanyaan teknis yang sangat spesifik atau di luar data di atas, katakan dengan sopan bahwa Anda akan menyampaikan pesan ini langsung ke Mas Sigit.
`.trim();

  return {
    systemPrompt,
    config: botConfig,
    rawSummary: {
      productsCount: activeProducts.length,
      servicesCount: activeServices.length,
      projectsCount: projects.length,
      bankAccountsCount: bankAccounts.length,
      faqsCount: activeFaqs.length,
    },
  };
}

/**
 * Cek apakah pesan customer mengandung nomor invoice / faktur pesanan.
 * Jika ya, kembalikan detail status pesanan secara langsung.
 */
export async function detectAndLookupInvoice(
  text: string
): Promise<string | null> {
  const match = text.match(/\bINV-\d{8}-\d{4}\b/i) || text.match(/\bINV-[A-Z0-9-]{6,16}\b/i);
  if (!match) return null;

  const invoiceNumber = match[0].toUpperCase();
  try {
    const order = await getOrderByInvoice(invoiceNumber);
    if (!order) {
      return `Halo! Kami telah memeriksa invoice *${invoiceNumber}*, namun data pesanan tersebut belum ditemukan di sistem kami. Mohon pastikan nomor invoice yang dimasukkan sudah sesuai ya.`;
    }

    const statusLabels: Record<string, string> = {
      pending: "Menunggu Pembayaran",
      paid: "Pembayaran Diterima / Diproses",
      processing: "Sedang Dikerjakan / Disiapkan",
      completed: "Selesai",
      cancelled: "Dibatalkan",
    };

    const statusText = statusLabels[order.status] || order.status;
    const d = new Date(order.createdAt);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    const formattedDate = `${dd}/${mm}/${yyyy}`;

    const itemsSummary = (order.items as Array<Record<string, unknown>>)
      .map((it) => {
        const title = (it.title || it.productTitle || it.name || "Produk") as string;
        const qty = it.quantity || 1;
        return `• ${title} (x${qty})`;
      })
      .join("\n");

    return `*STATUS PESANAN #${invoiceNumber}*\n\n` +
      `👤 Pemesan: *${order.customerName}*\n` +
      `📅 Tanggal: ${formattedDate}\n` +
      `📦 Item:\n${itemsSummary}\n` +
      `💰 Total: *${order.currency === "USD" ? "$" : "Rp "}${Number(order.totalAmount).toLocaleString("id-ID")}*\n` +
      `📊 Status: *${statusText}*\n\n` +
      (order.status === "pending"
        ? `Silakan lakukan pembayaran ke rekening resmi kami atau kirim bukti transfer di sini agar pesanan segera diproses. Terima kasih!`
        : `Pesanan Anda sedang berjalan dengan lancar. Jika ada pertanyaan teknis lebih lanjut, tim kami siap membantu!`);
  } catch (err) {
    console.error("[wa-knowledge] Invoice lookup error:", err);
    return null;
  }
}

/**
 * Mencari jawaban instan dari FAQ bila ada kecocokan pertanyaan tinggi.
 */
export function findDirectFAQMatch(
  query: string,
  faqs: WAKnowledgeFAQ[]
): string | null {
  const clean = query.toLowerCase().trim();
  if (clean.length < 5) return null;

  for (const faq of faqs) {
    if (!faq.enabled) continue;
    const qClean = faq.question.toLowerCase().trim();
    if (clean === qClean) return faq.answer;

    // Cek kecocokan kata kunci
    const qWords = qClean.split(/\s+/).filter((w) => w.length > 3);
    const matches = qWords.filter((w) => clean.includes(w));
    if (matches.length >= 3 && matches.length / qWords.length > 0.6) {
      return faq.answer;
    }
  }

  return null;
}
