import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  // If Clerk keys are not set yet (in development or staging before env keys provided), allow navigation
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey || publishableKey.includes("xxxx")) {
    return NextResponse.next();
  }

  if (isAdminRoute(req)) {
    await auth.protect();

    const adminClerkId = process.env.ADMIN_CLERK_ID;
    const { userId } = await auth();

    // If ADMIN_CLERK_ID is set and user ID does not match, return 404 as specified in PRD
    if (adminClerkId && adminClerkId !== "user_xxxxxxxxxxxxxxxxx" && userId !== adminClerkId) {
      return new NextResponse("Halaman Tidak Ditemukan", { status: 404 });
    }
  }

  return NextResponse.next();
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
