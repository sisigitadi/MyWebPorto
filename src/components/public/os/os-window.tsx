"use client";

import React, { useState, useEffect } from "react";
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

  return (
    <>
      {/* Modal backdrop saat window dalam mode maximized (fullscreen preview) */}
      {isMaximized && (
        <div
          role="presentation"
          onClick={() => {
            playOS("minimize");
            setIsMaximized(false);
          }}
          className="fixed inset-0 bg-black/75 backdrop-blur-xs z-40 transition-opacity animate-in fade-in duration-150"
        />
      )}

      <div
        id={id}
        className={`vt-window flex flex-col transition-all duration-150 ${
          isMaximized
            ? "fixed inset-2 sm:inset-4 z-50 shadow-2xl max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)]"
            : ""
        } ${className}`}
      >
        {/* OS Titlebar (double click untuk toggle maximize/restore persis Windows OS) */}
        <div
          className="vt-titlebar select-none cursor-default"
          onDoubleClick={() => {
            playOS(isMaximized ? "minimize" : "maximize");
            setIsMaximized((v) => !v);
          }}
          title={isMaximized ? "Klik 2x untuk memulihkan ukuran" : "Klik 2x untuk perbesar"}
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

          {/* Window Caption Buttons (Minimize, Maximize / Restore Down, Close) */}
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

            {/* 2. Maximize / Restore Down Button */}
            <button
              type="button"
              onClick={() => {
                playOS(isMaximized ? "minimize" : "maximize");
                setIsMaximized(!isMaximized);
              }}
              className="vt-titlebar-btn"
              title={isMaximized ? "Kembalikan Ukuran Semula" : "Perbesar"}
              aria-label={isMaximized ? "Restore down window" : "Maximize window"}
            >
              {isMaximized ? (
                /* Authentic Windows overlapping double-square icon (Restore Down) */
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
              ) : (
                <Square className="h-2.5 w-2.5" />
              )}
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
            className={`vt-paper-inset min-h-0 text-[var(--vt-ink)] ${
              isMaximized ? "flex-1 overflow-y-auto" : ""
            } ${bodyClassName || "p-4 md:p-6"}`}
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
    </>
  );
}
