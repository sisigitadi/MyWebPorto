import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import path from "path";
import { detectImageMime, resolveOgImageSrc } from "@/lib/og-image";

/**
 * resolveOgImageSrc adalah jembatan avatar → gambar OG. Tiga bentuk referensi
 * diuji (media di DB, legacy /uploads, URL absolut) plus jalur keamanan:
 * traversal path, format yang ditolak satori, dan referensi tak dikenal.
 *
 * fs & fetch di-mock agar test tidak menyentuh disk/network/DB sungguhan.
 */

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);
const GIF = Buffer.from("R0lGODlhAQABAIAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(16)]);
const BMP = Buffer.concat([Buffer.from([0x42, 0x4d]), Buffer.alloc(70)]);
const NOT_IMAGE = Buffer.from("bukan-gambar");

const UUID = "97d87474-b119-4f87-b2fe-ccbeaa2b5a35";
const mediaUrl = `/api/media/${UUID}`;

const getMediaMock = vi.fn();
const readFileMock = vi.fn();
const fetchMock = vi.fn();

vi.mock("@/lib/storage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/storage")>();
  return {
    ...actual,
    getMedia: (...args: unknown[]) => getMediaMock(...args),
  };
});

vi.mock("fs/promises", () => ({
  readFile: (...args: unknown[]) => readFileMock(...args),
}));

beforeEach(() => {
  getMediaMock.mockReset();
  readFileMock.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("detectImageMime", () => {
  it("mendeteksi dari magic bytes, bukan tebakan", () => {
    expect(detectImageMime(PNG)).toBe("image/png");
    expect(detectImageMime(GIF)).toBe("image/gif");
    expect(detectImageMime(JPEG)).toBe("image/jpeg");
    expect(detectImageMime(BMP)).toBe("image/bmp");
    expect(detectImageMime(NOT_IMAGE)).toBeNull();
  });
});

describe("resolveOgImageSrc — jalur /api/media/<uuid>", () => {
  it("mengembalikan data URL dari bytea DB", async () => {
    getMediaMock.mockResolvedValue({ buffer: PNG, mime: "image/png" });
    const out = await resolveOgImageSrc(mediaUrl);
    expect(getMediaMock).toHaveBeenCalledWith(UUID);
    expect(out).not.toBeNull();
    expect(out!.mime).toBe("image/png");
    expect(out!.src.startsWith("data:image/png;base64,")).toBe(true);
    expect(Buffer.from(out!.src.split(",")[1], "base64").equals(PNG)).toBe(true);
  });

  it("id tidak ada di DB → null (bukan throw)", async () => {
    getMediaMock.mockResolvedValue(null);
    expect(await resolveOgImageSrc(mediaUrl)).toBeNull();
  });

  it("id bukan UUID valid → tidak query DB, null", async () => {
    const out = await resolveOgImageSrc("/api/media/not-a-uuid");
    expect(out).toBeNull();
    expect(getMediaMock).not.toHaveBeenCalled();
  });

  it("buffer DB bukan gambar → null (jatuh ke monogram, bukan 500)", async () => {
    getMediaMock.mockResolvedValue({ buffer: NOT_IMAGE, mime: "image/png" });
    expect(await resolveOgImageSrc(mediaUrl)).toBeNull();
  });

  it("format ditolak satori (BMP) → null, mencegah route 500", async () => {
    getMediaMock.mockResolvedValue({ buffer: BMP, mime: "image/bmp" });
    expect(await resolveOgImageSrc(mediaUrl)).toBeNull();
  });
});

describe("resolveOgImageSrc — jalur legacy /uploads/", () => {
  it("membaca file dari public/ dan mengubah ke data URL", async () => {
    readFileMock.mockResolvedValue(PNG);
    const out = await resolveOgImageSrc("/uploads/avatar.png");
    expect(out).not.toBeNull();
    expect(out!.mime).toBe("image/png");
    expect(String(readFileMock.mock.calls[0][0])).toBe(
      path.join(process.cwd(), "public", "uploads", "avatar.png")
    );
  });

  it("file tidak ada (mis. tidak ter-deploy) → null, bukan throw", async () => {
    readFileMock.mockRejectedValue(new Error("ENOENT"));
    expect(await resolveOgImageSrc("/uploads/hilang.png")).toBeNull();
  });

  it("menolak path traversal keluar dari public/", async () => {
    const out = await resolveOgImageSrc("/uploads/../../package.json");
    expect(out).toBeNull();
    expect(readFileMock).not.toHaveBeenCalled();
  });
});

describe("resolveOgImageSrc — URL absolut", () => {
  it("fetch remote lalu validasi magic bytes", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => PNG.buffer.slice(PNG.byteOffset, PNG.byteOffset + PNG.byteLength),
    });
    const out = await resolveOgImageSrc("https://cdn.example.com/avatar.png");
    expect(fetchMock).toHaveBeenCalledWith("https://cdn.example.com/avatar.png");
    expect(out!.mime).toBe("image/png");
  });

  it("fetch gagal (non-2xx) → null", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404 });
    expect(await resolveOgImageSrc("https://cdn.example.com/x.png")).toBeNull();
  });

  it("fetch error jaringan → null, bukan throw", async () => {
    fetchMock.mockRejectedValue(new Error("ENOTFOUND"));
    expect(await resolveOgImageSrc("https://cdn.example.com/x.png")).toBeNull();
  });
});

describe("resolveOgImageSrc — input kosong/tak dikenal", () => {
  it("null / undefined / string kosong → null", async () => {
    expect(await resolveOgImageSrc(null)).toBeNull();
    expect(await resolveOgImageSrc(undefined)).toBeNull();
    expect(await resolveOgImageSrc("")).toBeNull();
    expect(await resolveOgImageSrc("   ")).toBeNull();
  });

  it("bentuk tak dikenal (javascript:, data:) → null", async () => {
    expect(await resolveOgImageSrc("javascript:alert(1)")).toBeNull();
    expect(await resolveOgImageSrc("data:image/png;base64,AAAA")).toBeNull();
    expect(await resolveOgImageSrc("/api/media/../../etc/passwd")).toBeNull();
  });
});
