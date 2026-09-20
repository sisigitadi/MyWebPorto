"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "@/lib/i18n";
import { playOS } from "@/lib/os-sound";

export function OSBootLoader() {
  const { language } = useTranslation();
  // Boot hanya muncul saat pengguna membuka aplikasi pertama kali atau
  // membuka link dari tab baru — BUKAN setiap kali halaman direfresh.
  //
  // mounted: overlay hanya dirender SETELAH hydrasi di klien. Sebelumnya
  // server merender markup overlay penuh (sessionStorage tidak ada di server
  // → bootVisible true) → pengguna melihat flash hitam ~400ms di SETIAP refresh
  // meskipun flag sudah ada. Dengan gate ini, SSR tidak pernah memancarkan
  // overlay; klien menampilkan animasi hanya bila benar-benar boot pertama.
  const [mounted, setMounted] = useState(false);
  const [bootVisible, setBootVisible] = useState(true);
  const [isFading, setIsFading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [memCount, setMemCount] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Synthesize mild retro PC speaker beep via Web Audio API (safe & gentle).
  // Dihormati preferensi suara pengguna (toggle di Start Menu, default ON).
  const playRetroBeep = (freq = 850, duration = 0.08) => {
    try {
      if (typeof window === "undefined") return;
      if (window.localStorage?.getItem("sigitos_sound") === "off") return;
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio autoplay policy might silently block; ignore gracefully
    }
  };

  // Dideklarasikan & distabilkan sebelum useEffect: rule react-hooks v7
  // melarang akses sebelum deklarasi (TDZ) — sebelumnya handleComplete dipanggil
  // di dalam effect padahal dideklarasikan setelahnya (hanya jalan berkat
  // setTimeout 5 detik; rapuh saat refactor). useCallback([]) stabil → deps
  // [handleComplete] tetap menjaga effect run-once di mount.
  const handleComplete = useCallback(() => {
    setIsFading(true);
    sessionStorage.setItem("sigitos_booted_session", "true");
    // Chime "masuk desktop" ala startup jadul — sopan dan singkat
    playOS("boot");
    setTimeout(() => {
      setBootVisible(false);
    }, 600);
  }, []);

  useEffect(() => {
    // Boot hanya muncul saat pengguna membuka aplikasi pertama kali atau
    // membuka link dari tab baru — BUKAN setiap kali halaman direfresh.
    //
    // Strategi: sessionStorage di-clear saat tab ditutup, sehingga:
    //  - Tab baru / link dari luar → flag belum ada → animasi BIOS jalan.
    //  - Refresh di tab yang sama → flag masih ada → boot dilewati instan.
    //  - Navigasi internal antar halaman publik → flag ada → tetap dilewati.
    const hasBooted = sessionStorage.getItem("sigitos_booted_session");
    if (hasBooted) {
      // Sudah boot di sesi tab ini → tidak ada animasi, tidak ada beep.
      setBootVisible(false);
      setMounted(true);
      return;
    }
    setMounted(true);

    playRetroBeep(750, 0.1);

    // Memory test count up to 65536 KB
    const memInterval = setInterval(() => {
      setMemCount((prev) => {
        if (prev >= 65536) {
          clearInterval(memInterval);
          return 65536;
        }
        return prev + 4096;
      });
    }, 120);

    // Boot step timing (~5 seconds total)
    const t1 = setTimeout(() => { setCurrentStep(1); playRetroBeep(880, 0.05); }, 900);
    const t2 = setTimeout(() => { setCurrentStep(2); }, 1800);
    const t3 = setTimeout(() => { setCurrentStep(3); playRetroBeep(920, 0.06); }, 2700);
    const t4 = setTimeout(() => { setCurrentStep(4); }, 3600);
    const t5 = setTimeout(() => {
      setCurrentStep(5);
      playRetroBeep(1050, 0.12);
    }, 4400);

    // Progress bar
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 2;
      });
    }, 90);

    // Auto complete at ~5.0 seconds
    const completeTimer = setTimeout(() => {
      handleComplete();
    }, 5000);

    // Allow user to skip anytime with Escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleComplete();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearInterval(memInterval);
      clearInterval(progressInterval);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      clearTimeout(completeTimer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleComplete]);

  // Jangan render apapun di server (mencegah flash hitam SSR saat refresh) dan
  // jangan render di klien bila sudah boot di sesi tab ini.
  if (!mounted || !bootVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-black text-[#37ff9b] font-mono select-none flex flex-col justify-between p-4 sm:p-8 transition-opacity duration-500 ${
        isFading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{
        backgroundImage: "radial-gradient(rgba(55, 255, 155, 0.06) 1px, transparent 1px)",
        backgroundSize: "4px 4px",
      }}
    >
      {/* Top BIOS Banner */}
      <div className="space-y-4 max-w-4xl text-xs sm:text-sm">
        <div className="flex items-start justify-between border-b border-[#37ff9b]/30 pb-3">
          <div>
            <p className="font-bold tracking-wider text-white">
              SIGIT-ROM BIOS v4.51PG, An Energy Star Ally
            </p>
            <p className="text-[#37ff9b]/80 text-[11px]">
              Copyright (C) 1998-2026, Sigit Technologies System Architecture
            </p>
          </div>
          <div className="text-right hidden sm:block text-white/90 text-xs">
            <p className="font-pixel text-amber-400">SIGIT_OS</p>
            <p className="text-[10px] text-muted-foreground">BUILD 1998-PRO</p>
          </div>
        </div>

        {/* Hardware Initialization Telemetry */}
        <div className="space-y-1.5 pt-1 text-[11px] sm:text-xs">
          <p className="text-white">
            MAIN PROCESSOR : Intel(R) Pentium(R) II @ 450 MHz (FSB 100MHz)
          </p>
          <p className="flex items-center gap-2">
            <span>MEMORY TEST   :</span>
            <span className="text-white font-bold">{memCount.toLocaleString()} KB</span>
            {memCount >= 65536 ? (
              <span className="text-emerald-400 font-bold">[OK]</span>
            ) : (
              <span className="animate-pulse">TESTING...</span>
            )}
          </p>
          <p className="text-[#37ff9b]/80">AWARD PLUG AND PLAY BIOS EXTENSION v1.0A</p>
        </div>

        {/* Boot Logs */}
        <div className="space-y-1 pt-3 text-[11px] sm:text-xs text-white/90">
          {currentStep >= 1 && (
            <p className="flex items-center gap-2">
              <span className="text-emerald-400">&gt;</span>
              <span>Detecting IDE Primary Master ...</span>
              <span className="text-amber-300 font-bold">NEON-POSTGRES-POOLER [100GB]</span>
              <span className="text-emerald-400">[ONLINE]</span>
            </p>
          )}
          {currentStep >= 2 && (
            <p className="flex items-center gap-2">
              <span className="text-emerald-400">&gt;</span>
              <span>Detecting Secondary Storage ...</span>
              <span className="text-amber-300 font-bold">LOCAL-PERSISTENT-STORE</span>
              <span className="text-emerald-400">[MOUNTED]</span>
            </p>
          )}
          {currentStep >= 3 && (
            <p className="flex items-center gap-2">
              <span className="text-emerald-400">&gt;</span>
              <span>Loading SIGIT_KERNEL.SYS &amp; Next.js 15 Engine ...</span>
              <span className="text-emerald-400 font-bold">[OK]</span>
            </p>
          )}
          {currentStep >= 4 && (
            <p className="flex items-center gap-2">
              <span className="text-emerald-400">&gt;</span>
              <span>Initializing Retro 90s GUI (1024x768 32-bit color) ...</span>
              <span className="text-emerald-400 font-bold">[READY]</span>
            </p>
          )}
          {currentStep >= 5 && (
            <p className="flex items-center gap-2 text-white font-bold">
              <span className="text-amber-400">&gt;&gt;</span>
              <span>Starting SigitOS Desktop Environment... Welcome Sigit!</span>
            </p>
          )}
        </div>
      </div>

      {/* Bottom Progress Bar & Skip Action */}
      <div className="space-y-4 max-w-4xl pt-6 border-t border-[#37ff9b]/30">
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] text-white">
            <span>SYSTEM_INITIALIZING: SIGIT_DESKTOP</span>
            <span className="text-[#37ff9b] font-bold">{progress}%</span>
          </div>
          <div className="h-4 bg-[#0a140d] border-2 border-[#37ff9b] p-0.5">
            <div
              className="h-full bg-[#37ff9b] transition-all duration-100 ease-linear shadow-[0_0_10px_#37ff9b]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-[#37ff9b]/70">
          <p className="hidden sm:block">
            {language === "en" ? "Press " : "Tekan "}
            <kbd className="px-1.5 py-0.5 bg-zinc-800 text-white border border-zinc-600 rounded text-[10px]">ESC</kbd>
            {language === "en" ? " to enter immediately" : " untuk langsung masuk"}
          </p>
          <button
            type="button"
            onClick={handleComplete}
            className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-white border border-[#37ff9b]/60 text-xs font-mono tracking-wider transition-colors ml-auto cursor-pointer"
          >
            [ {language === "en" ? "Skip Boot >>" : "Lewati Boot >>"} ]
          </button>
        </div>
      </div>
    </div>
  );
}
