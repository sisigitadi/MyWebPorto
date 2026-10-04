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
          <strong key={key} className="font-bold">
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
            className="px-0.5 py-px bg-black/25 rounded-[2px] text-[10px]"
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
            className="font-bold underline decoration-dotted underline-offset-2 hover:opacity-80"
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
      // Bubble retro memakai font mono 11px; heading dibedakan hanya lewat
      // ketebalan + sedikit penegasan ukuran, agar tetap selaras tema.
      const size = block.level <= 1 ? "text-[13px]" : block.level === 2 ? "text-[12px]" : "text-[11px]";
      return (
        <p key={key} className={`font-bold ${size} mt-1 first:mt-0`}>
          {renderInline(block.children, key)}
        </p>
      );
    }
    case "list":
      return block.ordered ? (
        <ol key={key} className="list-decimal pl-4 space-y-0.5 mt-1 first:mt-0 marker:text-[var(--vt-ink)]/70">
          {block.items.map((item, i) => (
            <li key={`${key}-li-${i}`} className="pl-0.5">
              {renderInline(item, `${key}-li-${i}`)}
            </li>
          ))}
        </ol>
      ) : (
        <ul key={key} className="list-disc pl-4 space-y-0.5 mt-1 first:mt-0 marker:text-[var(--vt-ink)]/70">
          {block.items.map((item, i) => (
            <li key={`${key}-li-${i}`} className="pl-0.5">
              {renderInline(item, `${key}-li-${i}`)}
            </li>
          ))}
        </ul>
      );
    default:
      return (
        <p key={key} className="whitespace-pre-line mt-1 first:mt-0">
          {renderInline(block.children, key)}
        </p>
      );
  }
}

export function MiniMarkdown({ text }: { text: string }) {
  const blocks = useMemo(() => parseMarkdown(text), [text]);
  return <div className="space-y-0.5">{blocks.map((block, i) => renderBlock(block, i))}</div>;
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
