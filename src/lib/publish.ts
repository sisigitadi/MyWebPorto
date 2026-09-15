/**
 * Visibilitas terjadwal — murni (tanpa I/O) agar mudah diuji.
 *
 * Aturan: tayang publik bila `published` true DAN (`publishAt` kosong ATAU
 * sudah lewat). Tanggal tak-valid dianggap tayang (fail-open) karena input
 * sudah divalidasi Zod di form; jangan sembunyikan konten akibat typo.
 */

export interface Schedulable {
  published?: boolean | null;
  publishAt?: string | null;
}

export function isLivePublished(item: Schedulable, now: Date = new Date()): boolean {
  if (!item || item.published !== true) return false;
  if (!item.publishAt) return true;
  const t = new Date(item.publishAt).getTime();
  if (Number.isNaN(t)) return true;
  return t <= now.getTime();
}

/** True bila item dijadwalkan masa depan (untuk badge admin). */
export function isScheduled(item: Schedulable, now: Date = new Date()): boolean {
  if (!item || item.published !== true || !item.publishAt) return false;
  const t = new Date(item.publishAt).getTime();
  return !Number.isNaN(t) && t > now.getTime();
}

/** Normalisasi input form datetime-local ("", ISO) → ISO string atau null. */
export function normalizePublishAt(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const t = new Date(trimmed).getTime();
  if (Number.isNaN(t)) return null;
  return new Date(trimmed).toISOString();
}

/**
 * Konversi nilai input datetime-local ("2026-09-14T10:00") → ISO UTC.
 * WAJIB dipanggil di KLIEN sebelum dikirim ke server action: string tanpa
 * zona akan diparse browser sebagai waktu LOKAL admin, bukan waktu server
 * (UTC di Vercel) — tanpa ini jadwal tayang bergeser sebesar offset timezone.
 */
export function localInputToUtcIso(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const t = new Date(trimmed).getTime();
  if (Number.isNaN(t)) return null;
  return new Date(trimmed).toISOString();
}

/** ISO UTC → nilai untuk input datetime-local dalam zona LOKAL browser. */
export function utcIsoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
