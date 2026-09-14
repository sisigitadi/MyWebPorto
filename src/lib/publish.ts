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
