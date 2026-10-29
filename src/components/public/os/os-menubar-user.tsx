"use client";

import React from "react";
import Link from "next/link";
import { Shield } from "lucide-react";
import { useUser, UserButton } from "@clerk/nextjs";

/**
 * Komponen status autentikasi menubar admin.
 * Dipisahkan ke modul mandiri agar @clerk/nextjs di-code-split secara dinamis
 * dan tidak masuk ke dalam critical bundle publik pengunjung biasa.
 */
export function MenubarUser() {
  const { isLoaded, isSignedIn } = useUser();
  if (!isLoaded || !isSignedIn) return null;
  return (
    <div className="flex items-center gap-1.5 ml-1">
      <Link
        href="/admin"
        className="group hidden sm:inline-flex vt-btn vt-btn-chrome px-2 py-0.5 sm:py-1 text-[11px] sm:text-[13px] font-bold text-foreground hover:-translate-y-0.5 transition-all hover:text-amber-500 shadow-sm"
        title="Masuk ke Panel Admin"
      >
        <Shield className="h-3.5 w-3.5 sm:h-4 w-4 text-primary group-hover:scale-110 mr-1 transition-all" />
        <span>Admin</span>
      </Link>
      {/* UserButton (avatar Clerk) disembunyikan di mobile */}
      <div className="hidden sm:block hover:scale-110 transition-transform">
        <UserButton />
      </div>
    </div>
  );
}
