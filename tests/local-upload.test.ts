import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { uploadImageLocal } from "@/lib/local-upload";

const writableEnv = process.env as Record<string, string | undefined>;

const OLD = {
  VERCEL: writableEnv.VERCEL,
  ZONE: writableEnv.BUNNY_STORAGE_ZONE_NAME,
  KEY: writableEnv.BUNNY_STORAGE_API_KEY,
  PK: writableEnv.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
};

beforeEach(() => {
  // Lingkungan Vercel serverless: FS read-only + Bunny belum dikonfigurasi.
  writableEnv.VERCEL = "1";
  writableEnv.BUNNY_STORAGE_ZONE_NAME = "";
  writableEnv.BUNNY_STORAGE_API_KEY = "";
  // Placeholder key (mengandung marker "xxxx") → verifyAdmin mengizinkan tanpa session Clerk.
  writableEnv.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_xxxx";
});

afterEach(() => {
  writableEnv.VERCEL = OLD.VERCEL;
  writableEnv.BUNNY_STORAGE_ZONE_NAME = OLD.ZONE;
  writableEnv.BUNNY_STORAGE_API_KEY = OLD.KEY;
  writableEnv.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = OLD.PK;
});

function pngBuffer(): Buffer {
  // PNG magic bytes minimal yang lulus matchesImageSignature.
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01,
  ]);
}

function pngFile(): File {
  // Uint8Array view eksplisit — Buffer (ArrayBufferLike) tidak assignable ke BlobPart.
  return new File([new Uint8Array(pngBuffer())], "test.png", { type: "image/png" });
}

describe("uploadImageLocal — serverless guard", () => {
  it("menolak upload lokal di Vercel dengan pesan yang bisa ditindaklanjuti (bukan EROFS)", async () => {
    const fd = new FormData();
    fd.append("file", pngFile());

    const res = await uploadImageLocal(fd);

    expect(res.success).toBe(false);
    expect(res.error).toContain("serverless");
    // Pesan harus menyebut env yang harus diset, jadi admin tahu cara fix.
    expect(res.error).toContain("BUNNY_STORAGE_ZONE_NAME");
    expect(res.error).toContain("BUNNY_STORAGE_API_KEY");
  });

  it("tidak mencoba menulis ke filesystem di serverless", async () => {
    const fd = new FormData();
    fd.append("file", pngFile());

    // Seharusnya gagal cepat di guard — tidak memunculkan EROFS dari fs.writeFile.
    await expect(uploadImageLocal(fd)).resolves.toMatchObject({ success: false });
  });
});
