/**
 * Test generate cover via Gemini image models.
 *
 * `fetch` di-mock sehingga tidak ada panggilan network maupun kuota AI yang
 * terpakai. Yang diuji: prompt (mutu cover), ekstraksi inlineData, urutan
 * fallback model, dan kontrak never-throw.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  IMAGE_MODEL_FALLBACKS,
  buildCoverImagePrompt,
  generateCoverImage,
  imageModelChain,
  pickInlineImage,
} from "@/lib/ai-image";

const KEY = "AIzaSyTestKey1234567890";

/** Bentuk respons Gemini yang memuat satu inline image. */
function geminiImageResponse(mime = "image/png", data = "aGVsbG8=") {
  return {
    candidates: [
      {
        content: {
          parts: [{ text: "ini gambar" }, { inlineData: { mimeType: mime, data } }],
        },
      },
    ],
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("buildCoverImagePrompt", () => {
  it("memakai judul, deskripsi, dan cuplikan isi", () => {
    const prompt = buildCoverImagePrompt({
      title: "Optimasi Gambar di Next.js",
      description: "Panduan praktis caching gambar.",
      body: "<p>Paragraf <strong>pertama</strong>.</p><p>Kedua.</p>",
      contentType: "article",
    });

    expect(prompt).toContain("Optimasi Gambar di Next.js");
    expect(prompt).toContain("Panduan praktis caching gambar.");
    // Tag HTML dibuang supaya prompt tidak berantakan. Tag diganti spasi,
    // jadi kata tetap terpisah rapi walau markup-nya Berinterensi.
    expect(prompt).toContain("Paragraf pertama");
    expect(prompt).not.toContain("</p>");
    expect(prompt).not.toContain("<strong>");
    expect(prompt).toContain("16:9");
  });

  it("melarang teks/logo/watermark — penyebab utama cover AI terlihat rusak", () => {
    const prompt = buildCoverImagePrompt({ title: "X", contentType: "article" });
    expect(prompt).toMatch(/Jangan menulis teks/i);
    expect(prompt).toMatch(/logo/i);
    expect(prompt).toMatch(/watermark/i);
  });

  it("memilih deskripsi visual sesuai tipe konten", () => {
    expect(buildCoverImagePrompt({ title: "A", contentType: "article" })).toContain("artikel blog");
    expect(buildCoverImagePrompt({ title: "A", contentType: "project" })).toContain("studi kasus");
    expect(buildCoverImagePrompt({ title: "A", contentType: "product" })).toContain("produk digital");
    // Tipe tak dikenal tidak boleh membuat prompt kosong/rusak.
    expect(buildCoverImagePrompt({ title: "A", contentType: "unknown" })).toContain("16:9");
  });

  it("tidak gagal saat judul kosong", () => {
    const prompt = buildCoverImagePrompt({ title: "   " });
    expect(prompt.length).toBeGreaterThan(50);
    expect(prompt).toContain("Konten portofolio");
  });

  it("memotong input sangat panjang agar prompt (dan biaya) tetap terkendali", () => {
    const prompt = buildCoverImagePrompt({
      title: "T".repeat(5000),
      body: "B".repeat(9000),
    });
    expect(prompt.length).toBeLessThan(8000);
  });
});

describe("pickInlineImage", () => {
  it("mengambil inlineData dari part mana pun", () => {
    const found = pickInlineImage(geminiImageResponse("image/webp", "QUJD"));
    expect(found).toEqual({ mime: "image/webp", data: "QUJD" });
  });

  it("null saat tidak ada gambar (mis. ditolak safety filter)", () => {
    expect(pickInlineImage({ candidates: [{ content: { parts: [{ text: "maaf" }] } }] })).toBeNull();
    expect(pickInlineImage({})).toBeNull();
    expect(pickInlineImage(null)).toBeNull();
  });

  it("mengecilkan part tanpa inlineData", () => {
    expect(
      pickInlineImage({ candidates: [{ content: { parts: [{ inlineData: { data: "" } }] } }] })
    ).toBeNull();
  });
});

describe("imageModelChain", () => {
  it("override env dipakai sendiri tanpa fallback tambahan", () => {
    expect(imageModelChain("gemini-3-pro-image")).toEqual(["gemini-3-pro-image"]);
    expect(imageModelChain("  ")).toEqual([...IMAGE_MODEL_FALLBACKS]);
    expect(imageModelChain(null)).toEqual([...IMAGE_MODEL_FALLBACKS]);
  });

  it("urutan fallback menaruh murah/cepat sebelum pro", () => {
    expect(IMAGE_MODEL_FALLBACKS[0]).toContain("flash-lite");
    expect(IMAGE_MODEL_FALLBACKS[IMAGE_MODEL_FALLBACKS.length - 1]).toContain("pro");
  });
});

describe("generateCoverImage", () => {
  it("menolak placeholder key tanpa menyentuh network", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const res = await generateCoverImage({ apiKey: "sk-ant-xxxx", prompt: "p" });
    expect(res.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("berhasil pada model pertama dan mengembalikan buffer", async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => ({
      ok: true,
      status: 200,
      json: async () => geminiImageResponse(),
      text: async () => "",
    }));
    vi.stubGlobal("fetch", fetchMock);

    const res = await generateCoverImage({ apiKey: KEY, prompt: "p" });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.image.mime).toBe("image/png");
      expect(res.image.buffer.toString("utf8")).toBe("hello");
      expect(res.image.model).toBe(IMAGE_MODEL_FALLBACKS[0]);
    }
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain(IMAGE_MODEL_FALLBACKS[0]);
    expect((init?.headers as Record<string, string>)["x-goog-api-key"]).toBe(KEY);
    expect(String(init?.body)).toContain("IMAGE");
  });

  it("jatuh ke model berikutnya saat yang pertama kena 429", async () => {
    const calls: string[] = [];
    const fetchMock = vi.fn(async (url: string) => {
      calls.push(url);
      if (calls.length === 1) {
        return { ok: false, status: 429, json: async () => ({}), text: async () => "quota habis" };
      }
      return {
        ok: true,
        status: 200,
        json: async () => geminiImageResponse(),
        text: async () => "",
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await generateCoverImage({ apiKey: KEY, prompt: "p" });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.image.model).toBe(IMAGE_MODEL_FALLBACKS[1]);
    expect(calls).toHaveLength(2);
  });

  it("gagal dengan pesan gabungan bila semua model habis", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 404,
        json: async () => ({}),
        text: async () => "model not found",
      }))
    );

    const res = await generateCoverImage({ apiKey: KEY, prompt: "p" });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toContain("semua model");
      expect(res.error).toContain("404");
    }
  });

  it("memberi pesan jelas saat provider tidak mengembalikan gambar", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ candidates: [{ content: { parts: [{ text: "ditolak" }] } }] }),
        text: async () => "",
      }))
    );

    const res = await generateCoverImage({ apiKey: KEY, prompt: "p", model: "gemini-test" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/tidak mengembalikan gambar/);
  });

  it("tidak pernah melempar error saat jaringan gagal", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNRESET");
      })
    );

    const res = await generateCoverImage({ apiKey: KEY, prompt: "p", model: "gemini-test" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain("ECONNRESET");
  });
});
describe("generateCoverImage — pesan saat kuota habis di semua model", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("menyertakan petunjuk kuota, bukan pesan teknis mentah", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 429,
        json: async () => ({}),
        text: async () => "quota exceeded",
      }))
    );

    const res = await generateCoverImage({ apiKey: KEY, prompt: "p" });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toMatch(/kuota Gemini habis/i);
      expect(res.error).toMatch(/cloud-ai/);
    }
  });
});
