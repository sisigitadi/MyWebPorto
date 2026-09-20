import { NextRequest } from "next/server";
import { getIndexNowKey } from "@/lib/indexnow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * File verifikasi IndexNow: GET /{key}.txt
 *
 * Protokol IndexNow mensyaratkan host menyajikan `{key}.txt` di root yang
 * isinya persis key. Melayaninya dinamis (bukan file statis) agar rotasi key
 * dari /admin/seo langsung efektif tanpa tambah file statis / redeploy.
 *
 * Hanya respons 200 bila nama path persis `{key}.txt` dengan key efektif —
 * path asing tetap 404, jadi route ini tidak menjadi "catch-all" yang bocor.
 * File statis lama di public/ (bila ada) tetas diutamakan Next.js untuk nama
 * yang sama, jadi tidak ada regresi pada key yang sudah berjalan.
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ indexnowKey: string }> }
): Promise<Response> {
  const { indexnowKey } = await ctx.params;
  const key = await getIndexNowKey();
  if (!key || indexnowKey !== `${key}.txt`) {
    return new Response("Not Found", { status: 404 });
  }
  return new Response(key, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      // Key bisa diganti kapan saja — jangan di-cache di tepi (edge/CDN).
      "Cache-Control": "no-store",
    },
  });
}
