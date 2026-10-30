"use client";

import React, { useState, useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Minus, Square, X, LucideIcon } from "lucide-react";
import { playOS } from "@/lib/os-sound";

interface OSWindowProps {
  id?: string;
  title: string;
  icon?: LucideIcon | React.ReactNode;
  statusText?: string;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  initialMinimized?: boolean;
  /** Bila diisi, tombol X menutup window sungguhan (bukan sekadar minimize). */
  onClose?: () => void;
}

// React 18+ idiom untuk cek ketersediaan DOM klien tanpa trigger cascading render
const subscribeNoop = () => () => {};
const getClientTrue = () => true;
const getClientFalse = () => false;

export function OSWindow({
  id,
  title,
  icon,
  statusText,
  children,
  className = "",
  bodyClassName = "",
  initialMinimized = false,
  onClose,
}: OSWindowProps) {
  const [isMinimized, setIsMinimized] = useState(initialMinimized);
  const [isMaximized, setIsMaximized] = useState(false);
  const isMounted = useSyncExternalStore(subscribeNoop, getClientTrue, getClientFalse);

  // Keyboard shortcut Esc untuk restore down saat maximized
  useEffect(() => {
    if (!isMaximized) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        playOS("minimize");
        setIsMaximized(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMaximized]);

  // Mode Maximized: Teleport via React Portal ke document.body
  // Menghilangkan batasan CSS transform, overflow, flex, atau grid dari elemen induk
  if (isMaximized && isMounted && typeof document !== "undefined") {
    return (
      <>
        {/* Placeholder transparan di dalam flow agar layout grid tidak kolaps */}
        <div
          className={`vt-window opacity-0 pointer-events-none select-none ${className}`}
          aria-hidden="true"
        />

        {/* True Native Fullscreen Window Portal ke document.body (100% Menutup Layar) */}
        {createPortal(
          <div className="fixed inset-0 z-[9999] flex flex-col w-screen h-screen bg-[var(--vt-window-bg,var(--vt-chrome))] animate-in fade-in duration-150 overflow-hidden select-none">
            {/* Jendela Fullscreen Maksimal */}
            <div
              id={id ? `${id}-maximized` : undefined}
              className="vt-window relative z-10 flex flex-col w-full h-full rounded-none border-0 shadow-none bg-[var(--vt-window-bg,var(--vt-chrome))] overflow-hidden"
            >
              {/* Titlebar Fullscreen (double-click restore down) */}
              <div
                className="vt-titlebar select-none cursor-default py-1.5 px-3 flex items-center justify-between shrink-0"
                onDoubleClick={() => {
                  playOS("minimize");
                  setIsMaximized(false);
                }}
                title="Klik 2x untuk memulihkan ukuran (Esc)"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {icon && (
                    <span className="shrink-0 flex items-center justify-center text-white/90">
                      {React.isValidElement(icon) ? icon : null}
                    </span>
                  )}
                  <span className="font-mono text-xs font-semibold tracking-wide text-white truncate">
                    {title}
                  </span>
                </div>

                {/* Caption Buttons Fullscreen */}
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button
                    type="button"
                    onClick={() => {
                      playOS("minimize");
                      setIsMaximized(false);
                    }}
                    className="vt-titlebar-btn"
                    title="Minimize"
                    aria-label="Minimize window"
                  >
                    <Minus className="h-2.5 w-2.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playOS("minimize");
                      setIsMaximized(false);
                    }}
                    className="vt-titlebar-btn"
                    title="Kembalikan Ukuran Semula (Esc)"
                    aria-label="Restore down window"
                  >
                    <svg
                      className="h-2.5 w-2.5"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      aria-hidden="true"
                    >
                      <rect x="4" y="2" width="9" height="9" />
                      <polyline points="2,5 2,13 10,13" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playOS("windowClose");
                      setIsMaximized(false);
                      if (onClose) onClose();
                    }}
                    className="vt-titlebar-btn hover:bg-[#e81123] hover:text-white active:bg-[#f1707a] transition-colors"
                    title="Tutup (Esc)"
                    aria-label="Close window"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              </div>

              {/* Body Konten yang Proporsional & Scrollable */}
              <div className={`vt-paper-inset flex-1 overflow-y-auto text-[var(--vt-ink)] p-3 sm:p-6 md:p-8 ${bodyClassName}`}>
                <div className="max-w-6xl mx-auto w-full">
                  {children}
                </div>
              </div>

              {/* Statusline */}
              {statusText && (
                <div className="px-3 py-1.5 bg-[var(--vt-card)] border-t-2 border-[var(--vt-edge-lo-2)] flex items-center justify-between text-xs font-mono font-bold text-[var(--vt-ink)] select-none shrink-0">
                  <span className="truncate tracking-tight">{statusText}</span>
                  <span className="shrink-0 flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400 text-xs">
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                    <span>READY // FULLSCREEN</span>
                  </span>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
      </>
    );
  }

  // Mode Standar (In-place)
  return (
    <div
      id={id}
      className={`vt-window flex flex-col transition-all duration-150 ${className}`}
    >
      {/* OS Titlebar */}
      <div
        className="vt-titlebar select-none cursor-default"
        onDoubleClick={() => {
          playOS("maximize");
          setIsMaximized(true);
        }}
        title="Klik 2x untuk perbesar penuh"
      >
        <div className="flex items-center gap-2 min-w-0">
          {icon && (
            <span className="shrink-0 flex items-center justify-center text-white/90">
              {React.isValidElement(icon) ? icon : null}
            </span>
          )}
          <span className="font-mono text-xs font-semibold tracking-wide text-white truncate">
            {title}
          </span>
        </div>

        {/* Window Caption Buttons (Minimize, Maximize, Close) */}
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {/* 1. Minimize Button */}
          <button
            type="button"
            onClick={() => {
              playOS(isMinimized ? "maximize" : "minimize");
              setIsMinimized(!isMinimized);
            }}
            className="vt-titlebar-btn"
            title={isMinimized ? "Kembalikan" : "Perkecil"}
            aria-label={isMinimized ? "Restore window" : "Minimize window"}
          >
            <Minus className="h-2.5 w-2.5" />
          </button>

          {/* 2. Maximize Button */}
          <button
            type="button"
            onClick={() => {
              playOS("maximize");
              setIsMaximized(true);
            }}
            className="vt-titlebar-btn"
            title="Perbesar Penuh"
            aria-label="Maximize window"
          >
            <Square className="h-2.5 w-2.5" />
          </button>

          {/* 3. Close Button (Authentic Windows red hover #e81123) */}
          <button
            type="button"
            onClick={() => {
              playOS(onClose ? "windowClose" : "minimize");
              if (onClose) onClose();
              else setIsMinimized(true);
            }}
            className="vt-titlebar-btn hover:bg-[#e81123] hover:text-white active:bg-[#f1707a] transition-colors"
            title="Tutup"
            aria-label="Close window"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </div>
      </div>

      {/* Window Body */}
      {!isMinimized && (
        <div
          className={`vt-paper-inset min-h-0 text-[var(--vt-ink)] ${bodyClassName || "p-4 md:p-6"}`}
        >
          {children}
        </div>
      )}

      {/* Window Statusline (optional) */}
      {!isMinimized && statusText && (
        <div className="mt-1 px-3 py-1.5 bg-[var(--vt-card)] border-t-2 border-[var(--vt-edge-lo-2)] flex items-center justify-between text-xs font-mono font-bold text-[var(--vt-ink)] select-none shrink-0">
          <span className="truncate tracking-tight">{statusText}</span>
          <span className="shrink-0 flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400 text-xs">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            <span>READY</span>
          </span>
        </div>
      )}
    </div>
  );
}
