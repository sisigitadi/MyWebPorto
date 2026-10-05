import { describe, expect, it } from "vitest";
import { matchesImageSignature, sanitizeMediaName } from "@/lib/storage";

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);
const fake = Buffer.from("bukan-gambar-sama-sekali");

describe("matchesImageSignature", () => {
  it("menerima signature valid, menolak palsu", () => {
    expect(matchesImageSignature(png, "image/png")).toBe(true);
    expect(matchesImageSignature(jpeg, "image/jpeg")).toBe(true);
    expect(matchesImageSignature(fake, "image/png")).toBe(false);
    expect(matchesImageSignature(png, "image/jpeg")).toBe(false);
    expect(matchesImageSignature(png, "image/svg+xml")).toBe(false);
  });
});

describe("sanitizeMediaName", () => {
  it("mengambil basename saja — menetralkan traversal path", () => {
    expect(sanitizeMediaName("Foto Profil Saya.PNG")).toBe("Foto Profil Saya.PNG");
    expect(sanitizeMediaName("../../etc/passwd")).toBe("passwd");
    expect(sanitizeMediaName("C:\\Users\\admin\\foto.png")).toBe("foto.png");
    expect(sanitizeMediaName("/var/www/uploads/x.webp")).toBe("x.webp");
  });

  it("memotong nama yang ekstrem panjang", () => {
    const long = `${"a".repeat(500)}.png`;
    expect(sanitizeMediaName(long).length).toBe(180);
  });

  it("fallback ke nama generik bila input kosong/aneh", () => {
    expect(sanitizeMediaName("")).toBe("image");
    expect(sanitizeMediaName("///")).toBe("image");
    expect(sanitizeMediaName("\\\\")).toBe("image");
  });
});
