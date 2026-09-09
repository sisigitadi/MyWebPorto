import { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { AdminLayoutShell } from "@/components/admin/admin-layout-shell";
import { getProfile } from "@/lib/actions";

export const metadata: Metadata = {
  title: "Admin Dashboard - MyWebPorto",
  description: "Panel kendali portofolio dan profil karya digital.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { userId } = await auth();
  const adminClerkId = process.env.ADMIN_CLERK_ID;

  // Extra server-side check in layout: If ADMIN_CLERK_ID is set and logged in user is not admin, 404
  if (adminClerkId && adminClerkId !== "user_xxxxxxxxxxxxxxxxx" && userId !== adminClerkId) {
    notFound();
  }

  const profile = await getProfile();

  return (
    <AdminLayoutShell
      profileAvatar={profile.avatarUrl}
      profileName={profile.name}
    >
      {children}
    </AdminLayoutShell>
  );
}
