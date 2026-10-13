import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildWhatsAppBotKnowledge,
  detectAndLookupInvoice,
  findDirectFAQMatch,
} from "@/lib/whatsapp-bot/wa-knowledge";
import { generateWhatsAppReply } from "@/lib/whatsapp-bot/wa-engine";
import { DEFAULT_FAQS } from "@/lib/whatsapp-bot/wa-storage";

// Mock database and action calls for deterministic unit testing
vi.mock("@/lib/actions", () => ({
  getProfile: vi.fn().mockResolvedValue({
    name: "Sigit Adi Irianto",
    headline: "AI & Cybersecurity Engineer",
    bio: "Test bio",
    skills: ["AI", "Cybersecurity"],
    email: "sigit@sigitadi.id",
    phone: "6281234567890",
    location: "Indonesia",
  }),
  getServices: vi.fn().mockResolvedValue([
    { id: "s-1", title: "Pembuatan Website Modern", description: "Jasa web", published: true },
    { id: "s-2", title: "Audit Keamanan Siber", description: "Audit security", published: true },
  ]),
  getProducts: vi.fn().mockResolvedValue([
    {
      id: "p-1",
      title: "Template Dashboard SaaS",
      priceFormatted: "Rp 250.000",
      priceLabelEn: "$25",
      description: "Starter pack lengkap",
      published: true,
      stock: 10,
      slug: "template-dashboard-saas",
    },
  ]),
  getProjects: vi.fn().mockResolvedValue([
    { id: "pr-1", title: "FreelanceOps Platform", slug: "freelanceops", published: true },
  ]),
  getArticles: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/order-actions", () => ({
  getStoreConfig: vi.fn().mockResolvedValue({
    adminWhatsapp: "6281234567890",
    bankAccounts: [
      { bankName: "MANDIRI", accountNumber: "1550013789089", accountHolder: "Sigit Adi Irianto" },
      { bankName: "BNI", accountNumber: "5560605660", accountHolder: "Sigit Adi Irianto" },
    ],
    internationalPayment: {
      paypalUrl: "https://paypal.me/sigitadi",
      wiseInstructions: "Transfer Wise ke sigit@sigitadi.id",
    },
    storeNotice: "Toko resmi",
  }),
  getOrderByInvoice: vi.fn().mockImplementation((inv: string) => {
    if (inv === "INV-20261013-2820") {
      return Promise.resolve({
        id: "ord-test-1",
        invoiceNumber: "INV-20261013-2820",
        customerName: "Budi Santoso",
        customerPhone: "081299887766",
        totalAmount: 250000,
        currency: "IDR",
        status: "pending",
        items: [{ productId: "p-1", title: "Template Dashboard SaaS", productTitle: "Template Dashboard SaaS", quantity: 1, unitPrice: 250000 }],
        createdAt: "2026-10-13T10:00:00.000Z",
      });
    }
    return Promise.resolve(null);
  }),
}));

vi.mock("@/lib/whatsapp-bot/wa-storage", () => ({
  DEFAULT_FAQS: [
    {
      id: "faq-test-1",
      question: "Berapa lama proses pembuatan website?",
      answer: "Pengerjaan website biasanya 3-7 hari kerja.",
      category: "jasa",
      enabled: true,
      updatedAt: "2026-10-13",
    },
  ],
  getWABotConfig: vi.fn().mockResolvedValue({
    enabled: true,
    autoReply: true,
    botName: "Sigit AI Assistant",
    personaPrompt: "Asisten resmi yang ramah dan solutif.",
    businessSOP: "Jam kerja 08.00-21.00 WIB.",
    adminExclusions: [],
    delaySeconds: 1,
    faqs: [
      {
        id: "faq-test-1",
        question: "Berapa lama proses pembuatan website?",
        answer: "Pengerjaan website biasanya 3-7 hari kerja.",
        category: "jasa",
        enabled: true,
        updatedAt: "2026-10-13",
      },
    ],
  }),
  appendWAChatLog: vi.fn().mockResolvedValue(undefined),
  getWAChatLogs: vi.fn().mockResolvedValue([]),
  clearWAChatLogs: vi.fn().mockResolvedValue(undefined),
}));

describe("WhatsApp Bot Knowledge Engine", () => {
  it("harus menyusun system prompt yang mengandung katalog produk, rekening, dan SOP bisnis", async () => {
    const knowledge = await buildWhatsAppBotKnowledge();

    expect(knowledge.systemPrompt).toContain("Template Dashboard SaaS");
    expect(knowledge.systemPrompt).toContain("Rp 250.000");
    expect(knowledge.systemPrompt).toContain("1550013789089"); // No rekening Mandiri
    expect(knowledge.systemPrompt).toContain("5560605660"); // No rekening BNI
    expect(knowledge.systemPrompt).toContain("Sigit AI Assistant");
    expect(knowledge.rawSummary.productsCount).toBe(1);
    expect(knowledge.rawSummary.bankAccountsCount).toBe(2);
  });

  it("harus mendeteksi nomor invoice dan mengembalikan status pesanan pelanggan", async () => {
    const reply = await detectAndLookupInvoice("Halo kak, tolong cek pesanan saya INV-20261013-2820");

    expect(reply).not.toBeNull();
    expect(reply).toContain("STATUS PESANAN #INV-20261013-2820");
    expect(reply).toContain("Budi Santoso");
    expect(reply).toContain("Menunggu Pembayaran");
    expect(reply).toContain("Template Dashboard SaaS");
  });

  it("harus mengembalikan pesan informatif jika invoice tidak ditemukan di database", async () => {
    const reply = await detectAndLookupInvoice("Status faktur INV-99999999-0000");

    expect(reply).not.toBeNull();
    expect(reply).toContain("belum ditemukan di sistem kami");
  });

  it("harus menemukan jawaban langsung jika cocok dengan FAQ kustom admin", () => {
    const faqs = [
      {
        id: "1",
        question: "Berapa lama proses pembuatan website?",
        answer: "Pengerjaan website biasanya 3-7 hari kerja.",
        category: "jasa" as const,
        enabled: true,
        updatedAt: "2026",
      },
    ];

    const match = findDirectFAQMatch("proses pembuatan website berapa lama?", faqs);
    expect(match).toBe("Pengerjaan website biasanya 3-7 hari kerja.");
  });

  it("harus merespons via generateWhatsAppReply dengan sumber yang jelas", async () => {
    const res = await generateWhatsAppReply("Berapa lama pembuatan website?");

    expect(res).toBeDefined();
    expect(res.reply).toBeTruthy();
    expect(["faq", "cloud", "local"]).toContain(res.source);
  });
});
