/**
 * Audit URL gambar tersimpan — SERVER-ONLY, jangan import dari client.
 *
 * Masalah yang dicek: **referensi gambar di database yang tidak akan ada di
 * produksi**. Kasus nyata yang sudah menimpa repo ini: `public/uploads/` masuk
 * `.gitignore`, jadi `profiles.avatar_url` dan dua `articles.image_url` yang
 * menunjuk `/uploads/<file>` hanya resolve di mesin lokal — di Vercel semuanya
 * 404 (avatar hero, cover artikel, `og:image`, JSON-LD). Bug-nya senyap: lokal
 * selalu hijau, dan baru terasa setelah deploy.
 *
 * Audit ini mengubahnya jadi **gated**: `npm run check:media` (lihat
 * package.json) menjalankan test yang memanggil `auditStoredImageUrls()` dan
 * GAGAL bila ada temuan, sehingga reference rusak tertangkap sebelum deploy —
 * bukan sesudah. `/admin/system` menampilkan hasil yang sama.
 *
 * Dua lapis filter supaya tabel non-gambar tidak menghasilkan false positive:
 * 1. Kolom skalar (text/varchar) hanya diperiksa bila NAMANYA bergambar
 *    (`isImageFieldName`) — mis. `avatar_url`, `image_url`, `cover_image`.
 * 2. Kolom JSON hanya diambil bila key-nya (atau nama kolomnya, mis.
 *    `gallery`) bergambar. String lain di JSON yang kebetulan berisi `.png`
 *    diabaikan — bukan field gambar.
 *
 * Tabel historis (`settings_history`, `audit_logs`) sengaja dilewati: isinya
 * catatan masa lalu (snapshot sebelum/sesudah perubahan admin), bukan
 * konfigurasi yang disajikan ke pengunjung. Menandainya "rusak" tidak bisa
 * diperbaiki tanpa menghapus riwayat.
 */

import { sql } from "drizzle-orm";
import { db, isDbConnected } from "@/db";
import { isMediaId } from "@/lib/storage";

/**
 * Nama kolom/key yang dianggap menyimpan URL gambar. Sengaja longgar
 * (image|avatar|cover|…) agar kolom baru bermacronym gambar ikut tertangkap;
 * lapis kedua (nilai harus menyerupai URL gambar) yang menjaga presisi.
 */
export const IMAGE_FIELD_NAME_RE =
  /(image|img|avatar|cover|photo|thumb|picture|logo|banner|hero|favicon|portrait|gallery|media|icon)/i;

export function isImageFieldName(name: string): boolean {
  return IMAGE_FIELD_NAME_RE.test(name);
}

/** Ekstensi yang bisa dilayani sebagai aset gambar. */
const IMAGE_EXT_RE = /\.(?:png|jpe?g|webp|gif|avif|bmp|svg|ico)(?:$|[?#\s"'`)\]])/i;

const MEDIA_URL_PREFIX = "/api/media/";

/**
 * Apakah nilai string ini benar-benar reference gambar? Gate kedua setelah
 * nama field — mencegah bio/deskripsi yang kebetulan memuat kata-kata seperti
 * "logo.png" ikut diperiksa sebagai URL aset.
 */
export function looksLikeImageRef(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (/^data:image\//i.test(v)) return true;
  if (v.startsWith(MEDIA_URL_PREFIX) || v.startsWith("/uploads/")) return true;
  return IMAGE_EXT_RE.test(v);
}

export type MediaUrlIssueKind =
  | "empty"
  | "legacy-uploads-path"
  | "malformed-media-path"
  | "missing-media-row"
  | "local-host-url"
  | "insecure-url"
  | "unservable-path";

const ISSUE_LABELS: Record<MediaUrlIssueKind, string> = {
  empty: "kosong — kolom gambar wajib diisi",
  "legacy-uploads-path":
    "path /uploads/ — file berada di public/uploads yang .gitignore, TIDAK ikut ter-deploy",
  "malformed-media-path": "id media bukan UUID — route /api/media/[id] akan 404",
  "missing-media-row": "id media tidak ada di tabel media — request 404",
  "local-host-url": "host localhost/privat — tidak bisa diakses pengunjung",
  "insecure-url": "URL http:// — mixed content, harus https",
  "unservable-path": "path relatif yang tidak dilayani Next.js (butuh /api/media/<id>)",
};

export function describeMediaUrlIssue(kind: MediaUrlIssueKind): string {
  return ISSUE_LABELS[kind];
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"]);

/** LAN/IP privat — data yang menunjuk ke sini tidak akan erreachable pengunjung. */
function isPrivateIpv4(host: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (a === 0 || a === 10 || a === 127) return true; // 0/8, 10/8, loopback
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16/12
  if (a === 192 && b === 168) return true; // 192.168/16
  if (a === 169 && b === 254) return true; // link-local
  return false;
}

function isLocalHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (LOCAL_HOSTS.has(h) || isPrivateIpv4(h)) return true;
  return [".localhost", ".local", ".internal", ".home.arpa"].some((suffix) => h.endsWith(suffix));
}

export interface MediaUrlContext {
  /** Id yang benar-benar ada di tabel `media`. Null = jangan dicek (unknown). */
  knownMediaIds?: ReadonlySet<string> | null;
}

/**
 * Klasifikasikan satu URL gambar tersimpan. Mengembalikan null bila aman
 * (akan resolve di produksi), atau jenis masalah bila tidak.
 *
 * Murni (tanpa I/O) supaya bisa diuji penuh tanpa database.
 */
export function classifyStoredImageUrl(
  url: string | null | undefined,
  ctx: MediaUrlContext = {}
): MediaUrlIssueKind | null {
  const raw = (url ?? "").trim();
  if (!raw) return "empty";
  // data: image mandiri — tidak butuh file di server sama sekali.
  if (/^data:image\//i.test(raw)) return null;

  let pathname = raw;
  let remote: URL | null = null;
  if (/^https?:\/\//i.test(raw)) {
    try {
      remote = new URL(raw);
    } catch {
      return "unservable-path";
    }
    pathname = remote.pathname;
  } else if (/^[a-z][a-z0-9+.-]*:/i.test(raw) || raw.startsWith("//")) {
    // Skema asing (javascript:, ftp:, …) atau protocol-relative `//host/…`
    // yang ambigu untuk <img src> — tidak bisa dilayani sebagai gambar.
    return "unservable-path";
  }

  if (pathname.startsWith(MEDIA_URL_PREFIX)) {
    const id = pathname.slice(MEDIA_URL_PREFIX.length);
    if (!isMediaId(id)) return "malformed-media-path";
    if (remote && isLocalHostname(remote.hostname)) return "local-host-url";
    if (remote && remote.protocol !== "https:") return "insecure-url";
    const known = ctx.knownMediaIds;
    // Tanpa daftar id (mis. dipanggil tanpa DB) pemeriksaan dilewati —
    // lebih baik tidak melapor daripada melapor salah.
    if (known && !known.has(id.toLowerCase())) return "missing-media-row";
    return null;
  }

  if (pathname.startsWith("/uploads/")) return "legacy-uploads-path";

  if (remote) {
    if (isLocalHostname(remote.hostname)) return "local-host-url";
    if (remote.protocol !== "https:") return "insecure-url";
    // Host eksternal https: tidak bisa diverifikasi tanpa network call.
    return null;
  }

  // Path relatif lain ("/gambar/x.png", "uploads/x.png") — Next hanya
  // melayani file yang benar-benar ada di public/, sehingga 404 di produksi.
  return "unservable-path";
}

export interface StoredImageRef {
  /** Lokasi logis, mis. `settings.value.ogImageUrl`. */
  field: string;
  /** Kunci baris (primary key) bila tabel punya, agar temuan mudah ditelusuri. */
  row: string;
  url: string;
}

const MAX_DEPTH = 6;

/**
 * Ambil semua referensi gambar dari satu nilai kolom (string skalar atau
 * JSON/JSONB yang sudah ter-parse driver). Kunci JSON ikut jadi bagian
 * `field` agar temuan bisa langsung ditelusuri di admin.
 */
export function extractImageRefs(
  value: unknown,
  base: { field: string; row: string },
  depth = 0
): StoredImageRef[] {
  if (depth > MAX_DEPTH) return [];
  if (typeof value === "string") {
    const url = value.trim();
    return url && looksLikeImageRef(url) ? [{ ...base, url }] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => extractImageRefs(item, base, depth + 1));
  }
  if (value && typeof value === "object") {
    const out: StoredImageRef[] = [];
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      const childBase = { field: `${base.field}.${key}`, row: base.row };
      // Key bergambar (atau kolom bernama gambar, mis. array `gallery`)
      // → ambil isinya apa pun bentuknya.
      if (isImageFieldName(key) || isImageFieldName(base.field)) {
        out.push(...extractImageRefs(child, childBase, depth + 1));
        continue;
      }
      // Key netral: hanya turuni ke object — string di dalamnya (mis. artikel
      // yang menyebut "/uploads/x.png" di dalam deskripsi) bukan field gambar.
      if (child && typeof child === "object") {
        out.push(...extractImageRefs(child, childBase, depth + 1));
      }
    }
    return out;
  }
  return [];
}

export interface MediaUrlAuditFinding {
  field: string;
  row: string;
  url: string;
  kind: MediaUrlIssueKind;
  detail: string;
}

export interface MediaUrlAuditResult {
  /** False bila DB tidak dikonfigurasi — audit tidak bisa dijalankan. */
  checked: boolean;
  scannedColumns: number;
  scannedValues: number;
  /** Kolom yang melebihi batas sample — perlu diperiksa manual. */
  truncatedColumns: string[];
  findings: MediaUrlAuditFinding[];
}

/** Tabel historis: isinya bukan konfigurasi yang disajikan ke pengunjung. */
const EXCLUDED_TABLES = new Set(["settings_history", "audit_logs"]);

/** Nama identifier selalu dari information_schema, tapi tetap divalidasi. */
const IDENT_RE = /^[a-z_][a-z0-9_]*$/i;

function quoteIdent(name: string): string {
  if (!IDENT_RE.test(name)) throw new Error(`Identifier tidak valid: ${name}`);
  return `"${name}"`;
}

interface ColumnMeta {
  table_name: string;
  column_name: string;
  pk_column: string | null;
}

interface CandidateRow {
  row_label: string | number | null;
  value: unknown;
}

/** Regex Postgres untuk menyaring kandidat nilai gambar sebelum di-parse JS. */
const IMAGE_VALUE_RE = "\\.(png|jpe?g|webp|gif|avif|bmp|svg|ico)([^a-z0-9]|$)";

/**
 * Audit seluruh URL gambar tersimpan di database (read-only).
 *
 * Tidak pernah throw untuk kasus data rusak — setiap kolom diperiksa
 * terpisah. `checked: false` bila `DATABASE_URL` belum diset, supaya pemanggil
 * bisa refuses-to-skil (gate) alih-alih diam-diam lolos.
 */
export async function auditStoredImageUrls(
  opts: { perColumnLimit?: number } = {}
): Promise<MediaUrlAuditResult> {
  const perColumnLimit = opts.perColumnLimit ?? 200;

  if (!isDbConnected) {
    return {
      checked: false,
      scannedColumns: 0,
      scannedValues: 0,
      truncatedColumns: [],
      findings: [],
    };
  }

  const mediaIdsRaw = await db.execute(sql`select id from media`);
  const knownMediaIds = new Set(
    ((mediaIdsRaw as unknown as { rows?: Array<{ id: string }> }).rows ?? []).map((r) =>
      String(r.id).toLowerCase()
    )
  );

  const metaRaw = await db.execute(sql`
    select c.table_name, c.column_name, c.data_type,
      (
        select k.column_name
        from information_schema.table_constraints tc
        join information_schema.key_column_usage k on k.constraint_name = tc.constraint_name
        where tc.table_schema = 'public'
          and tc.table_name = c.table_name
          and tc.constraint_type = 'PRIMARY KEY'
        order by k.ordinal_position
        limit 1
      ) as pk_column
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.data_type in ('text', 'character varying', 'json', 'jsonb')
    order by c.table_name, c.column_name
  `);
  const columns = ((metaRaw as unknown as { rows?: ColumnMeta[] }).rows ?? []).filter(
    (c) => !EXCLUDED_TABLES.has(c.table_name) && isImageFieldName(c.column_name)
  );

  const findings: MediaUrlAuditFinding[] = [];
  const truncatedColumns: string[] = [];
  let scannedValues = 0;

  for (const column of columns) {
    const table = quoteIdent(column.table_name);
    const col = quoteIdent(column.column_name);
    // Tabel tanpa primary key (hampir tak mungkin di schema ini) tetap bisa
    // ditunjuk lewat ctid supaya pesan temuan tidak kehilangan konteks.
    const rowExpr = column.pk_column ? quoteIdent(column.pk_column) : "ctid::text";

    const candidatesRaw = await db.execute(sql`
      select ${sql.raw(rowExpr)} as row_label, ${sql.raw(col)} as value
      from ${sql.raw(table)}
      where ${sql.raw(col)}::text ilike ${"%/uploads/%"}
         or ${sql.raw(col)}::text ilike ${"%/api/media/%"}
         or ${sql.raw(col)}::text ~* ${IMAGE_VALUE_RE}
      limit ${perColumnLimit + 1}
    `);
    const candidates = (candidatesRaw as unknown as { rows?: CandidateRow[] }).rows ?? [];

    if (candidates.length > perColumnLimit) {
      truncatedColumns.push(`${column.table_name}.${column.column_name}`);
    }

    for (const candidate of candidates) {
      const row = candidate.row_label == null ? "?" : String(candidate.row_label);
      const refs = extractImageRefs(candidate.value, {
        field: column.column_name,
        row,
      });
      scannedValues += refs.length;
      for (const ref of refs) {
        const kind = classifyStoredImageUrl(ref.url, { knownMediaIds });
        if (!kind) continue;
        findings.push({
          field: `${column.table_name}.${ref.field}`,
          row: ref.row,
          url: ref.url,
          kind,
          detail: describeMediaUrlIssue(kind),
        });
      }
    }
  }

  findings.sort(
    (a, b) => a.field.localeCompare(b.field) || a.row.localeCompare(b.row) || a.url.localeCompare(b.url)
  );

  return {
    checked: true,
    scannedColumns: columns.length,
    scannedValues,
    truncatedColumns,
    findings,
  };
}