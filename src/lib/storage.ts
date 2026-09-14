/**
 * Storage adapter gambar — server-only, jangan import dari client.
 *
 * Bunny Storage bila terkonfigurasi (BUNNY_STORAGE_ZONE_NAME + BUNNY_STORAGE_API_KEY),
 * fallback ke lokal `public/uploads` bila tidak. Validasi keamanan (whitelist MIME,
 * magic bytes, ekstensi dari MIME) TERPUSAT di sini agar konsisten di semua jalur.
 */

export const MAX_IMAGE_SIZE = 20 * 1024 * 1024;

export const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "image/bmp": "bmp",
};

export const ALLOWED_IMAGE_MIMES = Object.keys(EXTENSION_BY_MIME);

const STORAGE_PREFIX = "mywebporto/";

/** MIME dari klien mudah dipalsukan — verifikasi isi via magic bytes. */
export function matchesImageSignature(buffer: Buffer, mime: string): boolean {
  const ascii = (start: number, end: number) => buffer.subarray(start, end).toString("ascii");
  const startsWith = (...bytes: number[]) => bytes.every((byte, i) => buffer[i] === byte);

  switch (mime) {
    case "image/jpeg":
      return startsWith(0xff, 0xd8, 0xff);
    case "image/png":
      return startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
    case "image/gif":
      return ascii(0, 4) === "GIF8";
    case "image/webp":
      return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
    case "image/bmp":
      return startsWith(0x42, 0x4d);
    case "image/avif":
      return ascii(4, 8) === "ftyp" && /^(avif|avis|heic|heix|mif1|msf1)/.test(ascii(8, 12));
    default:
      return false;
  }
}

export interface ValidatedImage {
  buffer: Buffer;
  mime: string;
  extension: string;
}

/** Validasi File upload → buffer siap simpan, atau pesan error aman. Tidak pernah throw. */
export function validateImageFile(file: {
  type: string;
  size: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
}): Promise<{ ok: true; image: ValidatedImage } | { ok: false; error: string }> {
  return (async () => {
    if (!ALLOWED_IMAGE_MIMES.includes(file.type)) {
      return {
        ok: false as const,
        error: "Format file tidak didukung. Harap unggah gambar JPG, PNG, WEBP, GIF, AVIF, atau BMP.",
      };
    }
    if (file.size > MAX_IMAGE_SIZE) {
      return { ok: false as const, error: "Ukuran file terlalu besar. Maksimum ukuran adalah 20 MB." };
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!matchesImageSignature(buffer, file.type)) {
      return {
        ok: false as const,
        error: "Isi berkas tidak cocok dengan tipe gambarnya. Pastikan file benar-benar JPG, PNG, WEBP, GIF, AVIF, atau BMP.",
      };
    }
    return {
      ok: true as const,
      image: { buffer, mime: file.type, extension: EXTENSION_BY_MIME[file.type] },
    };
  })();
}

// ---------- Bunny Storage ----------

export interface BunnyConfig {
  zoneName: string;
  apiKey: string;
  storageHost: string;
  publicBaseUrl: string;
}

/** null bila Bunny belum dikonfigurasi → pemanggil wajib fallback lokal. */
export function getBunnyConfig(): BunnyConfig | null {
  const zoneName = (process.env.BUNNY_STORAGE_ZONE_NAME || "").trim();
  const apiKey = (process.env.BUNNY_STORAGE_API_KEY || "").trim();
  if (!zoneName || apiKey.length < 8) return null;

  const region = (process.env.BUNNY_STORAGE_REGION || "").trim().toLowerCase();
  const storageHost = region ? `${region}.storage.bunnycdn.com` : "storage.bunnycdn.com";

  const pullZone = (process.env.NEXT_PUBLIC_BUNNY_PULL_ZONE_URL || "").trim().replace(/\/$/, "");
  const cdnHost = (process.env.BUNNY_CDN_HOSTNAME || "").trim().replace(/\/$/, "");
  const publicBaseUrl = pullZone || (cdnHost ? `https://${cdnHost}` : `https://${zoneName}.b-cdn.net`);

  return { zoneName, apiKey, storageHost, publicBaseUrl };
}

export function isBunnyConfigured(): boolean {
  return getBunnyConfig() !== null;
}

/** Key aman:basename saja (cegah traversal), prefix folder, nama unik. */
export function buildStorageKey(originalName: string, extension: string): string {
  const base = (originalName.split("/").pop() || "image").split("\\").pop() || "image";
  const slug = base
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${STORAGE_PREFIX}${Date.now()}-${slug || "img"}-${rand}.${extension}`;
}

export interface MediaItem {
  key: string;
  name: string;
  url: string;
  size: number | null;
  lastChanged: string | null;
  remote: boolean;
}

export async function putBunny(
  key: string,
  buffer: Buffer,
  mime: string
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const cfg = getBunnyConfig();
  if (!cfg) return { ok: false, error: "Bunny Storage belum dikonfigurasi." };
  try {
    const res = await fetch(
      `https://${cfg.storageHost}/${cfg.zoneName}/${key}`,
      {
        method: "PUT",
        headers: { AccessKey: cfg.apiKey, "Content-Type": mime },
        body: new Uint8Array(buffer),
        signal: AbortSignal.timeout(30_000),
      }
    );
    if (!res.ok) return { ok: false, error: `Bunny menolak upload (status ${res.status}).` };
    return { ok: true, url: `${cfg.publicBaseUrl}/${key}` };
  } catch {
    return { ok: false, error: "Tidak dapat terhubung ke Bunny Storage." };
  }
}

export async function listBunny(): Promise<MediaItem[]> {
  const cfg = getBunnyConfig();
  if (!cfg) return [];
  try {
    const res = await fetch(
      `https://${cfg.storageHost}/${cfg.zoneName}/${STORAGE_PREFIX}?limit=100`,
      { headers: { AccessKey: cfg.apiKey }, signal: AbortSignal.timeout(15_000) }
    );
    if (!res.ok) return [];
    const arr = (await res.json()) as {
      ObjectName?: string;
      Length?: number;
      LastChanged?: string;
      IsDirectory?: boolean;
    }[];
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((o) => o && !o.IsDirectory && o.ObjectName)
      .map((o) => {
        const key = `${STORAGE_PREFIX}${o.ObjectName as string}`;
        return {
          key,
          name: o.ObjectName as string,
          url: `${cfg.publicBaseUrl}/${key}`,
          size: typeof o.Length === "number" ? o.Length : null,
          lastChanged: o.LastChanged || null,
          remote: true,
        };
      });
  } catch {
    return [];
  }
}

export async function deleteBunny(key: string): Promise<boolean> {
  const cfg = getBunnyConfig();
  if (!cfg) return false;
  const safe = key.split("/").pop() || "";
  if (!safe || safe.includes("..")) return false;
  try {
    const res = await fetch(`https://${cfg.storageHost}/${cfg.zoneName}/${STORAGE_PREFIX}${safe}`, {
      method: "DELETE",
      headers: { AccessKey: cfg.apiKey },
      signal: AbortSignal.timeout(15_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
