"use client";

import React from "react";

/**
 * Renderer teks konvensi MyWebPorto (sama persis dengan tampilan publik):
 * - `## ` → H2, `### ` → H3, `> ` → quote, ``` → blok kode terminal, sisanya paragraf.
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
              {trimmed.replace(/^##\s+/, "")}
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
              {trimmed.replace(/^###\s+/, "")}
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
              {trimmed.replace(/^>\s+/, "")}
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

        // Regular Paragraph
        return (
          <p
            key={idx}
            className="text-xs sm:text-sm font-mono text-[var(--vt-ink)] leading-relaxed sm:leading-loose my-3 mobile-safe-text"
          >
            {trimmed}
          </p>
        );
      })}
    </>
  );
}
