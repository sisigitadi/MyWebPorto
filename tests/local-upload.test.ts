import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { uploadImageLocal, listMedia, deleteMedia } from "@/lib/local-upload";
import { putMedia, listMediaItems, deleteMediaRow } from "@/lib/storage";

// Mock layer storage: validasi (validateImageFile) tetap asli, hanya operasi
// DB yang di-mock supaya test tidak butuh koneksi Neon.
vi.mock("@/lib/storage", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/storage")>();
  return {
    ...actual,
    putMedia: vi.fn(),
    listMediaItems: vi.fn(),
    deleteMediaRow: vi.fn(),
  };
});

// revalidatePath di luar konteks request Next melempar invariant — mock noop.
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const writableEnv = process.env as Record<string, string | undefined>;

const OLD = {
  PK: writableEnv.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
};

beforeEach(() => {
  // Placeholder key (mengandung marker "xxxx") → verifyAdmin mengizinkan tanpa session Clerk.
  writableEnv.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_xxxx";
  vi.mocked(putMedia).mockReset();
  vi.mocked(listMediaItems).mockReset();
  vi.mocked(deleteMediaRow).mockReset();
});

afterEach(() => {
  writableEnv.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = OLD.PK;
});

function pngMagic(): Buffer {
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01,
  ]);
}

function pngFile(): File {
  // Uint8Array view eksplisit — Buffer (ArrayBufferLike) tidak assignable ke BlobPart.
  return new File([new Uint8Array(pngMagic())], "test.png", { type: "image/png" });
}

describe("uploadImageLocal — storage database", () => {
  it("menyimpan gambar valid ke DB dan mengembalikan URL /api/media/<id>", async () => {
    vi.mocked(putMedia).mockResolvedValue({ ok: true, id: "test-uuid" });
    const fd = new FormData();
    fd.append("file", pngFile());

    const res = await uploadImageLocal(fd);

    expect(res.success).toBe(true);
    expect(res.url).toBe("/api/media/test-uuid");
    expect(putMedia).toHaveBeenCalledOnce();

    const [name, buffer, mime] = vi.mocked(putMedia).mock.calls[0];
    expect(name).toBe("test.png");
    expect(mime).toBe("image/png");
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.subarray(0, 8).equals(pngMagic().subarray(0, 8))).toBe(true);
  });

  it("menolak file bukan gambar sebelum menyentuh DB", async () => {
    const fd = new FormData();
    fd.append("file", new File([new Uint8Array(Buffer.from("bukan-gambar"))], "a.txt", { type: "text/plain" }));

    const res = await uploadImageLocal(fd);

    expect(res.success).toBe(false);
    expect(res.error).toContain("Format file tidak didukung");
    expect(putMedia).not.toHaveBeenCalled();
  });

  it("melaporkan kegagalan simpan DB secara eksplisit", async () => {
    vi.mocked(putMedia).mockResolvedValue({
      ok: false,
      error: "Gagal menyimpan gambar ke database. Coba lagi.",
    });
    const fd = new FormData();
    fd.append("file", pngFile());

    const res = await uploadImageLocal(fd);

    expect(res.success).toBe(false);
    expect(res.error).toContain("database");
  });
});

describe("listMedia", () => {
  it("mengembalikan item dari DB dengan URL /api/media/<id>", async () => {
    const createdAt = new Date().toISOString();
    vi.mocked(listMediaItems).mockResolvedValue([
      { id: "abc", name: "a.png", url: "/api/media/abc", mime: "image/png", size: 123, createdAt },
    ]);

    const res = await listMedia();

    expect(res.items).toHaveLength(1);
    expect(res.items[0].url).toBe("/api/media/abc");
  });
});

describe("deleteMedia", () => {
  it("menghapus baris di DB berdasarkan id", async () => {
    vi.mocked(deleteMediaRow).mockResolvedValue(true);

    const res = await deleteMedia("abc");

    expect(res.success).toBe(true);
    expect(deleteMediaRow).toHaveBeenCalledWith("abc");
  });

  it("gagal hapus dilaporkan, bukan diam-diam sukses", async () => {
    vi.mocked(deleteMediaRow).mockResolvedValue(false);

    const res = await deleteMedia("abc");

    expect(res.success).toBe(false);
    expect(res.error).toContain("database");
  });
});
