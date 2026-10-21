"use client";

import React from "react";
import Link from "next/link";
import { CodeBox } from "@/components/public/code-box";

function renderInline(str: string): React.ReactNode {
  const tokenRegex = /(\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(str)) !== null) {
    if (match.index > lastIndex) {
      parts.push(str.slice(lastIndex, match.index));
    }
    if (match[2] && match[3]) {
      const label = match[2];
      const href = match[3];
      const isInternal = href.startsWith("/");
      if (isInternal) {
        parts.push(
          <Link
            key={match.index}
            href={href}
            className="text-primary underline font-bold hover:text-primary/80 underline-offset-2"
          >
            {label}
          </Link>
        );
      } else {
        parts.push(
          <a
            key={match.index}
            href={href}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-primary underline font-bold hover:text-primary/80 underline-offset-2"
          >
            {label}
          </a>
        );
      }
    } else if (match[4]) {
      parts.push(
        <strong key={match.index} className="font-bold text-foreground">
          {match[4]}
        </strong>
      );
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < str.length) {
    parts.push(str.slice(lastIndex));
  }
  return parts.length > 0 ? parts : str;
}

/**
 * Normalisasi format teks sebelum dirender:
 * 1. Pastikan setiap heading markdown (## dan ###) memiliki baris kosong ganda (\n\n)
 *    setelahnya jika langsung ditempel oleh teks atau list tanpa baris kosong.
 *    Ini mencegah seluruh paragraf/list terserap ke dalam tag heading <h2> / <h3>.
 */
function normalizeMarkdownBreaks(raw: string): string {
  return raw.replace(/(^|\r?\n)(#{1,6}\s+[^\r\n]+)\r?\n(?!\r?\n)/g, "$1$2\n\n");
}

/**
 * Renderer teks konvensi MyWebPorto (sama persis dengan tampilan publik):
 * - `## ` → H2, `### ` → H3, `> ` → quote, ``` → blok kode terminal dengan header khusus & tombol copy,
 * - bullet `- ` / `1. ` → list semantik, `[teks](/path)` → Link internal, sisanya paragraf.
 * Dipakai artikel publik DAN preview editor admin agar WYSIWYG benar-benar sama.
 */
export function FormattedText({ text }: { text: string }) {
  if (!text) return null;

  const normalized = normalizeMarkdownBreaks(text);
  // Pisahkan blok kode ``` lebih dulu agar tidak terpotong oleh pemisahan paragraf biasa
  const rawParts = normalized.split(/(```[a-zA-Z0-9_-]*[\s\S]*?```)/g);
  const elements: React.ReactNode[] = [];

  const processBlock = (blockText: string, key: string) => {
    const bTrimmed = blockText.trim();
    if (!bTrimmed) return;

    // H2 Heading: ambil HANYA baris pertama sebagai heading
    if (bTrimmed.startsWith("## ")) {
      const lines = bTrimmed.split(/\r?\n/);
      const headingLine = lines[0].replace(/^##\s+/, "");
      elements.push(
        <h2
          key={key}
          className="text-sm sm:text-base md:text-lg font-display font-bold text-foreground mt-7 mb-3 tracking-tight border-b border-border/60 pb-2 leading-snug break-words"
        >
          {renderInline(headingLine)}
        </h2>
      );
      if (lines.length > 1) {
        const remaining = lines.slice(1).join("\n").trim();
        if (remaining) processBlock(remaining, `${key}-sub`);
      }
      return;
    }

    // H3 Heading: ambil HANYA baris pertama sebagai heading
    if (bTrimmed.startsWith("### ")) {
      const lines = bTrimmed.split(/\r?\n/);
      const headingLine = lines[0].replace(/^###\s+/, "");
      elements.push(
        <h3
          key={key}
          className="text-xs sm:text-sm font-mono font-bold text-foreground mt-4 mb-2 tracking-tight leading-snug break-words"
        >
          {"> "}
          {renderInline(headingLine)}
        </h3>
      );
      if (lines.length > 1) {
        const remaining = lines.slice(1).join("\n").trim();
        if (remaining) processBlock(remaining, `${key}-sub`);
      }
      return;
    }

    // Blockquote
    if (bTrimmed.startsWith("> ")) {
      elements.push(
        <blockquote
          key={key}
          className="border-l-4 border-primary bg-muted/40 p-4 rounded-r font-mono text-xs sm:text-sm text-[var(--vt-ink)] italic my-4"
        >
          {renderInline(bTrimmed.replace(/^>\s+/, ""))}
        </blockquote>
      );
      return;
    }

    // Bullet or Numbered List
    const lines = bTrimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const isBulletList = lines.length > 0 && lines.every((l) => /^[-*+]\s+/.test(l));
    const isNumberedList = lines.length > 0 && lines.every((l) => /^\d+\.\s+/.test(l));

    if (isBulletList) {
      elements.push(
        <ul
          key={key}
          className="list-disc list-inside space-y-1.5 my-3 text-xs sm:text-sm font-mono text-[var(--vt-ink)]"
        >
          {lines.map((line, lIdx) => (
            <li key={lIdx} className="leading-relaxed">
              {renderInline(line.replace(/^[-*+]\s+/, ""))}
            </li>
          ))}
        </ul>
      );
      return;
    }

    if (isNumberedList) {
      elements.push(
        <ol
          key={key}
          className="list-decimal list-inside space-y-1.5 my-3 text-xs sm:text-sm font-mono text-[var(--vt-ink)]"
        >
          {lines.map((line, lIdx) => (
            <li key={lIdx} className="leading-relaxed">
              {renderInline(line.replace(/^\d+\.\s+/, ""))}
            </li>
          ))}
        </ol>
      );
      return;
    }

    // Regular Paragraph
    elements.push(
      <p
        key={key}
        className="text-xs sm:text-sm font-mono text-[var(--vt-ink)] leading-relaxed sm:leading-loose my-3 mobile-safe-text whitespace-pre-line"
      >
        {renderInline(bTrimmed)}
      </p>
    );
  };

  rawParts.forEach((part, partIdx) => {
    const trimmed = part.trim();
    if (!trimmed) return;

    // Kotak khusus blok kode (bash, json, html, js, ts, sql, dsb)
    if (trimmed.startsWith("```") && trimmed.endsWith("```")) {
      const matchLang = trimmed.match(/^```([a-zA-Z0-9_-]+)/);
      const lang = matchLang ? matchLang[1] : "terminal";
      const cleanCode = trimmed
        .replace(/^```[a-zA-Z0-9_-]*\r?\n?/, "")
        .replace(/```$/, "")
        .trim();
      elements.push(<CodeBox key={`code-${partIdx}`} code={cleanCode} language={lang} />);
      return;
    }

    // Blok teks biasa dipisah berdasarkan newline ganda
    const blocks = part.split(/\n\n+/);
    blocks.forEach((block, bIdx) => {
      processBlock(block, `${partIdx}-${bIdx}`);
    });
  });

  return <>{elements}</>;
}


