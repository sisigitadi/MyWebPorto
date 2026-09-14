"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { CornerDownLeft, Search } from "lucide-react";

export interface PaletteApp {
  id: string;
  label: string;
  icon: React.ReactNode;
}

export interface PaletteAction {
  id: string;
  label: string;
  hint?: string;
  run: () => void;
}

interface OSCommandPaletteProps {
  open: boolean;
  apps: PaletteApp[];
  actions: PaletteAction[];
  language: "id" | "en";
  onSelectApp: (id: string) => void;
  onClose: () => void;
}

/**
 * Command palette SigitOS (Ctrl+K): lompat ke aplikasi atau jalankan aksi
 * (tema, bahasa, reboot) tanpa menyentuh mouse. Tertutup otomatis setelah run.
 */
export function OSCommandPalette({
  open,
  apps,
  actions,
  language,
  onSelectApp,
  onClose,
}: OSCommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open ]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matchedApps = (q
      ? apps.filter((a) => a.label.toLowerCase().includes(q) || a.id.includes(q))
      : apps
    ).map((a) => ({ kind: "app" as const, id: `app:${a.id}`, label: a.label, icon: a.icon }));
    const matchedActions = (q
      ? actions.filter((a) => a.label.toLowerCase().includes(q) || a.id.includes(q))
      : actions
    ).map((a) => ({ kind: "action" as const, id: `act:${a.id}`, label: a.label, hint: a.hint }));
    return [...matchedApps, ...matchedActions].slice(0, 12);
  }, [query, apps, actions]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!open) return null;

  const runAt = (index: number) => {
    const item = results[index];
    if (!item) return;
    if (item.kind === "app") {
      onSelectApp(item.id.replace(/^app:/, ""));
    } else {
      actions.find((a) => `act:${a.id}` === item.id)?.run();
    }
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (results.length ? (i + 1) % results.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (results.length ? (i - 1 + results.length) % results.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      runAt(activeIndex);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[12vh] px-4" role="dialog" aria-modal="true" aria-label="Command palette">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md vt-window bg-[var(--vt-chrome)] text-foreground shadow-2xl animate-in fade-in-50 zoom-in-95 duration-100">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={language === "en" ? "Type app or action... (Esc to close)" : "Ketik aplikasi atau aksi... (Esc untuk tutup)"}
            className="flex-1 bg-transparent outline-none text-sm font-mono placeholder:text-muted-foreground"
          />
          <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-[10px] font-mono text-muted-foreground">
            ESC
          </kbd>
        </div>
        <div className="max-h-[40vh] overflow-y-auto p-1">
          {results.length === 0 && (
            <p className="px-3 py-4 text-xs font-mono text-muted-foreground">
              {language === "en" ? "No match. Try 'proyek', 'theme', 'reboot'..." : "Tidak cocok. Coba 'proyek', 'tema', 'reboot'..."}
            </p>
          )}
          {results.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => runAt(i)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xs text-left text-xs font-mono font-bold cursor-pointer ${
                i === activeIndex ? "bg-[var(--vt-blue)] text-white" : "text-foreground hover:bg-muted"
              }`}
            >
              {item.kind === "app" && item.icon ? (
                <span className="shrink-0 [&>svg]:h-4 [&>svg]:w-4">{item.icon}</span>
              ) : null}
              <span className="flex-1 truncate">{item.label}</span>
              {item.kind === "action" && item.hint ? (
                <span className="text-[10px] opacity-75 font-normal">{item.hint}</span>
              ) : null}
              {i === activeIndex && <CornerDownLeft className="h-3 w-3 shrink-0 opacity-75" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
