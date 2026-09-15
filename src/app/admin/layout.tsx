import { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { isAdminOwnerConfigured } from "@/lib/admin-auth";
import { isProduction } from "@/lib/env";
import { db, isDbConnected } from "@/db";
import { AdminLayoutShell } from "@/components/admin/admin-layout-shell";
import { ThemeProvider } from "@/components/public/os/theme-context";
import { getProfile } from "@/lib/actions";

export const metadata: Metadata = {
  title: "Admin Dashboard - MyWebPorto",
  description: "Panel kendali portofolio dan profil karya digital.",
  robots: {
    index: false,
    follow: false,
  },
};

/** Probe ringan reachability Neon (dipakai badge status di header admin). */
async function probeDb(): Promise<boolean> {
  if (!isDbConnected) return false;
  try {
    await Promise.race([
      db.query.profiles.findFirst(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout 2.5s")), 2500)),
    ]);
    return true;
  } catch {
    return false;
  }
}

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { userId } = await auth();

  // Extra server-side check in layout. Fail-closed di produksi: tanpa
  // ADMIN_CLERK_ID yang valid, admin tidak boleh terbuka untuk siapa pun.
  if (!isAdminOwnerConfigured()) {
    if (isProduction()) notFound();
  } else if (userId !== process.env.ADMIN_CLERK_ID) {
    notFound();
  }

  const profile = await getProfile();
  const dbConnected = await probeDb();

  return (
    <ThemeProvider>
      <AdminLayoutShell
        profileAvatar={profile.avatarUrl}
        profileName={profile.name}
        dbConnected={dbConnected}
      >
        {children}
      </AdminLayoutShell>
    </ThemeProvider>
  );
}
