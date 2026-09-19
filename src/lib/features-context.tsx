"use client";

import React, { createContext, useContext, useMemo } from "react";
import type { FeatureKey, Features } from "@/lib/features-meta";

const FeaturesContext = createContext<Features | null>(null);

/**
 * Menyebarkan feature flag (settings.features) ke seluruh tree publik.
 *
 * Flag diresolve di server component (public)/layout.tsx lalu dilewatkan
 * sebagai prop — TIDAK ada fetch client, TIDAK ada NEXT_PUBLIC_, sehingga
 * nilainya bisa diubah admin tanpa redeploy (berbeda dari env var yang butuh
 * build ulang). Server memutuskan, client hanya menerima nilai final: nol
 * hydration mismatch.
 */
export function FeaturesProvider({
  features,
  children,
}: {
  features: Features;
  children: React.ReactNode;
}) {
  // Object stabil selama prop tidak berubah — consumer tidak re-render
  // sia-sia saat layout membangun ulang tree.
  const value = useMemo(() => features, [features]);
  return <FeaturesContext.Provider value={value}>{children}</FeaturesContext.Provider>;
}

/**
 * Semua flag. Lempar bila dipakai di luar FeaturesProvider: diam-diam jatuh
 * ke default berarti fitur "OFF" bisa kelihatan "ON" tanpa pesan — bug diam
 * yang persis seperti key-tak-terkonsumsi di Fase 2.
 */
export function useFeatures(): Features {
  const ctx = useContext(FeaturesContext);
  if (!ctx) throw new Error("useFeatures harus dipakai di dalam <FeaturesProvider>.");
  return ctx;
}

/** Ambil satu flag (komponen client di dalam FeaturesProvider). */
export function useFeature(key: FeatureKey): boolean {
  return useFeatures()[key];
}
