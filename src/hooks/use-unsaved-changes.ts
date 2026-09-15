"use client";

import { useEffect, useRef } from "react";
import { hasUnsavedChanges, isSnapshotDirty, setUnsavedChanges } from "@/lib/unsaved-changes";

/**
 * Memasang guard "perubahan belum disimpan" pada sebuah form admin.
 *
 * @param sessionKey Id sesi form. HARUS berubah setiap kali form dimuat ulang
 *   dengan data baru (buka dialog tambah, pilih item lain, selesai memuat
 *   data async). Perubahan inilah yang me-reset baseline — bukan render
 *   biasa — supaya mengetik di form tidak me-reset perbandingan (tanpa ini
 *   dirty akan selalu false). Null/undefined = form tertutup/non-aktif.
 * @param snapshot Nilai field form saat ini (plain data: string/number/
 *   boolean/array). Dibandingkan dengan baseline via JSON.stringify.
 *
 * Guard bekerja di dua jalur:
 * 1. `beforeunload` — refresh, tutup tab, atau navigasi ke domain lain.
 *    Inilah jalur yang paling sering memakan draf artikel panjang.
 * 2. Klik link sidebar — dicegah di AdminSidebar via hasUnsavedChanges().
 *
 * Keterbatasan: tombol Back/Forward browser di App Router tetap tidak bisa
 * diblokir secara andal (tidak memicu beforeunload). Draf bisa hilang di
 * jalur itu; satu-satunya mitigasi adalah tombol "Simpan" yang cepat.
 */
export function useUnsavedChanges(sessionKey: unknown, snapshot: unknown): void {
  const baselineRef = useRef<{ key: unknown; value: unknown }>({ key: undefined, value: snapshot });

  useEffect(() => {
    const baseline = baselineRef.current;
    if (baseline.key !== sessionKey) {
      // Sesi baru (dialog dibuka / item lain dipilih / data async selesai
      // dimuat): jadikan snapshot saat ini sebagai titik banding bersih.
      baselineRef.current = { key: sessionKey, value: snapshot };
      setUnsavedChanges(false);
      return;
    }
    setUnsavedChanges(isSnapshotDirty(baseline.value, snapshot));
  }, [sessionKey, snapshot]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges()) {
        // Chrome/Edge/Firefox: preventDefault + returnValue non-string-kosong
        // yang memicu dialog konfirmasi bawaan browser.
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);
}
