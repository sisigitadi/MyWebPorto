"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
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
  Share2,
} from "lucide-react";
import { ContentShareModal } from "@/components/public/content-share-modal";
import { useTranslation } from "@/lib/i18n";
import { queryAIEngine, detectLanguage, type EngineContext } from "@/lib/ai-engine";
import { askSigitBot, getCloudAIStatus } from "@/lib/actions";
import { getProviderShortLabel } from "@/lib/ai-providers";
import { useOSTheme, OSTheme } from "./theme-context";
import { playOS } from "@/lib/os-sound";
import { ProfileData, ServiceData, ProjectData, ArticleData } from "@/lib/dummy-data";
import { buildSocialLinks } from "@/components/public/social-icons";
import { MiniMarkdownInline } from "@/components/public/mini-markdown";
import { cleanTextForTTS } from "@/lib/tts-sanitizer";

interface OSCrtTerminalProps {
  ownerName: string;
  profile: ProfileData;
  services: ServiceData[];
  projects: ProjectData[];
  articles: ArticleData[];
  /**
   * Mode layar penuh: terminal memenuhi seluruh area jendela OS tanpa
   * chrome (titlebar/padding/bottom nav). Area log meregang memakai sisa
   * ruang vertikal, bukan tinggi tetap.
   */
  fullscreen?: boolean;
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

const ALL_COMMANDS = [
  "help",
  "man",
  "whoami",
  "date",
  "time",
  "echo",
  "pwd",
  "ls",
  "dir",
  "cat",
  "type",
  "cd",
  "skills",
  "stack",
  "projects",
  "proyek",
  "services",
  "layanan",
  "articles",
  "artikel",
  "contact",
  "kontak",
  "theme",
  "lang",
  "cv",
  "github",
  "gh",
  "email",
  "mail",
  "neofetch",
  "sysinfo",
  "history",
  "clear",
  "cls",
  "reboot",
  "restart",
  "share",
  "bagikan",
  "open",
  "uname",
  "sudo",
  "exit",
  "quit",
  "uptime",
  "top",
  "htop",
  "ping",
  "curl",
  "cowsay",
  "matrix",
];

const VIRTUAL_FILES = [
  "readme.txt",
  "profil.txt",
  "skills.txt",
  "proyek.txt",
  "layanan.txt",
  "kontak.txt",
];

const APP_NAMES = [
  "profil",
  "layanan",
  "proyek",
  "toko",
  "testimoni",
  "artikel",
  "kontak",
  "terminal",
];

const THEME_NAMES = ["retro90s", "dark", "tokyo", "vscode", "random"];

/**
 * Penanda baris placeholder ("sedang memproses..."). Memakai zero-width space
 * (U+200B) bukan teks, karena teksnya diterjemahkan — menyaring berdasarkan
 * string ID/EN akan pecah saat bahasa diganti. Penanda ini stabil.
 */
const PLACEHOLDER_MARK = "​";
const isPlaceholderLine = (line: string) => line.includes(PLACEHOLDER_MARK);
const markPlaceholder = (line: string) => `${line}${PLACEHOLDER_MARK}`;

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
  fullscreen = false,
}: OSCrtTerminalProps) {
  const { t, language, setLanguage } = useTranslation();
  const { setTheme } = useOSTheme();
  const [logs, setLogs] = useState<string[]>([
    t.terminal_log_bios,
    t.terminal_log_cpu,
    t.terminal_log_init,
    t.terminal_log_system,
    t.terminal_log_neural,
    t.terminal_log_stack,
    t.terminal_log_auth.replace("{owner}", ownerName),
    t.terminal_status_boot,
  ]);

  const prevBootLogsRef = useRef<string[] | null>(null);
  useEffect(() => {
    const bootLogs = [
      t.terminal_log_bios,
      t.terminal_log_cpu,
      t.terminal_log_init,
      t.terminal_log_system,
      t.terminal_log_neural,
      t.terminal_log_stack,
      t.terminal_log_auth.replace("{owner}", ownerName),
      t.terminal_status_boot,
    ];
    const prev = prevBootLogsRef.current;
    prevBootLogsRef.current = bootLogs;
    if (!prev || prev.length !== bootLogs.length) return;
    const translate = new Map<string, string>();
    let changed = false;
    for (let i = 0; i < bootLogs.length; i++) {
      if (prev[i] !== bootLogs[i]) {
        translate.set(prev[i], bootLogs[i]);
        changed = true;
      }
    }
    if (!changed) return;
    setLogs((prevLogs) =>
      prevLogs.map((line) => {
        if (isPlaceholderLine(line)) return line;
        return translate.has(line) ? (translate.get(line) as string) : line;
      })
    );
  }, [t, ownerName]);

  const [commandInput, setCommandInput] = useState("");
  const [isInferencing, setIsInferencing] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [copied, setCopied] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [cloudOn, setCloudOn] = useState(false);
  const [cloudProviderLabel, setCloudProviderLabel] = useState("");
  const [ttsOn, setTtsOn] = useState(true);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const terminalBodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const languageRef = useRef(language);
  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    const load = () => {
      const list = synth.getVoices();
      if (list.length) voicesRef.current = list;
    };
    load();
    synth.addEventListener?.("voiceschanged", load);
    return () => {
      synth.removeEventListener?.("voiceschanged", load);
    };
  }, []);

  const aiContext = useMemo<EngineContext>(
    () => ({
      ownerName: profile.name,
      headline: profile.headline,
      headlineEn: profile.headlineEn,
      bio: profile.bio,
      bioEn: profile.bioEn,
      location: profile.location,
      email: profile.email,
      phone: profile.phone,
      availableForHire: profile.availableForHire,
      skills: profile.skills || [],
      socialLinks: profile.socialLinks,
      services: services
        .filter((s) => s.published !== false)
        .map((s) => (language === "en" ? s.titleEn || s.title : s.title)),
      servicesEn: services
        .filter((s) => s.published !== false)
        .map((s) => s.titleEn || s.title),
      projects: projects
        .filter((p) => p.published)
        .slice(0, 8)
        .map((p) => ({
          title: language === "en" ? p.titleEn || p.title : p.title,
          titleEn: p.titleEn,
          slug: p.slug,
        })),
      articles: articles
        .filter((a) => a.published)
        .slice(0, 8)
        .map((a) => ({
          title: language === "en" ? a.titleEn || a.title : a.title,
          titleEn: a.titleEn,
          slug: a.slug,
        })),
    }),
    [profile, services, projects, articles, language],
  );

  const querySeqRef = useRef(0);
  const inferOwnerRef = useRef(0);
  const inferTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (inferTimeoutRef.current) clearTimeout(inferTimeoutRef.current);
  }, []);

  // Auto-scroll ke baris prompt terakhir
  useEffect(() => {
    const box = logEndRef.current?.parentElement;
    if (box) box.scrollTop = box.scrollHeight;
  }, [logs]);

  useEffect(() => {
    let cancelled = false;
    getCloudAIStatus()
      .then((s) => {
        if (!cancelled) {
          setCloudOn(s.enabled);
          setCloudProviderLabel(getProviderShortLabel(s.provider));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const speak = (text: string) => {
    try {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      const synth = window.speechSynthesis;
      synth.cancel();

      const detected = detectLanguage(text, languageRef.current);
      const targetLang = detected === "en" ? "en-US" : "id-ID";
      const langPrefix = targetLang.slice(0, 2).toLowerCase();
      const pickVoice = (): SpeechSynthesisVoice | null => {
        const voices = voicesRef.current.length ? voicesRef.current : synth.getVoices();
        if (!voices.length) return null;
        const exact = voices.find(
          (v) => v.lang.replace("_", "-").toLowerCase() === targetLang.toLowerCase()
        );
        if (exact) return exact;
        const prefix = voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix));
        if (prefix) return prefix;
        return null;
      };

      const clean = cleanTextForTTS(text);
      if (!clean) return;

      const chunks = (clean.match(/[^.!?]+[.!?]?/g) ?? [clean])
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 24);

      const voice = pickVoice();
      for (const chunk of chunks) {
        const utter = new SpeechSynthesisUtterance(chunk);
        utter.lang = targetLang;
        if (voice) utter.voice = voice;
        utter.rate = 1;
        utter.pitch = 0.95;
        utter.volume = 1;
        synth.speak(utter);
      }
    } catch {
      // TTS opsional
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
    setLogs([t.terminal_console_cleared]);
    setCommandInput("");
  };

  const listSkills = () => {
    const skills = profile.skills?.length ? profile.skills : ["Full-Stack Web Development"];
    return [
      t.terminal_skills_header,
      ...skills.map((s, i) => `  [${String(i + 1).padStart(2, "0")}] ${s}`),
      t.terminal_skills_manage,
    ];
  };

  const listContact = () => {
    const socials = buildSocialLinks(profile);
    const phoneLabel = language === "en" ? "Phone/WhatsApp" : "Telepon/WhatsApp";
    const locLabel = language === "en" ? "Location" : "Lokasi";
    return [
      t.terminal_contact_header,
      `  Email: ${profile.email || "-"}`,
      `  ${phoneLabel}: ${profile.phone || "-"}`,
      `  ${locLabel}: ${profile.location || "-"}`,
      ...(socials.length
        ? socials.map((s) => `  ${s.label}: ${s.href}`)
        : [t.terminal_contact_none]),
    ];
  };

  const listProjects = () => {
    const published = projects.filter((p) => p.published);
    return [
      t.terminal_projects_header,
      ...published
        .slice(0, 6)
        .map(
          (p, i) =>
            `  [${i + 1}] ${language === "en" ? p.titleEn || p.title : p.title} -> /proyek/${p.slug}`
        ),
      t.terminal_projects_opening,
    ];
  };

  const listServices = () => {
    const published = services.filter((s) => s.published !== false);
    return [
      t.terminal_services_header,
      ...published.map(
        (s, i) =>
          `  [${i + 1}] ${language === "en" ? s.titleEn || s.title : s.title}`
      ),
      t.terminal_services_opening,
    ];
  };

  const showNeofetch = () => {
    return [
      `${profile.name}@sigitos`,
      "-------------------",
      t.terminal_neofetch_os,
      `Host: ${profile.location || "Indonesia"}`,
      t.terminal_neofetch_kernel,
      t.terminal_neofetch_uptime,
      t.terminal_neofetch_shell,
      t.terminal_neofetch_skills.replace("{n}", String(profile.skills?.length ?? 0)),
      t.terminal_neofetch_projects.replace("{n}", String(projects.filter((p) => p.published).length)),
      t.terminal_neofetch_articles.replace("{n}", String(articles.filter((a) => a.published).length)),
      t.terminal_neofetch_theme,
    ];
  };

  const showHelp = (topic?: string) => {
    if (topic) {
      const map: Record<string, string> = {
        skills: t.terminal_help_skills,
        projects: t.terminal_help_projects,
        services: t.terminal_help_services,
        contact: t.terminal_help_contact,
        open: t.terminal_help_open,
        theme: t.terminal_help_theme,
        lang: t.terminal_help_lang,
        cv: t.terminal_help_cv,
        github: t.terminal_help_github,
        email: t.terminal_help_email,
        cat: language === "en" ? "cat <file> - Display content of virtual file (e.g. cat readme.txt)" : "cat <file> - Tampilkan isi file virtual (contoh: cat readme.txt)",
        cd: language === "en" ? "cd <dir> - Change directory or navigate to app section" : "cd <dir> - Pindah direktori atau navigasi ke section portofolio",
        uname: language === "en" ? "uname [-a] - Print system and POSIX architecture information" : "uname [-a] - Tampilkan info arsitektur kernel & sistem POSIX",
        sudo: language === "en" ? "sudo <cmd> - Execute a command as the superuser" : "sudo <cmd> - Jalankan perintah sebagai superuser",
        uptime: language === "en" ? "uptime - Show how long the system has been running" : "uptime - Tampilkan lama waktu sistem berjalan",
        top: language === "en" ? "top / htop - Display Linux processes and resource usage" : "top / htop - Tampilkan tabel proses & penggunaan memori sistem",
        ping: language === "en" ? "ping <host> - Send ICMP network packets" : "ping <host> - Kirim paket jaringan ICMP ke server target",
        curl: language === "en" ? "curl <url> - Fetch web resource with HTTP headers" : "curl <url> - Ambil resource web lengkap dengan header HTTP",
        cowsay: language === "en" ? "cowsay <text> - Classic speaking cow ASCII art" : "cowsay <teks> - ASCII art sapi klasik berbicara",
        matrix: language === "en" ? "matrix - Digital green falling rain effect" : "matrix - Efek hujan digital hijau Matrix klasik",
      };
      const found = Object.entries(map).find(([k]) => topic.toLowerCase() === k);
      if (found) return [found[1]];
      return [t.terminal_help_no_entry.replace("{topic}", topic)];
    }

    return [
      t.terminal_help_header,
      `  help [cmd]  - ${t.terminal_cmd_help}`,
      `  whoami      - ${t.terminal_cmd_whoami}`,
      `  date / time - ${t.terminal_cmd_date}`,
      `  echo <txt>  - ${t.terminal_cmd_echo}`,
      `  pwd         - ${t.terminal_cmd_pwd}`,
      `  ls / dir    - ${t.terminal_cmd_ls}`,
      `  cat <file>  - ${language === "en" ? "Read virtual file (readme.txt, profil.txt, etc.)" : "Baca file virtual (readme.txt, profil.txt, dll.)"}`,
      `  cd <dir>    - ${language === "en" ? "Navigate to app section (cd proyek, cd layanan)" : "Navigasi ke section (cd proyek, cd layanan)"}`,
      `  uname [-a]  - ${language === "en" ? "Print system kernel info" : "Tampilkan info kernel & OS"}`,
      `  uptime      - ${language === "en" ? "System uptime & load average" : "Waktu aktif sistem & status beban"}`,
      `  top / htop  - ${language === "en" ? "Display active process table" : "Tampilkan daftar proses aktif sistem"}`,
      `  ping <host> - ${language === "en" ? "Send network ping test" : "Uji konektivitas paket jaringan"}`,
      `  curl <url>  - ${language === "en" ? "Simulate HTTP request" : "Simulasi permintaan HTTP request"}`,
      `  sudo <cmd>  - ${language === "en" ? "Execute superuser action" : "Jalankan aksi superuser"}`,
      `  cowsay <tx> - ${language === "en" ? "ASCII speaking cow" : "Sapi ASCII berbicara"}`,
      `  matrix      - ${language === "en" ? "Digital rain effect" : "Efek hujan digital Matrix"}`,
      `  skills      - ${t.terminal_cmd_skills}`,
      `  projects    - ${t.terminal_cmd_projects}`,
      `  services    - ${t.terminal_cmd_services}`,
      `  articles    - ${t.terminal_cmd_articles}`,
      `  contact     - ${t.terminal_cmd_contact}`,
      `  cv          - ${t.terminal_cmd_cv}`,
      `  github      - ${t.terminal_cmd_github}`,
      `  email       - ${t.terminal_cmd_email}`,
      `  open <app>  - ${t.terminal_cmd_open}`,
      `  theme <t>   - ${t.terminal_cmd_theme}`,
      `  lang <id|en> - ${t.terminal_cmd_lang}`,
      `  neofetch    - ${t.terminal_cmd_neofetch}`,
      `  share       - ${language === "en" ? "Share terminal link & content" : "Bagikan tautan & konten terminal"}`,
      `  history     - ${t.terminal_cmd_history}`,
      `  clear / cls - ${t.terminal_cmd_clear} (Ctrl+L)`,
      `  exit / quit - ${language === "en" ? "Logout session" : "Tutup sesi terminal"}`,
      `  reboot      - ${t.terminal_cmd_reboot}`,
      t.terminal_help_freeform,
    ];
  };

  const handleAutoCompletion = useCallback(() => {
    const trimmed = commandInput.trimStart();
    if (!trimmed) {
      appendLogs([
        `guest@sigitos:~$ ${commandInput}`,
        `[SHELL] Commands: ${ALL_COMMANDS.slice(0, 16).join("  ")} ... (type 'help')`,
      ]);
      return;
    }

    const parts = trimmed.split(/\s+/);
    if (parts.length === 1 && !commandInput.endsWith(" ")) {
      const prefix = parts[0].toLowerCase();
      const matches = ALL_COMMANDS.filter((cmd) => cmd.startsWith(prefix));
      if (matches.length === 1) {
        setCommandInput(`${matches[0]} `);
        playOS("key");
      } else if (matches.length > 1) {
        let lcp = prefix;
        for (let i = prefix.length; ; i++) {
          const char = matches[0][i];
          if (!char) break;
          if (matches.every((m) => m[i] === char)) {
            lcp += char;
          } else {
            break;
          }
        }
        if (lcp.length > prefix.length) {
          setCommandInput(lcp);
        } else {
          appendLogs([
            `guest@sigitos:~$ ${commandInput}`,
            matches.join("   "),
          ]);
        }
        playOS("key");
      }
      return;
    }

    const cmd = parts[0].toLowerCase();
    const argPrefix = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
    let candidatePool: string[] = [];

    if (cmd === "open") {
      candidatePool = APP_NAMES;
    } else if (cmd === "theme") {
      candidatePool = THEME_NAMES;
    } else if (cmd === "lang") {
      candidatePool = ["id", "en"];
    } else if (cmd === "cat" || cmd === "type") {
      candidatePool = VIRTUAL_FILES;
    } else if (cmd === "help" || cmd === "man") {
      candidatePool = [
        "skills",
        "projects",
        "services",
        "contact",
        "open",
        "theme",
        "lang",
        "cv",
        "github",
        "email",
        "cat",
        "cd",
        "uname",
        "sudo",
        "uptime",
        "top",
        "ping",
        "curl",
        "cowsay",
        "matrix",
      ];
    } else if (cmd === "cd") {
      candidatePool = ["profil", "layanan", "proyek", "artikel", "toko", "kontak", "..", "~"];
    }

    if (candidatePool.length > 0) {
      const matches = candidatePool.filter((item) => item.toLowerCase().startsWith(argPrefix));
      if (matches.length === 1) {
        const newParts = [...parts.slice(0, -1), matches[0]];
        setCommandInput(newParts.join(" ") + " ");
        playOS("key");
      } else if (matches.length > 1) {
        appendLogs([
          `guest@sigitos:~$ ${commandInput}`,
          matches.join("   "),
        ]);
        playOS("key");
      }
    }
  }, [commandInput]);

  const executeCommandOrQuery = (inputStr: string) => {
    const raw = inputStr.trim();
    if (!raw) return;

    const newLogs = [`> ${raw}`];
    const [head, ...rest] = raw.split(/\s+/);
    const command = head.toLowerCase();
    const arg = rest.join(" ");

    setHistory((prev) => [raw, ...prev].slice(0, 30));
    setHistoryIndex(-1);
    playOS("key");

    if (command === "clear" || command === "cls") {
      clearConsole();
      return;
    }

    if (command === "reboot" || command === "restart") {
      window.location.reload();
      return;
    }

    if (command === "share" || command === "bagikan") {
      setShowShareModal(true);
      appendLogs([
        ...newLogs,
        language === "en"
          ? "[SHARE] Opened share modal for CRT Terminal: https://sigitadi.id/#terminal"
          : "[BAGIKAN] Membuka panel bagikan tautan & konten terminal: https://sigitadi.id/#terminal",
      ]);
      setCommandInput("");
      return;
    }

    if (command === "help" || command === "man") {
      appendLogs([...newLogs, ...showHelp(arg.trim() || undefined)]);
      setCommandInput("");
      return;
    }

    if (command === "whoami") {
      const activeHeadline =
        language === "en" ? profile.headlineEn || profile.headline : profile.headline;
      appendLogs([...newLogs, `${profile.name} - ${activeHeadline}`]);
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
        "profil.exe     layanan.exe    proyek.exe     toko.zip",
        "testimoni.txt  artikel.doc    kontak.exe     terminal.bat",
        "readme.txt     skills.txt     profil.txt",
      ]);
      setCommandInput("");
      return;
    }

    if (command === "cat" || command === "type") {
      const target = (arg || "").trim().toLowerCase();
      if (!target) {
        appendLogs([
          ...newLogs,
          "Usage: cat <filename> (e.g. cat readme.txt, cat skills.txt, cat profil.txt)",
        ]);
        setCommandInput("");
        return;
      }
      if (target === "readme.txt" || target === "readme") {
        appendLogs([
          ...newLogs,
          "============================================================",
          " SIGITOS INTERACTIVE ENVIRONMENT (v2.4.0-web)",
          ` Welcome to ${profile.name}'s verified portfolio terminal.`,
          " Type 'help' for commands, TAB for auto-completion.",
          " Type 'projects' to view showcase, 'skills' for tech stack.",
          "============================================================",
        ]);
      } else if (target === "profil.txt" || target === "profil" || target === "profile.txt") {
        appendLogs([
          ...newLogs,
          `Name     : ${profile.name}`,
          `Headline : ${language === "en" ? profile.headlineEn || profile.headline : profile.headline}`,
          `Location : ${profile.location}`,
          `Bio      : ${language === "en" ? profile.bioEn || profile.bio : profile.bio}`,
        ]);
      } else if (target === "skills.txt" || target === "skills") {
        appendLogs([...newLogs, ...listSkills()]);
      } else if (target === "proyek.txt" || target === "projects.txt") {
        appendLogs([...newLogs, ...listProjects()]);
      } else if (target === "layanan.txt" || target === "services.txt") {
        appendLogs([...newLogs, ...listServices()]);
      } else if (target === "kontak.txt" || target === "contact.txt") {
        appendLogs([...newLogs, ...listContact()]);
      } else {
        appendLogs([
          ...newLogs,
          `cat: ${arg}: No such file. Available: ${VIRTUAL_FILES.join(", ")}`,
        ]);
      }
      setCommandInput("");
      return;
    }

    if (command === "cd") {
      const dir = (arg || "").trim().toLowerCase();
      if (!dir || dir === "~" || dir === "/" || dir === "..") {
        appendLogs([...newLogs, "C:\\Sigit\\Terminal> Directory set to root."]);
      } else if (dir === "proyek" || dir === "projects") {
        appendLogs([...newLogs, "Navigating to /proyek ..."]);
        switchApp("proyek");
      } else if (dir === "layanan" || dir === "services") {
        appendLogs([...newLogs, "Navigating to /layanan ..."]);
        switchApp("layanan");
      } else if (dir === "artikel" || dir === "articles") {
        appendLogs([...newLogs, "Navigating to /artikel ..."]);
        switchApp("artikel");
      } else if (dir === "profil" || dir === "profile") {
        appendLogs([...newLogs, "Navigating to /profil ..."]);
        switchApp("profil");
      } else if (dir === "kontak" || dir === "contact") {
        appendLogs([...newLogs, "Navigating to /kontak ..."]);
        switchApp("kontak");
      } else {
        appendLogs([...newLogs, `cd: no such directory: ${arg}. Try: cd proyek, cd artikel, cd layanan`]);
      }
      setCommandInput("");
      return;
    }

    if (command === "uname") {
      appendLogs([
        ...newLogs,
        arg.includes("-a")
          ? "SigitOS 2.4.0-web #42-SMP Fri Oct 30 2026 x86_64 GNU/Linux (Next.js/React POSIX Engine)"
          : "SigitOS",
      ]);
      setCommandInput("");
      return;
    }

    if (command === "sudo") {
      appendLogs([
        ...newLogs,
        `[SECURITY ALERT] guest is not in the sudoers file. This incident will be reported to ${profile.name}.`,
      ]);
      setCommandInput("");
      return;
    }

    if (command === "uptime") {
      appendLogs([
        ...newLogs,
        `${new Date().toLocaleTimeString()} up 42 days, 13:37, 1 user, load average: 0.08, 0.04, 0.01`,
      ]);
      setCommandInput("");
      return;
    }

    if (command === "top" || command === "htop") {
      appendLogs([
        ...newLogs,
        "Tasks: 5 total, 1 running, 4 sleeping, 0 stopped",
        "%Cpu(s): 2.4 us, 0.8 sy, 0.0 ni, 96.8 id, 0.0 wa",
        "MiB Mem :  8192.0 total,  5320.4 free,  2150.2 used",
        "  PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM  COMMAND",
        "    1 root      20   0   14.2M   4.8M   2.1M S   0.1   0.1  sigitos_kernel",
        "    2 guest     20   0   48.5M  18.2M   6.4M S   0.3   0.2  web_audio_daemon",
        "    3 guest     20   0  128.0M  42.1M  12.0M R   1.4   0.5  gemini_nlp_engine",
        "    4 guest     20   0   32.4M  12.0M   4.2M S   0.1   0.1  xterm_terminal",
        "    5 guest     20   0   16.0M   6.4M   2.0M S   0.0   0.1  crt_phosphor_fx",
      ]);
      setCommandInput("");
      return;
    }

    if (command === "ping") {
      const host = (arg || "sigitadi.id").trim();
      appendLogs([
        ...newLogs,
        `PING ${host} (104.21.58.12): 56 data bytes`,
        `64 bytes from 104.21.58.12: icmp_seq=1 ttl=58 time=14.2 ms`,
        `64 bytes from 104.21.58.12: icmp_seq=2 ttl=58 time=12.9 ms`,
        `64 bytes from 104.21.58.12: icmp_seq=3 ttl=58 time=13.4 ms`,
        `--- ${host} ping statistics ---`,
        `3 packets transmitted, 3 received, 0% packet loss, time 2014ms`,
      ]);
      setCommandInput("");
      return;
    }

    if (command === "curl") {
      const url = (arg || "https://sigitadi.id/api/status").trim();
      appendLogs([
        ...newLogs,
        `HTTP/2 200 OK`,
        `date: ${new Date().toUTCString()}`,
        `content-type: application/json; charset=utf-8`,
        `server: SigitOS-Edge-CDN`,
        `x-powered-by: Next.js + RetroBOT`,
        `{"status": "online", "system": "SigitOS", "target": "${url}"}`,
      ]);
      setCommandInput("");
      return;
    }

    if (command === "cowsay") {
      const text = arg.trim() || `Halo dari ${profile.name}!`;
      const border = "-".repeat(text.length + 2);
      appendLogs([
        ...newLogs,
        ` ${border}`,
        `< ${text} >`,
        ` ${border}`,
        `        \\   ^__^`,
        `         \\  (oo)\\_______`,
        `            (__)\\       )\\/`,
        `                ||----w |`,
        `                ||     ||`,
      ]);
      setCommandInput("");
      return;
    }

    if (command === "matrix") {
      appendLogs([
        ...newLogs,
        "[MATRIX SYSTEM INITIALIZED]",
        "01001000 01100101 01101100 01101100 01101111 00100000 01010111 01101111 01110010 01101100 01100100",
        "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン",
        "Wake up, Neo... The Matrix has you.",
        "Follow the white rabbit. Knock, knock, Neo.",
      ]);
      setCommandInput("");
      return;
    }

    if (command === "exit" || command === "quit") {
      appendLogs([...newLogs, "[SESSION] Logging out guest session... Goodbye!"]);
      setTimeout(() => {
        switchApp("profil");
      }, 400);
      setCommandInput("");
      return;
    }

    if (command === "open") {
      const appId = APP_ALIASES[arg.toLowerCase()];
      if (appId) {
        switchApp(appId);
        appendLogs([...newLogs, t.terminal_opening_app.replace("{app}", appId)]);
      } else {
        appendLogs([...newLogs, t.terminal_unknown_app.replace("{app}", arg)]);
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
      appendLogs([...newLogs, t.terminal_articles_opening]);
      switchApp("artikel");
      setCommandInput("");
      return;
    }

    if (command === "contact" || command === "kontak") {
      appendLogs([...newLogs, ...listContact(), t.terminal_contact_opening]);
      switchApp("kontak");
      setCommandInput("");
      return;
    }

    if (command === "theme") {
      const argLower = arg.toLowerCase();
      if (argLower === "random" || argLower === "acak") {
        const pool: OSTheme[] = ["retro90s", "dark", "tokyo", "vscode"];
        // eslint-disable-next-line react-hooks/purity
        const picked = pool[Math.floor(Math.random() * pool.length)];
        setTheme(picked);
        appendLogs([...newLogs, t.terminal_theme_random.replace("{theme}", picked)]);
        setCommandInput("");
        return;
      }
      const theme = THEME_ALIASES[argLower];
      if (theme) {
        setTheme(theme);
        appendLogs([...newLogs, t.terminal_theme_applied.replace("{theme}", theme)]);
      } else {
        appendLogs([...newLogs, t.terminal_theme_usage]);
      }
      setCommandInput("");
      return;
    }

    if (command === "lang") {
      const next = arg.toLowerCase() === "en" ? "en" : arg.toLowerCase() === "id" ? "id" : language;
      if (next === language) {
        appendLogs([...newLogs, t.terminal_lang_same.replace("{lang}", next.toUpperCase())]);
      } else {
        setLanguage(next);
        appendLogs([...newLogs, t.terminal_lang_applied.replace("{lang}", next.toUpperCase())]);
      }
      setCommandInput("");
      return;
    }

    if (command === "cv") {
      if (profile.cvUrl) {
        window.open(profile.cvUrl, "_blank", "noopener,noreferrer");
        appendLogs([...newLogs, t.terminal_cv_opening.replace("{url}", profile.cvUrl)]);
      } else {
        appendLogs([...newLogs, t.terminal_cv_unavailable]);
      }
      setCommandInput("");
      return;
    }

    if (command === "github" || command === "gh") {
      const gh = buildSocialLinks(profile).find((s) => s.key === "github");
      if (gh) {
        window.open(gh.href, "_blank", "noopener,noreferrer");
        appendLogs([...newLogs, t.terminal_github_opening.replace("{url}", gh.href)]);
      } else {
        appendLogs([...newLogs, t.terminal_github_unconfigured]);
      }
      setCommandInput("");
      return;
    }

    if (command === "email" || command === "mail") {
      if (profile.email) {
        appendLogs([...newLogs, `Email: ${profile.email}`, t.terminal_email_opening]);
        // eslint-disable-next-line react-hooks/immutability
        window.location.href = `mailto:${profile.email}`;
      } else {
        appendLogs([...newLogs, t.terminal_email_unconfigured]);
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
    const seq = ++querySeqRef.current;
    inferOwnerRef.current = seq;
    const isCurrent = () => querySeqRef.current === seq;
    const ownsInfer = () => inferOwnerRef.current === seq;
    const done = () => {
      if (ownsInfer()) {
        inferOwnerRef.current = 0;
        setIsInferencing(false);
      }
    };

    setIsInferencing(true);
    stopSpeaking();
    appendLogs([...newLogs, markPlaceholder(t.terminal_log_inferencing)]);

    inferTimeoutRef.current = setTimeout(async () => {
      const currentLang = languageRef.current;
      const result = queryAIEngine(raw, aiContext, currentLang);
      if (result.confidence < 0.55 && cloudOn) {
        if (isCurrent()) appendLogs([markPlaceholder(t.terminal_log_cloud)]);
        try {
          const cloud = await askSigitBot(raw, currentLang);
          if (!isCurrent()) return done();
          if (cloud.source === "cloud") {
            const outputLines = cloud.text.split("\n");
            setLogs((prev) => [
              ...prev.filter((l) => !isPlaceholderLine(l)),
              t.terminal_cloud_tag
                .replace("{provider}", cloudProviderLabel || "Cloud")
                .replace("{intent}", cloud.intent),
              ...outputLines,
            ]);
            playOS("notify");
            if (ttsOn) speak(cloud.text);
            done();
            return;
          }
        } catch {
          // jatuh ke jawaban lokal di bawah
        }
      }
      if (!isCurrent()) return done();
      const outputLines = result.text.split("\n");
      setLogs((prev) => [
        ...prev.filter((l) => !isPlaceholderLine(l)),
        `[Sigit_Bot.ai | Confidence: ${(result.confidence * 100).toFixed(0)}% | Intent: ${result.intent}]`,
        ...outputLines,
      ]);
      playOS("notify");
      if (ttsOn) speak(result.text);
      done();
    }, 280);

    setCommandInput("");
  };

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeCommandOrQuery(commandInput);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // 1. Tab Auto-Completion
    if (e.key === "Tab") {
      e.preventDefault();
      handleAutoCompletion();
      return;
    }

    // 2. Ctrl + L: Bersihkan layar console
    if (e.ctrlKey && (e.key === "l" || e.key === "L")) {
      e.preventDefault();
      clearConsole();
      return;
    }

    // 3. Ctrl + C: Abort / batalkan baris aktif (SIGINT)
    if (e.ctrlKey && (e.key === "c" || e.key === "C")) {
      e.preventDefault();
      appendLogs([`guest@sigitos:~$ ${commandInput}^C`]);
      setCommandInput("");
      setHistoryIndex(-1);
      if (isInferencing) {
        querySeqRef.current++;
        setIsInferencing(false);
      }
      return;
    }

    // 4. Ctrl + U: Hapus baris input saat ini
    if (e.ctrlKey && (e.key === "u" || e.key === "U")) {
      e.preventDefault();
      setCommandInput("");
      return;
    }

    // 5. Arrow Up / Down: Riwayat perintah (history)
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

  const handleCanvasClick = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) return;
    inputRef.current?.focus();
  };

  const handleResetLogs = () => {
    setLogs([
      t.terminal_log_rebooted,
      t.terminal_log_kernel,
      t.terminal_log_engine_online,
      t.terminal_status_ready,
    ]);
  };

  const handleCopy = async () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(logs.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard ditolak browser
    }
  };

  const suggestions = [
    t.terminal_sugg_1,
    t.terminal_sugg_2,
    t.terminal_sugg_3,
    t.terminal_sugg_4,
    t.terminal_sugg_5,
    t.terminal_sugg_6,
  ];

  return (
    <div
      className={`vt-crt-panel text-xs ${
        fullscreen ? "h-full flex flex-col rounded-none" : "rounded-xs"
      }`}
    >
      {/* Terminal Top Bar */}
      <div className="flex items-center justify-between border-b border-[#37ff9b]/30 pb-2 mb-3 text-[11px] font-mono shrink-0">
        <div className="flex items-center gap-2">
          <TerminalIcon className="h-3.5 w-3.5 text-[#37ff9b]" />
          <span className="font-bold tracking-wider text-[#37ff9b] flex items-center gap-1.5 flex-wrap">
            <span>{t.terminal_topbar_title}</span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-950/90 text-[9px] text-emerald-400 border border-emerald-500/40 rounded-xs">
              <Bot className="h-2.5 w-2.5 text-sky-400" />
              {t.terminal_bot_online}
            </span>
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-950/80 text-[9px] text-emerald-400 border border-emerald-500/40 rounded-xs">
              <Sparkles className="h-2.5 w-2.5 text-amber-300" />
              {t.terminal_neural_ready}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-[10px] text-[#37ff9b]/70 font-pixel hidden sm:inline">{t.terminal_baud}</span>

          {/* TTS Toggle Button */}
          <button
            type="button"
            onClick={() => {
              if (ttsOn) stopSpeaking();
              setTtsOn((v) => !v);
            }}
            className={`flex items-center gap-1 text-[10px] cursor-pointer px-1.5 py-0.5 rounded-2xs border transition-colors ${
              ttsOn
                ? "border-sky-400/60 text-sky-300 bg-sky-950/40"
                : "border-[#37ff9b]/30 text-[#37ff9b]/70 hover:text-[#37ff9b]"
            }`}
            title={t.terminal_tts}
            aria-label={t.terminal_tts}
            aria-pressed={ttsOn}
          >
            {ttsOn ? <Volume2 className="h-2.5 w-2.5 text-sky-300" /> : <VolumeX className="h-2.5 w-2.5 text-muted-foreground" />}
            <span className="hidden sm:inline">TTS</span>
          </button>

          <button
            type="button"
            onClick={() => setShowShareModal(true)}
            className="hover:text-white transition-colors flex items-center gap-1 text-[10px] cursor-pointer text-[#37ff9b]"
            title={language === "en" ? "Share Terminal & Link" : "Bagikan Tautan & Konten Terminal"}
            aria-label={language === "en" ? "Share Terminal & Link" : "Bagikan Tautan & Konten Terminal"}
          >
            <Share2 className="h-2.5 w-2.5" />
            <span className="hidden sm:inline">{language === "en" ? "Share" : "Bagikan"}</span>
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="hover:text-white transition-colors flex items-center gap-1 text-[10px] cursor-pointer"
            title={t.terminal_copy_title}
          >
            <Copy className="h-2.5 w-2.5" />
            <span>{copied ? t.terminal_copied : t.terminal_copy}</span>
          </button>
          <button
            type="button"
            onClick={handleResetLogs}
            className="hover:text-white transition-colors flex items-center gap-1 text-[10px] cursor-pointer"
            title={t.terminal_reset_title}
          >
            <RotateCcw className="h-2.5 w-2.5" />
            <span>{t.terminal_reset}</span>
          </button>
        </div>
      </div>

      {/* System Resource Gauges */}
      <div className="grid grid-cols-3 gap-2 mb-3 text-[10px] font-mono text-[#37ff9b]/80 shrink-0">
        <div>
          <div className="flex justify-between mb-0.5">
            <span className="flex items-center gap-1">
              <Cpu className="h-2.5 w-2.5 text-[#37ff9b]" />
              {t.terminal_gauge_nlp}
            </span>
            <span>{isInferencing ? t.terminal_gauge_nlp_load : t.terminal_gauge_nlp_idle}</span>
          </div>
          <div className="vt-crt-bar">
            <div className={`vt-crt-fill transition-all duration-300 ${isInferencing ? "w-[100%] bg-amber-400" : "w-[3%]"}`} />
          </div>
        </div>
        <div>
          <div className="flex justify-between mb-0.5">
            <span>{t.terminal_gauge_ram}</span>
            <span>{t.terminal_gauge_ram_value}</span>
          </div>
          <div className="vt-crt-bar">
            <div className="vt-crt-fill w-[65%]" />
          </div>
        </div>
        <div>
          <div className="flex justify-between mb-0.5">
            <span>{t.terminal_gauge_db}</span>
            <span>{t.terminal_gauge_db_value}</span>
          </div>
          <div className="vt-crt-bar">
            <div className="vt-crt-fill w-[25%]" />
          </div>
        </div>
      </div>

      {/* Quick Prompt Suggestion Chips */}
      <div className="flex flex-wrap items-center gap-1.5 mb-2.5 pt-1 text-[10px] font-mono shrink-0">
        <span className="text-[#37ff9b]/70 select-none text-[9px] uppercase">{t.terminal_ask_label}</span>
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

      {/* Streaming Log Area with Real Authentic Inline Shell Prompt */}
      <div
        ref={terminalBodyRef}
        onClick={handleCanvasClick}
        role="log"
        aria-label={t.terminal_log_label}
        aria-live="polite"
        aria-busy={isInferencing}
        tabIndex={0}
        className={`${
          fullscreen
            ? "flex-1 min-h-0"
            : "h-64 sm:h-72"
        } overflow-y-auto space-y-1 font-mono text-[11px] leading-relaxed pr-1 border-t border-[#37ff9b]/20 py-2.5 scrollbar-thin focus:outline-none focus:ring-1 focus:ring-[#37ff9b]/50 select-text cursor-text`}
      >
        {isInferencing && <span className="sr-only">{t.terminal_log_busy}</span>}
        {logs.map((log, i) => (
          <div
            key={i}
            className={`flex items-start gap-1.5 ${
              log.startsWith(">")
                ? "text-white font-bold"
                : log.includes("[Sigit_Bot.ai")
                ? "text-amber-300 font-semibold"
                : log.includes("[OK]") || log.includes("[ONLINE]") || log.includes("[AKTIF]")
                ? "text-[#37ff9b]"
                : log.includes("AUTH") || log.includes("NEURAL") || log.includes("SIGIT_BOT") || log.includes("[SECURITY")
                ? "text-[#ffd400]"
                : log.includes("[ERR]") || log.includes("incident")
                ? "text-red-400"
                : "text-[#37ff9b]/90"
            }`}
          >
            <span className="opacity-50 select-none shrink-0">&gt;</span>
            <span className="break-words whitespace-pre-wrap">
              <MiniMarkdownInline text={log} />
            </span>
          </div>
        ))}

        {/* Real Authentic Inline Shell Prompt Line */}
        <form
          onSubmit={handleCommandSubmit}
          className="flex items-center gap-1.5 pt-1 font-mono text-[11px] leading-relaxed select-text"
        >
          <span className="text-[#37ff9b] font-bold select-none shrink-0 flex items-center gap-1">
            <span className="text-sky-400 font-bold">guest@sigitos</span>
            <span className="text-[#37ff9b]/70">:</span>
            <span className="text-[#ffd400]">~</span>
            <span className="text-[#37ff9b]">$</span>
          </span>

          <div className="relative flex-1 flex items-center min-w-0">
            <input
              ref={inputRef}
              type="text"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={logs.length > 8 ? "" : t.terminal_input_placeholder}
              aria-label={t.terminal_input_label}
              autoComplete="off"
              spellCheck={false}
              aria-describedby="sigitbot-hint"
              className="w-full bg-transparent border-0 outline-none text-[#37ff9b] font-mono text-[11px] placeholder:text-[#37ff9b]/35 focus:ring-0 p-0 leading-normal caret-[#37ff9b]"
            />
          </div>

          {/* Inline Execution Controls */}
          <div className="flex items-center gap-1 shrink-0">
            {speechSupported && (
              <button
                type="button"
                onClick={toggleMic}
                className={`p-1 rounded-2xs border transition-colors cursor-pointer ${
                  listening
                    ? "bg-red-500/20 border-red-500 text-red-400 animate-pulse"
                    : "border-[#37ff9b]/30 text-[#37ff9b]/60 hover:text-[#37ff9b]"
                }`}
                title={t.terminal_voice_input}
                aria-label={t.terminal_voice_input}
              >
                <Mic className="h-2.5 w-2.5" />
              </button>
            )}
            <button
              type="submit"
              aria-label={t.terminal_enter}
              className="vt-btn vt-btn-chrome px-1.5 py-0.5 text-[9px] font-mono font-bold flex items-center gap-1 cursor-pointer text-[#37ff9b]"
            >
              <CornerDownLeft className="h-2.5 w-2.5 text-primary" />
              <span className="hidden xs:inline">{t.terminal_enter}</span>
            </button>
          </div>
        </form>

        <div ref={logEndRef} />
      </div>

      <p id="sigitbot-hint" className="sr-only">
        {t.terminal_input_hint}
      </p>

      {/* Terminal Content Share Modal */}
      {showShareModal && (
        <ContentShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          title={language === "en" ? `Interactive CRT Terminal SigitOS: ${ownerName}` : `Terminal Interaktif SigitOS CRT: ${ownerName}`}
          url="/terminal"
          summary={
            language === "en"
              ? "Access an interactive retro CRT web terminal with integrated AI assistant to explore portfolio, tech stack, and systems directly in your browser."
              : "Akses terminal retro interaktif berbasis web dengan asisten AI terintegrasi untuk eksplorasi sistem, teknologi, dan portofolio langsung via browser."
          }
          badge="TERMINAL"
          thumbnailUrl={`/api/og?section=terminal${language === "en" ? "&lang=en" : ""}`}
          isEn={language === "en"}
        />
      )}
    </div>
  );
}
