import { NextResponse } from "next/server";
import { getMedia, isMediaId } from "@/lib/storage";

/**
 * Sajikan gambar dari tabel media (bytea Postgres).
 *
 * Publik (tanpa auth): gambar ini ditampilkan di halaman publik. Id adalah
 * UUID acak — tidak bisa dienumerasi, dan isinya hanya gambar yang admin
 * upload sendiri. Tidak ada batas rate karena ini ekuivalen dengan aset
 * statis biasa.
 *
 * Cache immutable: konten bytea tidak pernah berubah untuk id yang sama
 * (upload baru = id baru), jadi aman di-cache setahun di CDN/browser.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  // Id selalu UUID v4; tolak format aneh sebelum query.
  if (!isMediaId(id)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const row = await getMedia(id);
  if (!row) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(new Uint8Array(row.buffer), {
    status: 200,
    headers: {
      "Content-Type": row.mime,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
