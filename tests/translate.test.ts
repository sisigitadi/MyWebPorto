import { describe, it, expect } from "vitest";
import {
  tokenizeTextForChunking,
  isTranslationErrorPayload,
  translateText,
  MAX_TRANSLATION_LENGTH,
  MAX_CHUNK_LENGTH,
} from "@/lib/translate";
import { ProductSchema, ArticleSchema, ProjectSchema, ServiceSchema } from "@/lib/validations";

describe("translate utility — chunking & error guard", () => {
  it("mengenali payload error dari MyMemory API", () => {
    expect(
      isTranslationErrorPayload("QUERY LENGTH LIMIT EXCEEDED. MAX ALLOWED QUERY : 500 CHARS")
    ).toBe(true);
    expect(
      isTranslationErrorPayload("MYMEMORY WARNING: YOU REACHED DAILY LIMIT")
    ).toBe(true);
    expect(isTranslationErrorPayload("INVALID TARGET LANGUAGE SPECIFIED")).toBe(true);
    expect(isTranslationErrorPayload("DAILY LIMIT EXCEEDED")).toBe(true);
    expect(isTranslationErrorPayload("This is a clean and valid translation.")).toBe(false);
    expect(isTranslationErrorPayload("")).toBe(false);
  });

  it("memecah teks pendek tanpa mengubah struktur", () => {
    const text = "Template portofolio berbasis Next.js 15.";
    const chunks = tokenizeTextForChunking(text, MAX_CHUNK_LENGTH);
    expect(chunks).toEqual([text]);
    expect(chunks.join("")).toBe(text);
  });

  it("memecah teks berparagraf dan mempertahankan struktur delimiternya secara persis", () => {
    const p1 = "Paragraf pertama menjelaskan fitur produk secara ringkas.";
    const p2 = "Paragraf kedua mengulas teknologi backend dan database.";
    const p3 = "Paragraf ketiga memberikan instruksi instalasi dan lisensi.";
    const fullText = `${p1}\n\n${p2}\n\n${p3}`;

    const chunks = tokenizeTextForChunking(fullText, 70);
    // Semua chunk tidak boleh melebihi batas maksimal (kecuali delimiter murni bila ada)
    for (const chunk of chunks) {
      if (chunk.trim()) {
        expect(chunk.length).toBeLessThanOrEqual(70);
      }
    }
    // Hasil penggabungan seluruh chunk wajib 100% identik dengan teks asli
    expect(chunks.join("")).toBe(fullText);
  });

  it("memecah teks panjang tanpa paragraf (kalimat panjang) menjadi chunk aman <= 400 karakter", () => {
    const longSentence = "Fitur sistem mencakup otentikasi multi-faktor yang sangat aman dan teruji. ".repeat(
      20
    );
    expect(longSentence.length).toBeGreaterThan(1000);

    const chunks = tokenizeTextForChunking(longSentence, MAX_CHUNK_LENGTH);
    for (const chunk of chunks) {
      if (chunk.trim()) {
        expect(chunk.length).toBeLessThanOrEqual(MAX_CHUNK_LENGTH);
      }
    }
    expect(chunks.join("")).toBe(longSentence);
  });

  it("menolak teks yang melebihi batas maksimal 50.000 karakter", async () => {
    const oversizedText = "a".repeat(MAX_TRANSLATION_LENGTH + 10);
    await expect(translateText(oversizedText)).rejects.toThrow(/terlalu panjang/i);
  });

  it("menerjemahkan deskripsi produk nyata (> 600 karakter) tanpa error MyMemory 500 chars", async () => {
    const desc = "Akses premium Google Gemini Pro selama 18 bulan penuh untuk mendongkrak produktivitas riset, coding, dan penulisan Anda tanpa batasan. Solusi cerdas bertenaga model AI tercanggih dengan efisiensi biaya maksimal.\n\nFitur & Benefit Utama:\n\nAkses Model Canggih: Dukungan penalaran tingkat tinggi, analisis kode, dan pemrosesan data teks kompleks.\n\nContext Window Luas: Mampu membaca, meringkas, dan mengolah dokumen panjang sekaligus.\n\nDurasi Panjang 18 Bulan: Lebih hemat dan praktis tanpa perlu repot langganan ulang setiap bulan.\n\nAktivasi Cepat & Panduan Lengkap: Siap digunakan langsung untuk kebutuhan profesional maupun belajar.";
    const translated = await translateText(desc, "id", "en");
    expect(isTranslationErrorPayload(translated)).toBe(false);
    expect(translated.length).toBeGreaterThan(100);
    expect(translated.toLowerCase()).toContain("gemini");
    expect(translated.toLowerCase()).toContain("month");
  }, 15000);
});

describe("kapasitas karakter schema — konsisten dengan redaksi konten (50.000)", () => {
  const dummy50kText = "A".repeat(50000);

  it("ProductSchema menerima deskripsi hingga 50.000 karakter", () => {
    const parsed = ProductSchema.safeParse({
      title: "Boilerplate SaaS",
      description: dummy50kText,
      descriptionEn: dummy50kText,
      imageUrl: "/images/product.png",
    });
    expect(parsed.success).toBe(true);
  });

  it("ArticleSchema dan ProductSchema memiliki plafon yang sama (50.000)", () => {
    const parsedArticle = ArticleSchema.safeParse({
      title: "Artikel Keamanan Web",
      slug: "artikel-keamanan-web",
      content: dummy50kText,
      contentEn: dummy50kText,
    });
    expect(parsedArticle.success).toBe(true);
  });

  it("ProjectSchema dan ServiceSchema juga menerima deskripsi hingga 50.000 karakter", () => {
    const parsedProject = ProjectSchema.safeParse({
      title: "Proyek Sistem SOC",
      slug: "proyek-sistem-soc",
      description: dummy50kText,
      descriptionEn: dummy50kText,
      imageUrl: "/images/soc.png",
    });
    expect(parsedProject.success).toBe(true);

    const parsedService = ServiceSchema.safeParse({
      title: "Jasa Konsultasi Cloud",
      description: dummy50kText,
      descriptionEn: dummy50kText,
    });
    expect(parsedService.success).toBe(true);
  });
});

describe("translateBatchAction — pemrosesan batch dwibahasa", () => {
  it("menangani array kosong dengan aman", async () => {
    const { translateBatchAction } = await import("@/lib/actions");
    const res = await translateBatchAction([]);
    expect(res.success).toBe(true);
    expect(res.results).toEqual([]);
  });

  it("menerjemahkan batch teks pendek dan mengembalikan jumlah hasil sepadan", async () => {
    const { translateBatchAction } = await import("@/lib/actions");
    const inputs = ["Frontend Engineer", "Arsitektur Sistem", ""];
    const res = await translateBatchAction(inputs);
    expect(res.success).toBe(true);
    expect(Array.isArray(res.results)).toBe(true);
    expect(res.results.length).toBe(inputs.length);
    expect(res.results[2]).toBe("");
  });
});
