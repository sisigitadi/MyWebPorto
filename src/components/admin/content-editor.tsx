"use client";

import { useRef, useState } from "react";
import { Code2, Columns2, Eye, Heading2, Heading3, PencilLine, Quote } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FormattedText } from "@/components/public/formatted-text";
import { prefixLines, wrapCodeFence } from "@/lib/content-edit";

interface ContentEditorProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  required?: boolean;
}

type EditorViewMode = "write" | "preview" | "split";

/**
 * Editor konten admin: textarea + toolbar sintaks + pratinjau WYSIWYG
 * (persis render publik via FormattedText) dan mode split-pane untuk layar lebar.
 */
export function ContentEditor({ id, label, value, onChange, placeholder, rows = 10, required = false }: ContentEditorProps) {
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const [viewMode, setViewMode] = useState<EditorViewMode>("write");
  const isPreviewOnly = viewMode === "preview";
  const isSplit = viewMode === "split";

  const apply = (fn: (text: string, s: number, e: number) => { text: string; selStart: number; selEnd: number }) => {
    const el = areaRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const res = fn(value, start, end);
    onChange(res.text);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(res.selStart, res.selEnd);
    });
  };

  const tools = [
    { icon: Heading2, title: "Judul besar (## )", run: () => apply((t, s, e) => prefixLines(t, s, e, "## ")) },
    { icon: Heading3, title: "Judul kecil (### )", run: () => apply((t, s, e) => prefixLines(t, s, e, "### ")) },
    { icon: Quote, title: "Kutipan (> )", run: () => apply((t, s, e) => prefixLines(t, s, e, "> ")) },
    { icon: Code2, title: "Blok kode (```)", run: () => apply((t, s, e) => wrapCodeFence(t, s, e)) },
  ];

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Label htmlFor={id}>{label}</Label>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setViewMode(isPreviewOnly ? "write" : "preview")}
            className={`inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded border cursor-pointer ${isPreviewOnly
              ? "border-primary bg-primary/10 text-primary font-semibold"
              : "border-border text-muted-foreground hover:text-foreground"
              }`}
            aria-pressed={isPreviewOnly}
          >
            {isPreviewOnly ? <PencilLine className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            <span>{isPreviewOnly ? "Tulis" : "Pratinjau"}</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode(isSplit ? "write" : "split")}
            className={`hidden lg:inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded border cursor-pointer ${isSplit
              ? "border-primary bg-primary/10 text-primary font-semibold"
              : "border-border text-muted-foreground hover:text-foreground"
              }`}
            aria-pressed={isSplit}
          >
            <Columns2 className="h-3 w-3" />
            <span>Split</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 pb-0.5">
        {/* eslint-disable-next-line react-hooks/refs */}
        {tools.map((tool) => (
          <button
            key={tool.title}
            type="button"
            title={tool.title}
            aria-label={tool.title}
            onClick={tool.run}
            disabled={isPreviewOnly}
            className="p-2 sm:p-1.5 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed enabled:cursor-pointer"
          >
            <tool.icon className="h-3.5 w-3.5" />
          </button>
        ))}
        <span className="text-[10px] font-mono text-muted-foreground ml-1 hidden sm:inline">
          Pilih teks lalu klik format
        </span>
      </div>

      <div className={isSplit ? "grid lg:grid-cols-2 gap-3 items-start" : undefined}>
        <Textarea
          id={id}
          ref={areaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          required={required}
          className={isPreviewOnly ? "sr-only" : isSplit ? "min-h-[260px]" : undefined}
          tabIndex={isPreviewOnly ? -1 : 0}
        />

        {isPreviewOnly || isSplit ? (
          <div
            aria-hidden="true"
            className="min-h-[180px] lg:max-h-[420px] overflow-y-auto vt-scrollbar rounded border border-border bg-muted/20 p-4"
          >
            {value.trim() ? (
              <FormattedText text={value} />
            ) : (
              <p className="text-xs font-mono text-muted-foreground">Belum ada isi untuk dipratinjau.</p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
