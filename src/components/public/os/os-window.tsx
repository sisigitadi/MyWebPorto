"use client";

import React, { useState } from "react";
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

  return (
    <div
      id={id}
      className={`vt-window flex flex-col ${
        isMaximized ? "w-full" : ""
      } ${className}`}
    >
      {/* OS Titlebar */}
      <div className="vt-titlebar select-none">
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

        {/* Window Controls */}
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <button
            type="button"
            onClick={() => {
              playOS(isMinimized ? "maximize" : "minimize");
              setIsMinimized(!isMinimized);
            }}
            className="vt-titlebar-btn"
            title={isMinimized ? "Kembalikan" : "Perkecil"}
            aria-label="Minimize window"
          >
            <Minus className="h-2.5 w-2.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              playOS("maximize");
              setIsMaximized(!isMaximized);
            }}
            className="vt-titlebar-btn"
            title={isMaximized ? "Ukuran Normal" : "Perbesar"}
            aria-label="Maximize window"
          >
            <Square className="h-2.5 w-2.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              playOS(onClose ? "windowClose" : "minimize");
              if (onClose) onClose();
              else setIsMinimized(true);
            }}
            className="vt-titlebar-btn hover:bg-rose-500 hover:text-white"
            title="Tutup"
            aria-label="Close window"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </div>
      </div>

      {/* Window Body */}
      {!isMinimized && (
        <div className={`vt-paper-inset p-4 md:p-6 text-[var(--vt-ink)] ${bodyClassName}`}>
          {children}
        </div>
      )}

      {/* Window Statusline (optional) */}
      {!isMinimized && statusText && (
        <div className="mt-1 px-3 py-1.5 bg-[var(--vt-card)] border-t-2 border-[var(--vt-edge-lo-2)] flex items-center justify-between text-xs font-mono font-bold text-[var(--vt-ink)] select-none">
          <span className="truncate tracking-tight">{statusText}</span>
          <span className="shrink-0 flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400 text-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>READY</span>
          </span>
        </div>
      )}
    </div>
  );
}
