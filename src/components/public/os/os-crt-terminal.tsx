"use client";

import React, { useState, useEffect, useRef } from "react";
import { Terminal as TerminalIcon, Play, RotateCcw, Cpu, Sparkles } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { queryAIEngine } from "@/lib/ai-engine";

interface OSCrtTerminalProps {
  ownerName: string;
}

export function OSCrtTerminal({ ownerName }: OSCrtTerminalProps) {
  const { language } = useTranslation();
  const [logs, setLogs] = useState<string[]>([
    "BIOS-ROM v4.51 (C) 1998-2026 SIGIT CORP.",
    "CPU: AMD Ryzen 64-Bit System Architecture | RAM: 65536KB OK",
    "INIT: Loading SigitOS Machine Learning Subsystem [ONLINE]",
    "NEURAL: Client-side NLP & Intent Vector Engine loaded (TF-IDF)",
    "STACK: Next.js 15.5 + React 19 + TypeScript + Neon PostgreSQL",
    `AUTH: Developer session verified for '${ownerName}'`,
    "STATUS: Ready. Tanyakan apa saja atau ketik perintah bebas!",
  ]);
  const [commandInput, setCommandInput] = useState("");
  const [isInferencing, setIsInferencing] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const executeCommandOrQuery = (inputStr: string) => {
    const raw = inputStr.trim();
    if (!raw) return;

    const cmd = raw.toLowerCase();
    const newLogs = [...logs, `> ${raw}`];

    if (cmd === "clear" || cmd === "cls") {
      setLogs([
        language === "en"
          ? `Console cleared. SigitOS ML Engine online. Type or ask anything.`
          : `Console dibersihkan. Machine Learning Engine aktif. Silakan ketik perintah atau pertanyaan.`
      ]);
      setCommandInput("");
      return;
    }

    if (cmd === "help") {
      newLogs.push(
        language === "en" ? "SYSTEM COMMANDS & ML QUERIES:" : "PERINTAH SISTEM & QUERY ML:",
        "  skills     - Tampilkan daftar teknologi & keahlian teknis",
        "  projects   - Lompat ke katalog proyek pilihan",
        "  services   - Lihat layanan pengembangan web & otomasi",
        "  contact    - Hubungi langsung via email & form mailer",
        "  ai         - Spesifikasi engine machine learning in-browser",
        "  clear      - Bersihkan riwayat tampilan terminal",
        "  reboot     - Reset dan restart kernel terminal",
        "  * ATAU ketik bebas pertanyaan (cth: 'siapa sigit', 'buat web apa saja', 'biaya hire', dll)"
      );
      setLogs(newLogs);
      setCommandInput("");
      return;
    }

    if (cmd === "projects" || cmd === "proyek") {
      newLogs.push(language === "en" ? "NAV: Navigating to Projects window..." : "NAV: Membuka jendela Proyek...");
      const el = document.getElementById("proyek");
      el?.scrollIntoView({ behavior: "smooth" });
      setLogs(newLogs);
      setCommandInput("");
      return;
    }

    if (cmd === "contact" || cmd === "kontak") {
      newLogs.push(language === "en" ? "NAV: Navigating to Contact window..." : "NAV: Membuka jendela Kontak...");
      const el = document.getElementById("kontak");
      el?.scrollIntoView({ behavior: "smooth" });
      setLogs(newLogs);
      setCommandInput("");
      return;
    }

    if (cmd === "reboot") {
      handleResetLogs();
      return;
    }

    // Machine Learning / NLP Inference execution
    setIsInferencing(true);
    newLogs.push("AI: [Neural Engine inferencing query...]");
    setLogs(newLogs);

    setTimeout(() => {
      const result = queryAIEngine(raw, language);
      const outputLines = result.text.split("\n");
      setLogs((prev) => [
        ...prev.filter((l) => !l.includes("[Neural Engine inferencing")),
        `[ML Confidence: ${(result.confidence * 100).toFixed(0)}% | Intent: ${result.intent}]`,
        ...outputLines,
      ]);
      setIsInferencing(false);
    }, 280);

    setCommandInput("");
  };

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeCommandOrQuery(commandInput);
  };

  const handleResetLogs = () => {
    setLogs([
      "SYSTEM REBOOTED...",
      "INIT: SigitOS Kernel v2.6 loaded successfully.",
      "NEURAL: Machine Learning Vector Engine online.",
      language === "en"
        ? "READY: Type 'help' or ask any natural question about Sigit Adi."
        : "READY: Ketik 'help' atau tanyakan apa saja seputar Sigit Adi & MyWebPorto.",
    ]);
  };

  const suggestions = [
    "help",
    "skills",
    "proyek",
    "siapa sigit adi?",
    "layanan apa saja?",
    "konsep mywebporto",
  ];

  return (
    <div className="vt-crt-panel rounded-xs text-xs">
      {/* Terminal Top Bar */}
      <div className="flex items-center justify-between border-b border-[#37ff9b]/30 pb-2 mb-3 text-[11px] font-mono">
        <div className="flex items-center gap-2">
          <TerminalIcon className="h-3.5 w-3.5 text-[#37ff9b]" />
          <span className="font-bold tracking-wider text-[#37ff9b] flex items-center gap-1.5">
            CRT TERMINAL MONITOR // ML ENGINE v2.6
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-emerald-950/80 text-[9px] text-emerald-400 border border-emerald-500/40 rounded-xs">
              <Sparkles className="h-2.5 w-2.5 text-amber-300" />
              NEURAL READY
            </span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-[#37ff9b]/70 font-pixel">9600 BAUD</span>
          <button
            type="button"
            onClick={handleResetLogs}
            className="hover:text-white transition-colors flex items-center gap-1 text-[10px] cursor-pointer"
            title="Reset Terminal"
          >
            <RotateCcw className="h-2.5 w-2.5" />
            <span>RESET</span>
          </button>
        </div>
      </div>

      {/* System Resource Gauges */}
      <div className="grid grid-cols-3 gap-2 mb-3 text-[10px] font-mono text-[#37ff9b]/80">
        <div>
          <div className="flex justify-between mb-0.5">
            <span className="flex items-center gap-1">
              <Cpu className="h-2.5 w-2.5 text-[#37ff9b]" />
              ML INFERENCE
            </span>
            <span>{isInferencing ? "100%" : "3%"}</span>
          </div>
          <div className="vt-crt-bar">
            <div
              className={`vt-crt-fill transition-all duration-300 ${
                isInferencing ? "w-[100%] bg-amber-400" : "w-[3%]"
              }`}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between mb-0.5">
            <span>RAM (64MB)</span>
            <span>OK (42MB)</span>
          </div>
          <div className="vt-crt-bar">
            <div className="vt-crt-fill w-[65%]" />
          </div>
        </div>
        <div>
          <div className="flex justify-between mb-0.5">
            <span>DB PING</span>
            <span>12ms [ONLINE]</span>
          </div>
          <div className="vt-crt-bar">
            <div className="vt-crt-fill w-[25%]" />
          </div>
        </div>
      </div>

      {/* Quick Prompt Suggestion Chips */}
      <div className="flex flex-wrap items-center gap-1.5 mb-2.5 pt-1 text-[10px] font-mono">
        <span className="text-[#37ff9b]/70 select-none text-[9px] uppercase">Quick Query:</span>
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => executeCommandOrQuery(s)}
            className="px-2 py-0.5 bg-[#032614] border border-[#10b981]/50 text-[#34d399] hover:bg-[#10b981] hover:text-black rounded-xs transition-colors cursor-pointer"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Streaming Log Area */}
      <div className="h-64 sm:h-72 overflow-y-auto space-y-1 font-mono text-[11px] leading-relaxed pr-1 border-t border-b border-[#37ff9b]/20 py-2 scrollbar-thin">
        {logs.map((log, i) => (
          <div
            key={i}
            className={`flex items-start gap-1.5 ${
              log.startsWith(">")
                ? "text-white font-bold"
                : log.includes("[ML Confidence")
                ? "text-amber-300 font-semibold"
                : log.includes("[OK]") || log.includes("[ONLINE]")
                ? "text-[#37ff9b]"
                : log.includes("AUTH") || log.includes("NEURAL")
                ? "text-[#ffd400]"
                : "text-[#37ff9b]/90"
            }`}
          >
            <span className="opacity-50 select-none shrink-0">&gt;</span>
            <span className="break-words whitespace-pre-wrap">{log}</span>
          </div>
        ))}
        <div ref={logEndRef} />
      </div>

      {/* Interactive Command Prompt */}
      <form onSubmit={handleCommandSubmit} className="mt-3 flex items-center gap-2">
        <span className="text-[#37ff9b] font-bold select-none font-mono shrink-0">
          sigitos-ml:~#
        </span>
        <input
          type="text"
          value={commandInput}
          onChange={(e) => setCommandInput(e.target.value)}
          placeholder={
            language === "en"
              ? "Ask anything (e.g., 'who is sigit?', 'tech stack', 'services', 'projects')..."
              : "Tanyakan apa saja (cth: 'siapa sigit?', 'keahlian', 'layanan', 'proyek')..."
          }
          className="flex-1 bg-transparent border-0 outline-none text-[#37ff9b] font-mono text-xs placeholder:text-[#37ff9b]/40 focus:ring-0 p-0"
        />
        <button
          type="submit"
          className="vt-btn vt-btn-chrome px-3 py-1 text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer"
        >
          <Play className="h-2.5 w-2.5 text-primary" />
          <span>RUN</span>
        </button>
      </form>
    </div>
  );
}
