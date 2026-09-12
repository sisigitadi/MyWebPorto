// Sanitizes server-action errors before they reach the client, so internal
// details (env values, stack traces, DB messages) are never leaked.
//
// NOTE: This file must NOT have a "use server" directive — it is a pure
// sync helper consumed by server actions in actions.ts.
export function sanitizeError(err: unknown): string {
  if (err instanceof Error) {
    // Only expose our own known safe messages; mask everything else.
    const msg = err.message || "";
    const safeMessages = [
      "Akses ditolak",
      "Anda harus login",
      "bukan administrator",
      "Akses upload ditolak",
    ];
    if (safeMessages.some((safe) => msg.includes(safe))) {
      return msg;
    }
  }
  return "Terjadi kesalahan internal. Silakan coba lagi nanti.";
}
