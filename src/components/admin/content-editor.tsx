"use client";

import { useRef, useState } from "react";
import { Code2, Eye, Heading2, Heading3, PencilLine, Quote } from "lucide-react";
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

/**
 * Editor konten admin: textarea + toolbar sintaks + pratinjau WYSIWYG
 * (persis render publik via FormattedText). Format simpan TETAP teks polos.
 */
export function ContentEditor({ id, label, value, onChange, placeholder, rows = 10, required = false }: ContentEditorProps) {
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);

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
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        <button
          type="button"
          onClick={() => setPreview((v) => !v)}
          className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded border border-border text-muted-foreground hover:text-foreground cursor-pointer"
          aria-pressed={preview}
        >
          {preview ? <PencilLine className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          <span>{preview ? "Tulis" : "Pratinjau"}</span>
        </button>
      </div>
      <div className="flex items-center gap-1 pb-0.5">
        {tools.map((tool) => (
          <button
            key={tool.title}
            type="button"
            title={tool.title}
            aria-label={tool.title}
            onClick={tool.run}
            className="p-1.5 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <tool.icon className="h-3.5 w-3.5" />
          </button>
        ))}
        <span className="text-[10px] font-mono text-muted-foreground ml-1 hidden sm:inline">
          Pilih teks lalu klik format
        </span>
      </div>
      {preview ? (
        <div className="min-h-[180px] rounded border border-border bg-muted/20 p-4">
          {value.trim() ? (
            <FormattedText text={value} />
          ) : (
            <p className="text-xs font-mono text-muted-foreground">Belum ada isi untuk dipratinjau.</p>
          )}
        </div>
      ) : (
        <Textarea
          id={id}
          ref={areaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          required={required}
        />
      )}
    </div>
  );
}
