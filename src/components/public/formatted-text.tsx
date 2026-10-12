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
            rel="noopener noreferrer"
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
 * Renderer teks konvensi MyWebPorto (sama persis dengan tampilan publik):
 * - `## ` → H2, `### ` → H3, `> ` → quote, ``` → blok kode terminal dengan header khusus & tombol copy,
 * - bullet `- ` / `1. ` → list semantik, `[teks](/path)` → Link internal, sisanya paragraf.
 * Dipakai artikel publik DAN preview editor admin agar WYSIWYG benar-benar sama.
 */
export function FormattedText({ text }: { text: string }) {
  if (!text) return null;

  // Pisahkan blok kode ``` lebih dulu agar tidak terpotong oleh pemisahan paragraf biasa
  const rawParts = text.split(/(```[a-zA-Z0-9_-]*[\s\S]*?```)/g);
  const elements: React.ReactNode[] = [];

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
      const bTrimmed = block.trim();
      if (!bTrimmed) return;
      const key = `${partIdx}-${bIdx}`;

      // H2 Heading
      if (bTrimmed.startsWith("## ")) {
        elements.push(
          <h2
            key={key}
            className="text-base sm:text-lg font-pixel font-bold text-foreground mt-7 mb-3 tracking-wide border-b border-border/60 pb-2"
          >
            {renderInline(bTrimmed.replace(/^##\s+/, ""))}
          </h2>
        );
        return;
      }

      // H3 Heading
      if (bTrimmed.startsWith("### ")) {
        elements.push(
          <h3
            key={key}
            className="text-xs sm:text-sm font-mono font-bold text-foreground mt-4 mb-2 tracking-tight"
          >
            {"> "}
            {renderInline(bTrimmed.replace(/^###\s+/, ""))}
          </h3>
        );
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
    });
  });

  return <>{elements}</>;
}


