/**
 * Generator prompt cover gambar — CLIENT & SERVER SAFE.
 *
 * Menghasilkan prompt teks terstandarisasi untuk model AI visual (Gemini, DALL-E,
 * Midjourney, atau chat browser gemini.google.com).
 * Menegakkan rasio 16:9, larangan teks/watermark pseudografis, dan estetika
 * editorial konsisten untuk cover artikel, proyek, maupun produk.
 */

export interface CoverPromptInput {
  title: string;
  description?: string | null;
  /** Cuplikan isi konten — sumber utama untuk menentukan visual. */
  body?: string | null;
  /** "artikel" | "proyek" | "produk" (atau "article" | "project" | "product"). */
  contentType?: string | null;
}

/**
 * Prompt cover 16:9 siap pakai untuk Gemini / AI image generator.
 */
export function buildCoverImagePrompt(input: CoverPromptInput): string {
  const title = (input.title || "").trim() || "Konten portofolio";
  const description = (input.description || "").trim().slice(0, 400);
  const body = (input.body || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1200);
  const kind = (input.contentType || "artikel").toLowerCase();

  const roleByKind: Record<string, string> = {
    article: "sampul artikel blog",
    artikel: "sampul artikel blog",
    project: "cover portofolio untuk studi kasus proyek",
    proyek: "cover portofolio untuk studi kasus proyek",
    product: "cover produk digital yang dijual",
    produk: "cover produk digital yang dijual",
  };

  return [
    `Buat gambar ${roleByKind[kind] || roleByKind.article} dengan rasio 16:9.`,
    "",
    `Judul: ${title}`,
    description ? `Deskripsi: ${description}` : "",
    body ? `Isi (cuplikan): ${body}` : "",
    "",
    "GAYA: ilustrasi digital modern dan editorial; warna bold dan kontras;",
    "bentuk geometris bersih; pencahayaan sinematik lembut; komposisi bernapas.",
    "",
    "LARANGAN (penting):",
    "- Jangan menulis teks, huruf, angka, atau watermark apa pun di dalam gambar.",
    "- Jangan menampilkan logo, brand dagang, atau wajah orang yang kenali.",
    "- Jangan menambahkan border atau frame.",
    "",
    "Objek utama di tengah, sisanya ruang kosong sederhana agar judul konten",
    "bisa ditambahkan oleh situs tanpa menutupi elemen penting.",
  ]
    .filter((line) => line !== "")
    .join("\n");
}
