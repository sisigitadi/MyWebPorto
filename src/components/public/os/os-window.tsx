"use client";

import React, { useState } from "react";
import { Minus, Square, X, LucideIcon } from "lucide-react";

interface OSWindowProps {
  id?: string;
  title: string;
  icon?: LucideIcon | React.ReactNode;
  statusText?: string;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  initialMinimized?: boolean;
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
            onClick={() => setIsMinimized(!isMinimized)}
            className="vt-titlebar-btn"
            title={isMinimized ? "Kembalikan" : "Perkecil"}
            aria-label="Minimize window"
          >
            <Minus className="h-2.5 w-2.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsMaximized(!isMaximized)}
            className="vt-titlebar-btn"
            title={isMaximized ? "Ukuran Normal" : "Perbesar"}
            aria-label="Maximize window"
          >
            <Square className="h-2.5 w-2.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
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
        <div className="mt-1 px-3 py-1 bg-muted/60 border-t border-border/80 flex items-center justify-between text-[10px] font-mono text-muted-foreground select-none">
          <span className="truncate">{statusText}</span>
          <span className="shrink-0 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>OK</span>
          </span>
        </div>
      )}
    </div>
  );
}
