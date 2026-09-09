"use client";

import React, { useState, useEffect, useRef } from "react";
import { Terminal as TerminalIcon, Play, RotateCcw } from "lucide-react";

interface OSCrtTerminalProps {
  ownerName: string;
}

export function OSCrtTerminal({ ownerName }: OSCrtTerminalProps) {
  const [logs, setLogs] = useState<string[]>([
    "BIOS-ROM v4.19 (C) 1998-2026 SIGIT CORP.",
    "CPU: AMD 64-Bit Core @ 4.80GHz | RAM: 32768MB OK",
    "INIT: Loading SigitOS System Architecture...",
    "NET: Neon PostgreSQL Serverless DB Connected [ONLINE]",
    "STACK: Next.js 15.5 + React 19 + TypeScript + GSAP",
    `AUTH: Developer profile authenticated as '${ownerName}'`,
    "STATUS: Ready to engineer modern high-speed systems.",
  ]);
  const [commandInput, setCommandInput] = useState("");
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = commandInput.trim().toLowerCase();
    if (!cmd) return;

    const newLogs = [...logs, `> ${commandInput}`];

    if (cmd === "help") {
      newLogs.push(
        "AVAILABLE COMMANDS:",
        "  skills   - Tampilkan daftar keahlian teknologi",
        "  projects - Buka katalog proyek unggulan",
        "  contact  - Kirim pesan ke Sigit",
        "  clear    - Bersihkan layar terminal",
        "  about    - Ringkasan profil pengembang"
      );
    } else if (cmd === "skills") {
      newLogs.push(
        "STACK: Next.js 15, React 19, TypeScript, Tailwind CSS, PostgreSQL, Drizzle ORM, GSAP, Node.js"
      );
    } else if (cmd === "projects") {
      newLogs.push("NAV: Menavigasikan ke #proyek...");
      const el = document.getElementById("proyek");
      el?.scrollIntoView({ behavior: "smooth" });
    } else if (cmd === "contact") {
      newLogs.push("NAV: Menavigasikan ke #kontak...");
      const el = document.getElementById("kontak");
      el?.scrollIntoView({ behavior: "smooth" });
    } else if (cmd === "clear") {
      setLogs([`Console cleared by ${ownerName}. Ketik 'help' untuk daftar perintah.`]);
      setCommandInput("");
      return;
    } else if (cmd === "about") {
      newLogs.push(
        `${ownerName} adalah Web Developer & Systems Architect yang berfokus pada kecepatan, estetika, dan keandalan sistem.`
      );
    } else {
      newLogs.push(`Command not recognized: '${cmd}'. Ketik 'help' untuk panduan.`);
    }

    setLogs(newLogs);
    setCommandInput("");
  };

  const handleResetLogs = () => {
    setLogs([
      "SYSTEM REBOOTED...",
      "INIT: SigitOS Kernel v2.5 loaded successfully.",
      "READY: Ketik 'help' untuk melihat daftar perintah.",
    ]);
  };

  return (
    <div className="vt-crt-panel rounded-xs text-xs">
      {/* Terminal Top Bar */}
      <div className="flex items-center justify-between border-b border-[#37ff9b]/30 pb-2 mb-3 text-[11px] font-mono">
        <div className="flex items-center gap-2">
          <TerminalIcon className="h-3.5 w-3.5 text-[#37ff9b]" />
          <span className="font-bold tracking-wider text-[#37ff9b]">
            CRT TERMINAL MONITOR // TTY-1
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-[#37ff9b]/70 font-pixel">9600 BAUD</span>
          <button
            type="button"
            onClick={handleResetLogs}
            className="hover:text-white transition-colors flex items-center gap-1 text-[10px]"
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
            <span>CPU</span>
            <span>98%</span>
          </div>
          <div className="vt-crt-bar">
            <div className="vt-crt-fill w-[98%]" />
          </div>
        </div>
        <div>
          <div className="flex justify-between mb-0.5">
            <span>RAM</span>
            <span>64MB</span>
          </div>
          <div className="vt-crt-bar">
            <div className="vt-crt-fill w-[72%]" />
          </div>
        </div>
        <div>
          <div className="flex justify-between mb-0.5">
            <span>DB PING</span>
            <span>18ms</span>
          </div>
          <div className="vt-crt-bar">
            <div className="vt-crt-fill w-[30%]" />
          </div>
        </div>
      </div>

      {/* Streaming Log Area */}
      <div className="h-44 overflow-y-auto space-y-1 font-mono text-[11px] leading-relaxed pr-1 border-t border-b border-[#37ff9b]/20 py-2 scrollbar-thin">
        {logs.map((log, i) => (
          <div
            key={i}
            className={`flex items-start gap-1.5 ${
              log.startsWith(">")
                ? "text-white font-bold"
                : log.includes("[OK]") || log.includes("[ONLINE]")
                ? "text-[#37ff9b]"
                : log.includes("AUTH")
                ? "text-[#ffd400]"
                : "text-[#37ff9b]/90"
            }`}
          >
            <span className="opacity-50 select-none">&gt;</span>
            <span className="break-all">{log}</span>
          </div>
        ))}
        <div ref={logEndRef} />
      </div>

      {/* Interactive Command Prompt */}
      <form onSubmit={handleCommandSubmit} className="mt-3 flex items-center gap-2">
        <span className="text-[#37ff9b] font-bold select-none font-mono">root@sigitos:~#</span>
        <input
          type="text"
          value={commandInput}
          onChange={(e) => setCommandInput(e.target.value)}
          placeholder="ketik 'help' atau 'projects' lalu Enter..."
          className="flex-1 bg-transparent border-0 outline-none text-[#37ff9b] font-mono text-xs placeholder:text-[#37ff9b]/40 focus:ring-0 p-0"
        />
        <button
          type="submit"
          className="vt-btn vt-btn-chrome px-2 py-0.5 text-[10px] font-mono"
        >
          <Play className="h-2.5 w-2.5 text-primary" />
          <span>RUN</span>
        </button>
      </form>
    </div>
  );
}
