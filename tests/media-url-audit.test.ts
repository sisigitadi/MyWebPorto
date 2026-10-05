/**
 * Gate URL gambar tersimpan — `npm run check:media`.
 *
 * Unit test (offline, selalu jalan) mengunci klasifikasi setiap jenis
 * referensi rusak. Blok live menjalankan `auditStoredImageUrls()` terhadap
 * database dan GAGAL bila ada URL gambar yang tidak akan ada di produksi —
 * itulah yang menangkap regresi `/uploads/…` (file .gitignore) sebelum deploy.
 *
 * Import dinamis (setelah dotenv) penting: `@/db` membaca DATABASE_URL saat
 * modul diinisialisasi, jadi env harus terisi lebih dulu — sama seperti
 * `next dev` yang memuat .env.local sebelum app.
 */
import { beforeAll, describe, expect, it } from "vitest";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

type AuditModule = typeof import("@/lib/media-url-audit");

let audit: AuditModule;

const LIVE_UUID = "97d87474-b119-4f87-b2fe-ccbeaa2b5a35";
const LIVE_UUID_2 = "0b15a13f-7953-49ec-b55e-9c95bf9d6767";
const MISSING_UUID = "11111111-2222-3333-4444-555555555555";
const known = new Set([LIVE_UUID, LIVE_UUID_2]);

beforeAll(async () => {
  audit = await import("@/lib/media-url-audit");
});

const classify = (url: string | null | undefined, ids?: ReadonlySet<string> | null) =>
  audit.classifyStoredImageUrl(url, ids === undefined ? {} : { knownMediaIds: ids });

describe("isImageFieldName — kolom mana yang boleh jadi target audit", () => {
  it("menangkap nama field gambar dalam berbagai ejaan", () => {
    for (const name of [
      "avatar_url",
      "image_url",
      "coverImage",
      "ogImageUrl",
      "gallery",
      "thumbnail",
      "hero_banner",
      "favicon",
    ]) {
      expect(audit.isImageFieldName(name), name).toBe(true);
    }
  });

  it("menolak kolom non-gambar supaya tidak ada false positive", () => {
    for (const name of ["description", "title", "slug", "tags", "tech_stacks", "key"]) {
      expect(audit.isImageFieldName(name), name).toBe(false);
    }
  });
});

describe("looksLikeImageRef — gate kedua (nilai harus menyerupai URL gambar)", () => {
  it("menerima path media, legacy upload, URL absolut, dan data URL", () => {
    expect(audit.looksLikeImageRef(`/api/media/${LIVE_UUID}`)).toBe(true);
    expect(audit.looksLikeImageRef("/uploads/1791098437470-5b89105b.png")).toBe(true);
    expect(audit.looksLikeImageRef("https://images.unsplash.com/photo-1.jpg?w=800")).toBe(true);
    expect(audit.looksLikeImageRef("data:image/png;base64,iVBORw0KGgo=")).toBe(true);
  });

  it("menolak teks biasa dan URL tanpa ekstensi gambar", () => {
    expect(audit.looksLikeImageRef("Halo dunia")).toBe(false);
    expect(audit.looksLikeImageRef("https://translate.googleapis.com")).toBe(false);
    expect(audit.looksLikeImageRef("")).toBe(false);
  });
});

describe("classifyStoredImageUrl — URL yang tidak akan ada di produksi", () => {
  it("kosong", () => {
    expect(classify("")).toBe("empty");
    expect(classify("   ")).toBe("empty");
    expect(classify(null)).toBe("empty");
  });

  it("path /uploads/legacy — file .gitignore, inilah bug yang nyata", () => {
    expect(classify("/uploads/1791098437470-5b89105b.png")).toBe("legacy-uploads-path");
    expect(classify("https://sigitadi.id/uploads/1791098437470-5b89105b.png")).toBe(
      "legacy-uploads-path"
    );
  });

  it("id media bukan UUID akan 404 di route /api/media/[id]", () => {
    expect(classify("/api/media/bukan-uuid")).toBe("malformed-media-path");
    expect(classify("/api/media/")).toBe("malformed-media-path");
  });

  it("id media yang tidak ada di tabel media", () => {
    expect(classify(`/api/media/${LIVE_UUID}`, known)).toBeNull();
    expect(classify(`/api/media/${MISSING_UUID}`, known)).toBe("missing-media-row");
    // Tanpa daftar id, pemeriksaan dilewati — lebih baik diam daripada melapor salah.
    expect(classify(`/api/media/${MISSING_UUID}`, null)).toBeNull();
  });

  it("URL absolut: host lokal dan http:// ditolak, https host luar dianggap aman", () => {
    expect(classify(`http://localhost:3000/api/media/${LIVE_UUID}`, known)).toBe("local-host-url");
    expect(classify(`http://192.168.1.5/foto.png`)).toBe("local-host-url");
    expect(classify("http://10.0.0.8/foto.png")).toBe("local-host-url");
    expect(classify("http://box-percompany.local/foto.png")).toBe("local-host-url");
    expect(classify(`http://sigitadi.id/api/media/${LIVE_UUID}`, known)).toBe("insecure-url");
    expect(classify(`https://sigitadi.id/api/media/${LIVE_UUID}`, known)).toBeNull();
    expect(classify("https://images.unsplash.com/photo-1.jpg")).toBeNull();
  });

  it("path relatif lain dan skema asing tidak bisa dilayani Next.js", () => {
    expect(classify("/gambar/cover.png")).toBe("unservable-path");
    expect(classify("uploads/cover.png")).toBe("unservable-path");
    expect(classify("//sigitadi.id/cover.png")).toBe("unservable-path");
    expect(classify("javascript:alert(1)")).toBe("unservable-path");
  });

  it("data URL bersifat mandiri — tidak butuh file di server", () => {
    expect(classify("data:image/png;base64,iVBORw0KGgo=")).toBeNull();
  });

  it("Setiap jenis masalah punya penjelasan yang bisa ditindaklanjuti", () => {
    const kinds = [
      "empty",
      "legacy-uploads-path",
      "malformed-media-path",
      "missing-media-row",
      "local-host-url",
      "insecure-url",
      "unservable-path",
    ] as const;
    for (const kind of kinds) {
      expect(audit.describeMediaUrlIssue(kind).length).toBeGreaterThan(10);
    }
  });
});

describe("extractImageRefs — menambang referensi dari nilai kolom", () => {
  it("kolom skalar: satu referensi", () => {
    const refs = audit.extractImageRefs(`/api/media/${LIVE_UUID}`, { field: "image_url", row: "a1" });
    expect(refs).toEqual([{ field: "image_url", row: "a1", url: `/api/media/${LIVE_UUID}` }]);
  });

  it("kolom skalar: teks biasa bukan referensi gambar", () => {
    expect(audit.extractImageRefs("Dicek di localhost", { field: "description", row: "a1" })).toEqual([]);
  });

  it("JSON settings: hanya key bergambar yang diambil", () => {
    const value = {
      ogTitle: "Judul situs",
      ogImageUrl: "/uploads/legacy.png",
      nested: { coverImage: `/api/media/${LIVE_UUID_2}`, catatan: "bukan gambar" },
    };
    const refs = audit.extractImageRefs(value, { field: "value", row: "seo" });
    expect(refs).toEqual([
      { field: "value.ogImageUrl", row: "seo", url: "/uploads/legacy.png" },
      { field: "value.nested.coverImage", row: "seo", url: `/api/media/${LIVE_UUID_2}` },
    ]);
  });

  it("kolom bernama gambar (gallery) mengambil seluruh array URL", () => {
    const refs = audit.extractImageRefs([`/api/media/${LIVE_UUID}`, "catatan biasa"], {
      field: "gallery",
      row: "p1",
    });
    expect(refs).toEqual([{ field: "gallery", row: "p1", url: `/api/media/${LIVE_UUID}` }]);
  });

  it("JSON tanpa key gambar diabaikan walau isinya punya .png", () => {
    const refs = audit.extractImageRefs({ deskripsi: "lihat /uploads/x.png" }, {
      field: "value",
      row: "x",
    });
    expect(refs).toEqual([]);
  });

  it("berhenti pada kedalaman yang tidak wajar (anti struktur tak berujung)", () => {
    let deep: unknown = "/uploads/x.png";
    for (let i = 0; i < 12; i += 1) deep = { img: deep };
    expect(audit.extractImageRefs(deep, { field: "value", row: "deep" })).toEqual([]);
  });
});

// Gate sesungguhnya: butuh DATABASE_URL. CI sengaja berjalan tanpa DB
// (lihat .github/workflows/ci.yml) → blok ini di-skip di sana, bukan di-fail.
describe.skipIf(!process.env.DATABASE_URL || process.env.DATABASE_URL.length <= 5)(
  "auditStoredImageUrls — gate database live",
  () => {
    it("menemu kolom gambar dan tidak menemukan referensi rusak", async () => {
      const result = await audit.auditStoredImageUrls();

      expect(result.checked).toBe(true);
      expect(result.scannedColumns).toBeGreaterThan(0);
      expect(result.truncatedColumns).toEqual([]);

      const report = result.findings
        .map((f) => `  ${f.field} [${f.row}] ${f.url}\n    → ${f.kind}: ${f.detail}`)
        .join("\n");
      expect(
        result.findings,
        `URL gambar tersimpan tidak akan ada di produksi:\n${report || "  (tidak ada)"}`
      ).toEqual([]);
    });
  }
);