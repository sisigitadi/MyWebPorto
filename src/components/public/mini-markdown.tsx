"use client";

/**
 * MiniMarkdown — merender pohon token dari `parseMarkdown` menjadi React.
 *
 * Tidak memakai dangerouslySetInnerHTML: semua node dibangun dari string
 * mentah yang sudah di-tokenisasi, sehingga tidak ada injeksi HTML/XSS.
 * Hanya untuk jawaban AI (bot), bukan input pengguna.
 */

import React, { useMemo } from "react";
import { parseMarkdown, parseInline, type MdBlock, type MdInline } from "@/lib/mini-markdown";

function renderInline(nodes: MdInline[], keyPrefix: string): React.ReactNode[] {
  return nodes.map((node, i) => {
    const key = `${keyPrefix}-${i}`;
    switch (node.type) {
      case "bold":
        return (
          <strong key={key} className="font-semibold text-[var(--vt-ink)]">
            {renderInline(node.children, key)}
          </strong>
        );
      case "italic":
        return (
          <em key={key} className="italic">
            {renderInline(node.children, key)}
          </em>
        );
      case "code":
        return (
          <code
            key={key}
            className="px-1 py-0.5 bg-black/15 dark:bg-black/30 rounded text-[10px] font-mono"
          >
            {node.text}
          </code>
        );
      case "link":
        return (
          <a
            key={key}
            href={node.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline decoration-dotted underline-offset-2 hover:opacity-80"
          >
            {node.text}
          </a>
        );
      default:
        return <React.Fragment key={key}>{node.text}</React.Fragment>;
    }
  });
}

function renderBlock(block: MdBlock, index: number): React.ReactNode {
  const key = `b-${index}`;
  switch (block.type) {
    case "heading": {
      // Bubble retro memakai font mono 11px; heading proporsional, rapi, dan tidak kebesaran/bold berlebih
      const size = block.level <= 1 ? "text-[12px]" : block.level === 2 ? "text-[11.5px]" : "text-[11px]";
      return (
        <p key={key} className={`font-semibold ${size} mt-1.5 first:mt-0 text-[var(--vt-ink)] tracking-tight`}>
          {renderInline(block.children, key)}
        </p>
      );
    }
    case "list":
      return block.ordered ? (
        <ol key={key} className="list-decimal pl-4 space-y-1 mt-1 first:mt-0 marker:text-[var(--vt-ink)]/70 leading-relaxed">
          {block.items.map((item, i) => (
            <li key={`${key}-li-${i}`} className="pl-0.5">
              {renderInline(item, `${key}-li-${i}`)}
            </li>
          ))}
        </ol>
      ) : (
        <ul key={key} className="list-disc pl-4 space-y-1 mt-1 first:mt-0 marker:text-[var(--vt-ink)]/70 leading-relaxed">
          {block.items.map((item, i) => (
            <li key={`${key}-li-${i}`} className="pl-0.5">
              {renderInline(item, `${key}-li-${i}`)}
            </li>
          ))}
        </ul>
      );
    default:
      return (
        <p key={key} className="whitespace-pre-line mt-1.5 first:mt-0 leading-relaxed">
          {renderInline(block.children, key)}
        </p>
      );
  }
}

export function MiniMarkdown({ text }: { text: string }) {
  const blocks = useMemo(() => parseMarkdown(text), [text]);
  return <div className="space-y-1 text-[11px] leading-relaxed">{blocks.map((block, i) => renderBlock(block, i))}</div>;
}

/**
 * Hanya bagian sebaris (bold/italic/code/link) untuk satu baris teks —
 * dipakai Terminal CRT yang sudah memecah jawaban per baris sendiri.
 */
export function MiniMarkdownInline({ text }: { text: string }) {
  const nodes = useMemo(() => parseInline(text), [text]);
  return <>{renderInline(nodes, "inline")}</>;
}

export { parseInline };
