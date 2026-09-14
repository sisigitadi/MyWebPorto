"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Terminal as TerminalIcon,
  RotateCcw,
  Cpu,
  Sparkles,
  Bot,
  CornerDownLeft,
  Copy,
  Mic,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { queryAIEngine } from "@/lib/ai-engine";
import { askSigitBot, getCloudAIStatus } from "@/lib/actions";
import { useOSTheme, OSTheme } from "./theme-context";
import { ProfileData, ServiceData, ProjectData, ArticleData } from "@/lib/dummy-data";
import { buildSocialLinks } from "@/components/public/social-icons";

interface OSCrtTerminalProps {
  ownerName: string;
  profile: ProfileData;
  services: ServiceData[];
  projects: ProjectData[];
  articles: ArticleData[];
}

// Minimal Web Speech API typing (tanpa dep tambahan)
interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { results?: { 0?: { 0?: { transcript?: string } } } }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

const APP_ALIASES: Record<string, string> = {
  profil: "profil",
  profile: "profil",
  hero: "profil",
  about: "profil",
  layanan: "layanan",
  services: "layanan",
  proyek: "proyek",
  projects: "proyek",
  toko: "toko",
  store: "toko",
  produk: "toko",
  products: "toko",
  testimoni: "testimoni",
  testimonials: "testimoni",
  reviews: "testimoni",
  artikel: "artikel",
  articles: "artikel",
  blog: "artikel",
  kontak: "kontak",
  contact: "kontak",
  terminal: "terminal",
};

const THEME_ALIASES: Record<string, OSTheme> = {
  retro: "retro90s",
  retro90s: "retro90s",
  "90s": "retro90s",
  dark: "dark",
  cyber: "dark",
  tokyo: "tokyo",
  neon: "tokyo",
  vscode: "vscode",
  code: "vscode",
};

function switchApp(appId: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("switch-os-app", { detail: appId }));
  }
}

export function OSCrtTerminal({
  ownerName,
  profile,
  services,
  projects,
  articles,
}: OSCrtTerminalProps) {
  const { language, setLanguage } = useTranslation();
  const { setTheme } = useOSTheme();
  const [logs, setLogs] = useState<string[]>([
    "BIOS-ROM v4.51 (C) 1998-2026 SIGIT CORP.",
    "CPU: AMD Ryzen 64-Bit System Architecture | RAM: 65536KB OK",
    "INIT: Loading SigitOS Machine Learning Subsystem [ONLINE]",
    "SYSTEM: Sigit_Bot.ai Neural Assistant v2.6 initialized.",
    "NEURAL: Client-side NLP & Intent Vector Engine loaded (TF-IDF)",
    "STACK: Next.js 15.5 + React 19 + TypeScript + Neon PostgreSQL",
    `AUTH: Developer session verified for '${ownerName}'`,
    language === "en"
      ? "STATUS: Sigit_Bot is ready! Type 'help' for commands, or chat naturally with Sigit_Bot."
      : "STATUS: Sigit_Bot siap! Ketik 'help' untuk daftar perintah, atau tanyakan apa saja seputar Sigit Adi.",
  ]);
  const [commandInput, setCommandInput] = useState("");
  const [isInferencing, setIsInferencing] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [copied, setCopied] = useState(false);
  const [cloudOn, setCloudOn] = useState(false);
  const [ttsOn, setTtsOn] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Tanyakan sekali apakah cloud AI opt-in aktif (default OFF).
  useEffect(() => {
    let cancelled = false;
    getCloudAIStatus()
      .then((s) => {
        if (!cancelled) setCloudOn(s.enabled);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const speak = (text: string) => {
    try {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text.replace(/\n+/g, ". ").slice(0, 500));
      utter.lang = language === "en" ? "en-US" : "id-ID";
      window.speechSynthesis.speak(utter);
    } catch {
      // TTS opsional — abaikan bila diblokir browser
    }
  };

  const stopSpeaking = () => {
    try {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    } catch {
      // abaikan
    }
  };

  const speechSupported =
    typeof window !== "undefined" &&
    Boolean(
      (window as unknown as { SpeechRecognition?: SpeechRecognitionCtor }).SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionCtor }).webkitSpeechRecognition
    );

  const toggleMic = () => {
    if (!speechSupported) return;
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const w = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    recognitionRef.current = rec;
    rec.lang = language === "en" ? "en-US" : "id-ID";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const transcript = e.results?.[0]?.[0]?.transcript || "";
      if (transcript.trim()) {
        setCommandInput(transcript.trim());
        executeCommandOrQuery(transcript.trim());
      }
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  };

  const appendLogs = (lines: string[]) => setLogs((prev) => [...prev, ...lines]);

  const clearConsole = () => {
    setLogs([
      language === "en"
        ? "Console cleared. Sigit_Bot Neural Engine online."
        : "Console dibersihkan. Sigit_Bot Neural Engine aktif.",
    ]);
    setCommandInput("");
  };

  const listSkills = () => {
    const skills = profile.skills?.length ? profile.skills : ["Full-Stack Web Development"];
    return [
      language === "en" ? "TECHNICAL SKILLS (live from profile):" : "KEAHLIAN TEKNIS (dari profil):",
      ...skills.map((s, i) => `  [${String(i + 1).padStart(2, "0")}] ${s}`),
      language === "en"
        ? "Manage skills via Admin -> Profile -> Keahlian."
        : "Kelola keahlian lewat Admin -> Profil -> Keahlian.",
    ];
  };

  const listContact = () => {
    const socials = buildSocialLinks(profile);
    return [
      language === "en" ? "CONTACT CHANNELS:" : "SALURAN KONTAK:",
      `  Email: ${profile.email || "-"}`,
      `  Phone/WhatsApp: ${profile.phone || "-"}`,
      `  Location: ${profile.location || "-"}`,
      ...(socials.length
        ? socials.map((s) => `  ${s.label}: ${s.href}`)
        : [language === "en" ? "  (no social links configured)" : "  (belum ada tautan sosial)"]),
    ];
  };

  const listProjects = () => {
    const published = projects.filter((p) => p.published);
    return [
      language === "en" ? "FEATURED PROJECTS (live):" : "PROYEK (dari data):",
      ...published.slice(0, 6).map((p, i) => `  [${i + 1}] ${p.title} -> /proyek/${p.slug}`),
      language === "en" ? "Opening Projects window..." : "Membuka jendela Proyek...",
    ];
  };

  const listServices = () => {
    const published = services.filter((s) => s.published !== false);
    return [
      language === "en" ? "SERVICES (live):" : "LAYANAN (dari data):",
      ...published.map((s, i) => `  [${i + 1}] ${s.title}`),
      language === "en" ? "Opening Services window..." : "Membuka jendela Layanan...",
    ];
  };

  const showNeofetch = () => {
    return [
      `${profile.name}@sigitos`,
      "-------------------",
      `OS: SigitOS Retro v2.6 (Next.js 15.5)`,
      `Host: ${profile.location || "Indonesia"}`,
      `Kernel: React 19 + TypeScript`,
      `Uptime: always online`,
      `Shell: Sigit_Bot.ai (client-side NLP)`,
      `Skills: ${profile.skills?.length ?? 0} items`,
      `Projects: ${projects.filter((p) => p.published).length}`,
      `Articles: ${articles.filter((a) => a.published).length}`,
      `Theme: ${typeof window !== "undefined" ? "active" : "-"}`,
    ];
  };

  const showHelp = (topic?: string) => {
    if (topic) {
      const map: Record<string, string> = {
        skills: "skills  - Tampilkan daftar keahlian dari profil",
        projects: "projects - Buka katalog proyek",
        services: "services - Buka daftar layanan",
        contact: "contact - Tampilkan & buka saluran kontak",
        open: "open <app> - Buka aplikasi (profil, proyek, toko, dll)",
        theme: "theme <retro|dark|tokyo|vscode|random> - Ganti tema",
        lang: "lang <id|en> - Ganti bahasa",
        cv: "cv      - Buka CV pemilik",
        github: "github  - Buka GitHub pemilik",
        email: "email   - Tampilkan & tulis email",
      };
      const found = Object.entries(map).find(([k]) => topic === k);
      if (found) return [found[1]];
      return [language === "en" ? `No help entry for '${topic}'.` : `Tidak ada bantuan untuk '${topic}'.`];
    }

    return [
      language === "en" ? "SYSTEM COMMANDS & SIGIT_BOT QUERIES:" : "PERINTAH SISTEM & QUERY SIGIT_BOT:",
      "  help [cmd]  - Bantuan perintah",
      "  whoami      - Info pemilik",
      "  date        - Tanggal & waktu sekarang",
      "  echo <txt>  - Cetak teks",
      "  pwd         - Direktori saat ini",
      "  ls / dir    - Daftar aplikasi",
      "  skills      - Keahlian teknis (live)",
      "  projects    - Buka katalog proyek",
      "  services    - Buka layanan",
      "  articles    - Buka artikel",
      "  contact     - Saluran kontak",
      "  cv          - Buka CV pemilik",
      "  github      - Buka GitHub pemilik",
      "  email       - Tulis email ke pemilik",
      "  open <app>  - Buka aplikasi desktop",
      "  theme <t>   - Ganti tema OS (random tersedia)",
      "  lang <id|en> - Ganti bahasa",
      "  neofetch    - Info sistem",
      "  history     - Riwayat perintah",
      "  clear       - Bersihkan layar",
      "  reboot      - Restart kernel",
      "  * Atau ketik bebas pertanyaan ke Sigit_Bot (cth: 'siapa sigit', 'biaya hire')",
    ];
  };

  const executeCommandOrQuery = (inputStr: string) => {
    const raw = inputStr.trim();
    if (!raw) return;

    const newLogs = [`> ${raw}`];
    const [head, ...rest] = raw.split(/\s+/);
    const command = head.toLowerCase();
    const arg = rest.join(" ");

    setHistory((prev) => [raw, ...prev].slice(0, 30));
    setHistoryIndex(-1);

    if (command === "clear" || command === "cls") {
      clearConsole();
      return;
    }

    if (command === "reboot") {
      sessionStorage.removeItem("sigitos_booted_session");
      window.location.reload();
      return;
    }

    if (command === "help") {
      appendLogs([...newLogs, ...showHelp(arg.trim() || undefined)]);
      setCommandInput("");
      return;
    }

    if (command === "whoami") {
      appendLogs([...newLogs, `${profile.name} - ${profile.headline}`]);
      setCommandInput("");
      return;
    }

    if (command === "date" || command === "time") {
      appendLogs([...newLogs, new Date().toLocaleString(language === "en" ? "en-US" : "id-ID")]);
      setCommandInput("");
      return;
    }

    if (command === "echo") {
      appendLogs([...newLogs, arg || ""]);
      setCommandInput("");
      return;
    }

    if (command === "pwd") {
      appendLogs([...newLogs, "C:\\Sigit\\Terminal"]);
      setCommandInput("");
      return;
    }

    if (command === "ls" || command === "dir") {
      appendLogs([
        ...newLogs,
        "profil.exe  layanan.exe  proyek.exe  toko.zip",
        "testimoni.txt  artikel.doc  kontak.exe  terminal.bat",
      ]);
      setCommandInput("");
      return;
    }

    if (command === "open") {
      const appId = APP_ALIASES[arg.toLowerCase()];
      if (appId) {
        switchApp(appId);
        appendLogs([...newLogs, language === "en" ? `Opening ${appId}...` : `Membuka ${appId}...`]);
      } else {
        appendLogs([...newLogs, language === "en" ? `Unknown app: ${arg}` : `Aplikasi tidak dikenal: ${arg}`]);
      }
      setCommandInput("");
      return;
    }

    if (command === "skills" || command === "stack") {
      appendLogs([...newLogs, ...listSkills()]);
      setCommandInput("");
      return;
    }

    if (command === "projects" || command === "proyek") {
      appendLogs([...newLogs, ...listProjects()]);
      switchApp("proyek");
      setCommandInput("");
      return;
    }

    if (command === "services" || command === "layanan") {
      appendLogs([...newLogs, ...listServices()]);
      switchApp("layanan");
      setCommandInput("");
      return;
    }

    if (command === "articles" || command === "artikel") {
      appendLogs([...newLogs, language === "en" ? "Opening Articles..." : "Membuka Artikel..."]);
      switchApp("artikel");
      setCommandInput("");
      return;
    }

    if (command === "contact" || command === "kontak") {
      appendLogs([...newLogs, ...listContact(), language === "en" ? "Opening Contact..." : "Membuka Kontak..."]);
      switchApp("kontak");
      setCommandInput("");
      return;
    }

    if (command === "theme") {
      const argLower = arg.toLowerCase();
      if (argLower === "random" || argLower === "acak") {
        const pool: OSTheme[] = ["retro90s", "dark", "tokyo", "vscode"];
        const picked = pool[Math.floor(Math.random() * pool.length)];
        setTheme(picked);
        appendLogs([...newLogs, `Theme -> ${picked} (random)`]);
        setCommandInput("");
        return;
      }
      const theme = THEME_ALIASES[argLower];
      if (theme) {
        setTheme(theme);
        appendLogs([...newLogs, `Theme -> ${theme}`]);
      } else {
        appendLogs([...newLogs, "Usage: theme <retro90s|dark|tokyo|vscode>"]);
      }
      setCommandInput("");
      return;
    }

    if (command === "lang") {
      const next = arg.toLowerCase() === "en" ? "en" : arg.toLowerCase() === "id" ? "id" : language;
      if (next === language) {
        appendLogs([...newLogs, `Language is already ${next.toUpperCase()}`]);
      } else {
        setLanguage(next);
        appendLogs([...newLogs, `Language -> ${next.toUpperCase()}`]);
      }
      setCommandInput("");
      return;
    }

    if (command === "cv") {
      if (profile.cvUrl) {
        window.open(profile.cvUrl, "_blank", "noopener,noreferrer");
        appendLogs([...newLogs, `Membuka CV: ${profile.cvUrl}`]);
      } else {
        appendLogs([...newLogs, language === "en" ? "CV not available yet." : "CV belum tersedia."]);
      }
      setCommandInput("");
      return;
    }

    if (command === "github" || command === "gh") {
      const gh = buildSocialLinks(profile).find((s) => s.key === "github");
      if (gh) {
        window.open(gh.href, "_blank", "noopener,noreferrer");
        appendLogs([...newLogs, `Membuka GitHub: ${gh.href}`]);
      } else {
        appendLogs([...newLogs, language === "en" ? "GitHub link not configured." : "Tautan GitHub belum dikonfigurasi."]);
      }
      setCommandInput("");
      return;
    }

    if (command === "email" || command === "mail") {
      if (profile.email) {
        appendLogs([...newLogs, `Email: ${profile.email}`, language === "en" ? "Opening mail app..." : "Membuka aplikasi email..."]);
        window.location.href = `mailto:${profile.email}`;
      } else {
        appendLogs([...newLogs, language === "en" ? "Email not configured." : "Email belum dikonfigurasi."]);
      }
      setCommandInput("");
      return;
    }

    if (command === "neofetch" || command === "sysinfo") {
      appendLogs([...newLogs, ...showNeofetch()]);
      setCommandInput("");
      return;
    }

    if (command === "history") {
      appendLogs([...newLogs, ...history.slice(0, 20).map((h, i) => `  ${i + 1}  ${h}`)]);
      setCommandInput("");
      return;
    }

    // Machine Learning / NLP inference: lokal dulu, cloud bila ragu + opt-in.
    setIsInferencing(true);
    stopSpeaking();
    appendLogs([...newLogs, "SIGIT_BOT: [Inferencing neural weights...]"]);

    setTimeout(async () => {
      const result = queryAIEngine(raw, language);
      if (result.confidence < 0.55 && cloudOn) {
        appendLogs(["SIGIT_BOT: [Consulting cloud model...]"]);
        try {
          const cloud = await askSigitBot(raw, language);
          if (cloud.source === "cloud") {
            const outputLines = cloud.text.split("\n");
            setLogs((prev) => [
              ...prev.filter((l) => !l.includes("[Inferencing neural weights") && !l.includes("[Consulting cloud")),
              `[Sigit_Bot.ai Cloud | Gemini | Intent: ${cloud.intent}]`,
              ...outputLines,
            ]);
            if (ttsOn) speak(cloud.text);
            setIsInferencing(false);
            return;
          }
        } catch {
          // jatuh ke jawaban lokal di bawah
        }
      }
      const outputLines = result.text.split("\n");
      setLogs((prev) => [
        ...prev.filter((l) => !l.includes("[Inferencing neural weights") && !l.includes("[Consulting cloud")),
        `[Sigit_Bot.ai | Confidence: ${(result.confidence * 100).toFixed(0)}% | Intent: ${result.intent}]`,
        ...outputLines,
      ]);
      if (ttsOn) speak(result.text);
      setIsInferencing(false);
    }, 280);

    setCommandInput("");
  };

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeCommandOrQuery(commandInput);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length === 0) return;
      const nextIndex = historyIndex + 1;
      if (nextIndex < history.length) {
        setHistoryIndex(nextIndex);
        setCommandInput(history[nextIndex]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex <= 0) {
        setHistoryIndex(-1);
        setCommandInput("");
      } else {
        const nextIndex = historyIndex - 1;
        setHistoryIndex(nextIndex);
        setCommandInput(history[nextIndex]);
      }
    }
  };

  const handleResetLogs = () => {
    setLogs([
      "SYSTEM REBOOTED...",
      "INIT: SigitOS Kernel v2.6 loaded successfully.",
      "SIGIT_BOT: Neural Engine v2.6 online.",
      language === "en"
        ? "READY: Type 'help' or ask any natural question about Sigit Adi."
        : "READY: Ketik 'help' atau tanyakan apa saja seputar Sigit Adi & MyWebPorto.",
    ]);
  };

  const handleCopy = async () => {
    if (typeof navigator === "undefined") return;
    await navigator.clipboard?.writeText(logs.join("\n")).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const suggestions = ["help", "skills", "proyek", "whoami", "neofetch", "siapa sigit adi?"];

  return (
    <div className="vt-crt-panel rounded-xs text-xs">
      {/* Terminal Top Bar */}
      <div className="flex items-center justify-between border-b border-[#37ff9b]/30 pb-2 mb-3 text-[11px] font-mono">
        <div className="flex items-center gap-2">
          <TerminalIcon className="h-3.5 w-3.5 text-[#37ff9b]" />
          <span className="font-bold tracking-wider text-[#37ff9b] flex items-center gap-1.5 flex-wrap">
            <span>CRT TERMINAL // SIGIT_BOT.AI MONITOR</span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-950/90 text-[9px] text-emerald-400 border border-emerald-500/40 rounded-xs">
              <Bot className="h-2.5 w-2.5 text-sky-400" />
              SIGIT_BOT ONLINE
            </span>
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-950/80 text-[9px] text-emerald-400 border border-emerald-500/40 rounded-xs">
              <Sparkles className="h-2.5 w-2.5 text-amber-300" />
              NEURAL READY
            </span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-[#37ff9b]/70 font-pixel hidden sm:inline">9600 BAUD</span>
          <button
            type="button"
            onClick={handleCopy}
            className="hover:text-white transition-colors flex items-center gap-1 text-[10px] cursor-pointer"
            title="Copy output"
          >
            <Copy className="h-2.5 w-2.5" />
            <span>{copied ? "COPIED" : "COPY"}</span>
          </button>
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
              SIGIT_BOT NLP
            </span>
            <span>{isInferencing ? "100%" : "3%"}</span>
          </div>
          <div className="vt-crt-bar">
            <div className={`vt-crt-fill transition-all duration-300 ${isInferencing ? "w-[100%] bg-amber-400" : "w-[3%]"}`} />
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
        <span className="text-[#37ff9b]/70 select-none text-[9px] uppercase">Ask Sigit_Bot:</span>
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
                : log.includes("[Sigit_Bot.ai")
                ? "text-amber-300 font-semibold"
                : log.includes("[OK]") || log.includes("[ONLINE]")
                ? "text-[#37ff9b]"
                : log.includes("AUTH") || log.includes("NEURAL") || log.includes("SIGIT_BOT")
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
        <span className="text-[#37ff9b] font-bold select-none font-mono shrink-0 flex items-center gap-1">
          <Bot className="h-3 w-3 text-sky-400" />
          <span>sigit_bot:~#</span>
        </span>
        <input
          type="text"
          value={commandInput}
          onChange={(e) => setCommandInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={language === "en" ? "Type 'help' or ask anything..." : "Ketik 'help' atau tanyakan apa saja..."}
          className="flex-1 bg-transparent border-0 outline-none text-[#37ff9b] font-mono text-xs placeholder:text-[#37ff9b]/40 focus:ring-0 p-0 min-w-0"
        />
        {speechSupported && (
          <button
            type="button"
            onClick={toggleMic}
            className={`shrink-0 p-1.5 rounded-xs border transition-colors cursor-pointer ${
              listening
                ? "bg-red-500/20 border-red-500 text-red-400 animate-pulse"
                : "border-[#37ff9b]/30 text-[#37ff9b]/70 hover:text-[#37ff9b]"
            }`}
            title={language === "en" ? "Voice input" : "Input suara"}
            aria-label={language === "en" ? "Voice input" : "Input suara"}
          >
            <Mic className="h-3 w-3" />
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            if (ttsOn) stopSpeaking();
            setTtsOn((v) => !v);
          }}
          className={`shrink-0 p-1.5 rounded-xs border transition-colors cursor-pointer ${
            ttsOn
              ? "border-sky-400/60 text-sky-300"
              : "border-[#37ff9b]/30 text-[#37ff9b]/70 hover:text-[#37ff9b]"
          }`}
          title={language === "en" ? "Read answers aloud" : "Bacakan jawaban"}
          aria-label={language === "en" ? "Read answers aloud" : "Bacakan jawaban"}
          aria-pressed={ttsOn}
        >
          {ttsOn ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
        </button>
        <button
          type="submit"
          className="vt-btn vt-btn-chrome px-3 py-1 text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer"
        >
          <CornerDownLeft className="h-2.5 w-2.5 text-primary" />
          <span>ENTER</span>
        </button>
      </form>
    </div>
  );
}
