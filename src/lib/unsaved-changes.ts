/**
 * Penyimpan global untuk status "ada perubahan belum disimpan" di form admin.
 *
 * Sengaja module-level (bukan React context): guard harus bisa dibaca
 * SINKRON saat klik link di AdminSidebar, yang tidak menerima state form
 * sebagai prop — form hidup di masing-masing halaman admin. Context atau
 * prop-drilling akan memaksa re-render seluruh pohon admin pada setiap
 * ketikan, jauh lebih mahal dari sebuah flag module.
 *
 * Penulis: hook `useUnsavedChanges` (src/hooks/use-unsaved-changes.ts).
 * Pembaca: AdminSidebar (mencegah navigasi saat guard aktif).
 */
let dirty = false;

export function setUnsavedChanges(value: boolean): void {
  dirty = value;
}

export function hasUnsavedChanges(): boolean {
  return dirty;
}

/**
 * Membandingkan dua snapshot form. Dipisah dari hook supaya logika dirty-
 * detection bisa diuji tanpa React renderer (lihat tests/unsaved-changes).
 *
 * Perbandingan memakai JSON.stringify: field form adalah plain data
 * (string/number/boolean/array bersarang), dan urutan key dianggap tidak
 * signifikan karena state form selalu dibangun dengan urutan yang sama.
 */
export function isSnapshotDirty(baseline: unknown, snapshot: unknown): boolean {
  return JSON.stringify(baseline) !== JSON.stringify(snapshot);
}
