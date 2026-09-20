import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { isPlaceholderKey, isProduction } from "@/lib/env";
import { isAdminOwnerConfigured } from "@/lib/admin-auth";

// Next.js 16: middleware.ts di-rename menjadi proxy.ts (logika gate identik,
// hanya nama file yang berubah — lihat docs Next 16 + clerkMiddleware Clerk).
// createRouteMatcher() deprecated di Clerk (log runtime warning); untuk logika
// non-auth pakai matching native sesuai anjuran Clerk.
const isAdminRoute = (req: NextRequest): boolean => req.nextUrl.pathname.startsWith("/admin");

export default clerkMiddleware(async (auth, req) => {
  // Jika Clerk keys belum diset / masih placeholder — izinkan navigasi untuk dev lokal (lihat SECURITY.md)
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const isPlaceholder = isPlaceholderKey(publishableKey);
  if (isPlaceholder) {
    // Fail-closed: di produksi tanpa kredensial asli, admin 404 (bukan bypass).
    // Bypass dev hanya diizinkan di luar produksi (lihat SECURITY.md).
    if (isAdminRoute(req) && isProduction()) {
      return new NextResponse("Halaman Tidak Ditemukan", { status: 404 });
    }
    // Hardening: jangan bocorkan bahwa ini placeholder — tetap lanjut tanpa proteksi
    return NextResponse.next();
  }

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

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
