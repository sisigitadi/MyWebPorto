/**
 * Serialisasi payload JSON-LD agar aman disuntikkan ke
 * `<script type="application/ld+json">`.
 *
 * `JSON.stringify` tidak meng-escape urutan `</script>`. Karena judul, summary,
 * dan deskripsi artikel/proyek berasal dari input admin, konten seperti
 * `</script><script>…</script>` bisa menutup tag script lebih awal dan
 * mengeksekusi HTML/JS sembarang (stored XSS).
 *
 * Mengganti `<` menjadi `\u003c` menutup celah tersebut tanpa mengubah makna
 * JSON — parser JSON memperlakukan kedua bentuk itu identik.
 */
export function safeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
