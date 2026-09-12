// Sanitizes server-action errors before they reach the client, so internal
// details (env values, stack traces, DB messages) are never leaked.
//
// NOTE: This file must NOT have a "use server" directive — it is a pure
// sync helper consumed by server actions in actions.ts.
export function sanitizeError(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message || "";
    // Allowlist pesan aman yang memang ditujukan untuk user
    const safeMessages = [
      "Akses ditolak",
      "Anda harus login",
      "bukan administrator",
      "Akses upload ditolak",
      "Validasi",
      "Slug",
      "sudah dipakai",
      "belum dibuat",
      "Gagal menyimpan",
      "Gagal menghapus",
      "Terjemahan",
      "Format file",
      "Ukuran file",
      "Isi berkas",
      "Tidak ada file",
    ];
    if (safeMessages.some((safe) => msg.includes(safe))) {
      // Potong agar tidak bocor stack panjang walau mengandung keyword aman
      return msg.slice(0, 500);
    }
    // Log internal di server saja, jangan ke klien
    console.error("[sanitizeError] masked:", msg.slice(0, 1000));
  }
  return "Terjadi kesalahan internal. Silakan coba lagi nanti.";
}
