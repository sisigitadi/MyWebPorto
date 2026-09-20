import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { hasClerkPublishableKey, isProduction } from "@/lib/env";
import { isAdminOwnerConfigured } from "@/lib/admin-auth";

// Next.js 16: middleware.ts di-rename menjadi proxy.ts (logika gate identik,
// hanya nama file yang berubah — lihat docs Next 16 + clerkMiddleware Clerk).
// createRouteMatcher() deprecated di Clerk (log runtime warning); untuk logika
// non-auth pakai matching native sesuai anjuran Clerk.
const isAdminRoute = (req: NextRequest): boolean => req.nextUrl.pathname.startsWith("/admin");

/**
 * Gate tanpa Clerk — dipakai saat publishable key belum diset / placeholder.
 *
 * Kenapa percabangan ada di level export, bukan di dalam handler
 * clerkMiddleware: SDK Clerk v7 memvalidasi key saat middleware diinisialisasi.
 * Key placeholder membuat SETIAP request melempar "Publishable key not valid"
 * (HTTP 500) sebelum handler dijalankan, jadi early-return di dalam handler
 * tidak pernah tercapai. Mode tanpa Clerk aman untuk dev lokal tanpa
 * kredensial dan CI E2E (lihat SECURITY.md); di produksi tanpa key valid,
 * /admin tetap fail-closed 404 di bawah.
 */
function proxyWithoutClerk(req: NextRequest): NextResponse {
  if (isAdminRoute(req) && isProduction()) {
    // Fail-closed: di produksi tanpa kredensial asli, admin 404 (bukan bypass).
    return new NextResponse("Halaman Tidak Ditemukan", { status: 404 });
  }
  const res = NextResponse.next();
  res.headers.set("x-request-id", crypto.randomUUID());
  return res;
}

const clerkProxy = clerkMiddleware(async (auth, req) => {
  if (isAdminRoute(req)) {
    await auth.protect();

    const { userId } = await auth();

    // Single-owner gate: non-admin dapat 404 (bukan 403) agar tidak leak keberadaan /admin.
    // Fail-closed di produksi: tanpa ADMIN_CLERK_ID yang valid, admin ditolak total
    // (jangan fail-open ke semua user Clerk yang bisa mendaftar).
    if (!isAdminOwnerConfigured()) {
      if (isProduction()) {
        console.warn(`[middleware] ADMIN_CLERK_ID belum diset — admin ditolak: route=${req.nextUrl.pathname}`);
        return new NextResponse("Halaman Tidak Ditemukan", { status: 404 });
      }
    } else if (userId !== process.env.ADMIN_CLERK_ID) {
      // Audit log tanpa PII berlebih — cukup catat percobaan akses ditolak
      console.warn(`[middleware] non-admin access denied: route=${req.nextUrl.pathname} userId=${userId ?? "anon"}`);
      return new NextResponse("Halaman Tidak Ditemukan", { status: 404 });
    }
  }

  // Tambahkan header request-id untuk korelasi log (tanpa expose internal)
  const res = NextResponse.next();
  res.headers.set("x-request-id", crypto.randomUUID());
  return res;
});

export default hasClerkPublishableKey() ? clerkProxy : proxyWithoutClerk;

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
