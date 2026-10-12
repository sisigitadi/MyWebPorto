"use client";

import React from "react";
import Link from "next/link";

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
 * - `## ` → H2, `### ` → H3, `> ` → quote, ``` → blok kode terminal,
 * - bullet `- ` / `1. ` → list semantik, `[teks](/path)` → Link internal, sisanya paragraf.
 * Dipakai artikel publik DAN preview editor admin agar WYSIWYG benar-benar sama.
 */
export function FormattedText({ text }: { text: string }) {
  if (!text) return null;
  const blocks = text.split(/\n\n+/);

  return (
    <>
      {blocks.map((block, idx) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        // H2 Heading
        if (trimmed.startsWith("## ")) {
          return (
            <h2
              key={idx}
              className="text-xl sm:text-2xl font-pixel font-bold text-foreground mt-8 mb-4 tracking-tight border-b border-border/60 pb-2"
            >
              {renderInline(trimmed.replace(/^##\s+/, ""))}
            </h2>
          );
        }

        // H3 Heading
        if (trimmed.startsWith("### ")) {
          return (
            <h3
              key={idx}
              className="text-base sm:text-lg font-mono font-bold text-foreground mt-6 mb-3 tracking-tight"
            >
              {"> "}
              {renderInline(trimmed.replace(/^###\s+/, ""))}
            </h3>
          );
        }

        // Blockquote
        if (trimmed.startsWith("> ")) {
          return (
            <blockquote
              key={idx}
              className="border-l-4 border-primary bg-muted/40 p-4 rounded-r font-mono text-xs sm:text-sm text-[var(--vt-ink)] italic my-4"
            >
              {renderInline(trimmed.replace(/^>\s+/, ""))}
            </blockquote>
          );
        }

        // Code Block / Terminal snippet
        if (trimmed.startsWith("```") && trimmed.endsWith("```")) {
          const cleanCode = trimmed.replace(/^```[a-z]*\n?/, "").replace(/```$/, "");
          return (
            <pre
              key={idx}
              className="p-4 rounded bg-black/90 text-emerald-400 font-mono text-xs overflow-x-auto border border-border/80 shadow-inner my-4"
            >
              <code>{cleanCode}</code>
            </pre>
          );
        }

        // Bullet or Numbered List
        const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        const isBulletList = lines.length > 0 && lines.every((l) => /^[-*+]\s+/.test(l));
        const isNumberedList = lines.length > 0 && lines.every((l) => /^\d+\.\s+/.test(l));

        if (isBulletList) {
          return (
            <ul key={idx} className="list-disc list-inside space-y-1.5 my-3 text-xs sm:text-sm font-mono text-[var(--vt-ink)]">
              {lines.map((line, lIdx) => (
                <li key={lIdx} className="leading-relaxed">
                  {renderInline(line.replace(/^[-*+]\s+/, ""))}
                </li>
              ))}
            </ul>
          );
        }

        if (isNumberedList) {
          return (
            <ol key={idx} className="list-decimal list-inside space-y-1.5 my-3 text-xs sm:text-sm font-mono text-[var(--vt-ink)]">
              {lines.map((line, lIdx) => (
                <li key={lIdx} className="leading-relaxed">
                  {renderInline(line.replace(/^\d+\.\s+/, ""))}
                </li>
              ))}
            </ol>
          );
        }

        // Regular Paragraph
        return (
          <p
            key={idx}
            className="text-xs sm:text-sm font-mono text-[var(--vt-ink)] leading-relaxed sm:leading-loose my-3 mobile-safe-text whitespace-pre-line"
          >
            {renderInline(trimmed)}
          </p>
        );
      })}
    </>
  );
}

