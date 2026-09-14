import { describe, expect, it } from "vitest";
import { buildStorageKey, matchesImageSignature } from "@/lib/storage";

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

describe("buildStorageKey", () => {
  it("membuat key unik ber-prefix dengan ekstensi benar", () => {
    const a = buildStorageKey("Foto Profil Saya.PNG", "png");
    const b = buildStorageKey("Foto Profil Saya.PNG", "png");
    expect(a.startsWith("mywebporto/")).toBe(true);
    expect(a.endsWith(".png")).toBe(true);
    expect(a).not.toBe(b);
    expect(a).not.toContain(" ");
  });

  it("menetralkan traversal path", () => {
    const key = buildStorageKey("../../etc/passwd", "png");
    const filename = key.replace(/^mywebporto\//, "");
    expect(key.startsWith("mywebporto/")).toBe(true);
    expect(filename).not.toContain("..");
    expect(filename).not.toContain("/");
    expect(filename).not.toContain("\\");
  });
});
