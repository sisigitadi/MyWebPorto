"use client";

import React, { useState } from "react";
import { Copy, Check, Terminal } from "lucide-react";

interface CodeBoxProps {
  code: string;
  language?: string;
}

export function CodeBox({ code, language = "terminal" }: CodeBoxProps) {
  const [copied, setCopied] = useState(false);

  const cleanLang = (language || "terminal").trim().toLowerCase();
  const displayLang = cleanLang.toUpperCase();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn("Gagal menyalin kode:", err);
    }
  };

  return (
    <div className="my-5 rounded-lg border border-border/80 bg-[#0d1117] text-gray-200 overflow-hidden shadow-lg font-mono text-xs sm:text-sm">
      {/* Terminal / Code Box Header */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-[#161b22] border-b border-border/60 select-none">
        <div className="flex items-center space-x-2">
          {/* 3 OS Window Control Dots */}
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56] inline-block opacity-90" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e] inline-block opacity-90" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f] inline-block opacity-90" />
          </div>
          <div className="flex items-center space-x-1.5 ml-2 text-muted-foreground text-[11px] font-mono">
            <Terminal className="w-3.5 h-3.5 text-primary opacity-80" />
            <span className="font-semibold tracking-wider text-muted-foreground/90">{displayLang}</span>
          </div>
        </div>

        {/* Copy Button */}
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Salin kode"
          className="flex items-center space-x-1.5 px-2 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-gray-300 hover:text-white transition-colors text-[11px] font-mono border border-border/40 focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-bold">Tersalin</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 opacity-70" />
              <span>Salin</span>
            </>
          )}
        </button>
      </div>

      {/* Code Display Area */}
      <div className="p-4 overflow-x-auto vt-scrollbar bg-[#0d1117]">
        <pre className="m-0 font-mono text-xs sm:text-[13px] leading-relaxed text-emerald-300/95">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}
