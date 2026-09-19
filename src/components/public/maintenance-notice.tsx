"use client";

import React from "react";
import { Wrench } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import type { ProfileData } from "@/lib/dummy-data";

interface MaintenanceNoticeProps {
  profile?: ProfileData;
}

/**
 * Halaman pengganti saat maintenance_mode aktif (settings.features).
 *
 * Sengaja ringan: TANPA OS shell — (public)/layout.tsx langsung mengembalikan
 * komponen ini, jadi boot loader 5 detik, sound layer, visitor tracker, dan
 * RetroBot TIDAK dirender. Teks dwibahasa inline (bukan key translations.ts)
 * karena ini halaman operasional baru, bukan teks marketing yang diedit admin.
 *
 * /admin/* tidak terdampak: route group (admin) punya layout sendiri, tidak
 * memakai (public)/layout.tsx — panel admin tetap bisa diakses untuk
 * mematikan mode ini. Clerk middleware juga tidak diubah (spec §3.4).
 */
export function MaintenanceNotice({ profile }: MaintenanceNoticeProps) {
  const { language } = useTranslation();
  const isEn = language === "en";
  const name = profile?.name?.trim() || (isEn ? "the site owner" : "pemilik situs");

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[var(--vt-bg,#1a1726)] px-6 py-10">
      <div className="max-w-md w-full text-center space-y-5 font-mono">
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-md border-2 border-[var(--vt-edge-lo-2,#3a3450)] flex items-center justify-center animate-pulse">
            <Wrench className="h-8 w-8 text-[var(--vt-amber,#fbbf24)]" />
          </div>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-[var(--vt-ink,#e8e4f0)]">
          {isEn ? "Under Maintenance" : "Sedang Pemeliharaan"}
        </h1>
        <p className="text-sm text-[var(--vt-ink-mute,#9a93b0)] leading-relaxed">
          {isEn
            ? `${name}'s portfolio is temporarily offline for maintenance. Please come back in a moment.`
            : `Portofolio ${name} sementara tidak bisa diakses karena sedang pemeliharaan. Silakan kembali lagi sebentar.`}
        </p>
        <p className="text-[11px] text-[var(--vt-ink-mute,#9a93b0)] opacity-70">
          {isEn ? "— SigitOS —" : "— SigitOS —"}
        </p>
      </div>
    </div>
  );
}
