"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
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
import { queryAIEngine, type EngineContext } from "@/lib/ai-engine";
import { askSigitBot, getCloudAIStatus } from "@/lib/actions";
import { useOSTheme, OSTheme } from "./theme-context";
import { playOS } from "@/lib/os-sound";
import { ProfileData, ServiceData, ProjectData, ArticleData } from "@/lib/dummy-data";
import { buildSocialLinks } from "@/components/public/social-icons";

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

  // Sinkronisasi bahasa: baris log statis (banner BIOS, status boot, header
  // bantuan, dll.) diterjemahkan penuh, tapi karena mereka disimpan di state
  // (bukan derived), mengganti bahasa tidak mengubahnya. Tanpa effect ini,
  // teks terminal tetap bahasa lama setelah toggle ID/EN. Baris hasil query
  // bot sengaja tidak diterjemahkan ulang — jawaban itu sudah dihasilkan dalam
  // satu bahasa; menerjemahkan teks bebas akan menimbulkan teks campuran.
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
    // Peta teks bahasa lama → bahasa baru untuk tiap baris statis.
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
  const [cloudOn, setCloudOn] = useState(false);
  // Default ON: speaker terminal aktif sejak halaman dimuat. speechSynthesis
  // tetap butuh gesture pengguna sebelum memutar suara (kebijakan autoplay
  // browser), tapi speak() hanya dipanggil setelah user mengetik perintah,
  // jadi gesture tersebut sudah ada.
  const [ttsOn, setTtsOn] = useState(true);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Bahasa UI terbaru. speak() dipanggil dari dalam setTimeout yang menangkap
  // versi render lama (stale closure) — tanpa ref, voice bisa tertinggal di
  // bahasa sebelum toggle ID/EN, terlihat bagi pengguna seperti voice "tertukar".
  const languageRef = useRef(language);
  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  // Cache daftar suara TTS. synth.getVoices() memuat secara asynchronous di
  // banyak browser (array kosong pada panggilan pertama). Tanpa menunggu event
  // voiceschanged, pemilihan voice kembali null → browser memakai voice default
  // (umumnya en-US) → teks Indonesia dibaca dengan voice English.
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

  // Konteks live untuk engine NLP — dirakit dari props SSR (profil, layanan,
  // proyek, artikel) yang diterima jendela ini, bukan dari tabel hardcode di
  // ai-engine.ts. Sehingga jawaban Sigit_Bot selalu sinkron dengan data yang
  // diatur admin: email/stack/daftar proyek diubah → bot ikut, tanpa redeploy.
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
      services: services.filter((s) => s.published !== false).map((s) => s.title),
      projects: projects
        .filter((p) => p.published)
        .slice(0, 8)
        .map((p) => ({ title: p.title, slug: p.slug })),
      articles: articles
        .filter((a) => a.published)
        .slice(0, 8)
        .map((a) => ({ title: a.title, slug: a.slug })),
    }),
    [profile, services, projects, articles],
  );

  // Anti race condition untuk inferensi AI. Setiap query ambil nomor urut;
  // hanya hasil query TERBARU yang boleh menulis log. Sebelumnya, query
  // cloud yang lambat (A) bisa selesai setelah query baru (B) sudah menjawab,
  // lalu menimpa/mengacak urutan output — termasuk menghapus baris placeholder
  // milik B. Token ini juga dipakai untuk membatalkan setTimeout & TTS saat
  // unmount.
  const querySeqRef = useRef(0);
  // Pemilik flag isInferencing. Saat query usang bail-out, ia hanya boleh
  // mereset flag bila masih jadi pemilik — jika user sudah menjalankan query
  // lain, query itu yang mengelola flag. Command cepat (mis. "clear") tidak
  // mengambil alih kepemilikan, jadi tanpa ref ini flag bisa macet true.
  const inferOwnerRef = useRef(0);
  const inferTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (inferTimeoutRef.current) clearTimeout(inferTimeoutRef.current);
  }, []);

  // Auto-scroll ke baris terakhir. Hanya menggulir KONTAINER LOG-nya sendiri
  // (role="log" adalah parent dari logEndRef) — BUKAN scrollIntoView.
  // scrollIntoView menggulir SEMUA leluhur scrollable: di mode section mobile
  // (terminal kini inline di tengah dokumen), setiap perubahan logs — termasuk
  // 8 baris boot saat mount — akan menarik seluruh halaman ke section terminal
  // dan pengguna tidak bisa scroll dengan tenang.
  useEffect(() => {
    const box = logEndRef.current?.parentElement;
    if (box) box.scrollTop = box.scrollHeight;
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
      const synth = window.speechSynthesis;
      synth.cancel();

      // Ikuti bahasa UI: pilih voice yang benar-benar mendukung id-ID/en-US.
      // Memakai ref agar bahasa selalu yang terbaru (lihat catatan deklarasi).
      const targetLang = languageRef.current === "en" ? "en-US" : "id-ID";
      const langPrefix = targetLang.slice(0, 2).toLowerCase();
      const pickVoice = (): SpeechSynthesisVoice | null => {
        const voices = voicesRef.current.length ? voicesRef.current : synth.getVoices();
        if (!voices.length) return null;
        // 1) Cocok persis (id-ID / en-US)
        const exact = voices.find(
          (v) => v.lang.replace("_", "-").toLowerCase() === targetLang.toLowerCase()
        );
        if (exact) return exact;
        // 2) Awalan bahasa (id-*, en-*)
        const prefix = voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix));
        if (prefix) return prefix;
        // 3) Fallback: voice yang BUKAN bahasa lain — jangan asal pakai voice
        //    default browser (biasanya en-US) untuk teks Indonesia. Bila tidak
        //    ada voice bahasa target, kembalikan null dan biarkan utter.lang
        //    yang menentukan; mesin TTS akan memilih voice yang cocok.
        return null;
      };

      // Bersihkan simbol/penanda agar dibaca sebagai kalimat wajar
      const clean = text
        .replace(/```[\s\S]*?```/g, " ")
        .replace(/[*_`#>|]/g, " ")
        .replace(/\bhttps?:\/\/\S+/g, " ")
        .replace(/\s*->\s*/g, ", ")
        .replace(/\s+/g, " ")
        .trim();
      if (!clean) return;

      // Pecah per kalimat — mesin TTS sering memotong teks panjang di tengah
      const chunks = (clean.match(/[^.!?]+[.!?]?/g) ?? [clean])
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 24);

      const voice = pickVoice();
      for (const chunk of chunks) {
        const utter = new SpeechSynthesisUtterance(chunk);
        // utter.lang wajib diatur PERTAMA: bila voice bahasa target tidak
        // tersedia di perangkat, browser memakainya untuk memilih pengganti
        // yang tepat. Tanpa ini, voice default (en-US) dipakai untuk teks ID.
        utter.lang = targetLang;
        if (voice) utter.voice = voice;
        // Sedikit "robot" tapi tetap jelas: tempo normal, pitch sedikit rendah
        utter.rate = 1;
        utter.pitch = 0.95;
        utter.volume = 1;
        synth.speak(utter); // antrean speechSynthesis memutar berurutan
      }
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
    return [
      t.terminal_contact_header,
      `  Email: ${profile.email || "-"}`,
      `  Phone/WhatsApp: ${profile.phone || "-"}`,
      `  Location: ${profile.location || "-"}`,
      ...(socials.length
        ? socials.map((s) => `  ${s.label}: ${s.href}`)
        : [t.terminal_contact_none]),
    ];
  };

  const listProjects = () => {
    const published = projects.filter((p) => p.published);
    return [
      t.terminal_projects_header,
      ...published.slice(0, 6).map((p, i) => `  [${i + 1}] ${p.title} -> /proyek/${p.slug}`),
      t.terminal_projects_opening,
    ];
  };

  const listServices = () => {
    const published = services.filter((s) => s.published !== false);
    return [
      t.terminal_services_header,
      ...published.map((s, i) => `  [${i + 1}] ${s.title}`),
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
      };
      const found = Object.entries(map).find(([k]) => topic === k);
      if (found) return [found[1]];
      return [t.terminal_help_no_entry.replace("{topic}", topic)];
    }

    return [
      t.terminal_help_header,
      `  help [cmd]  - ${t.terminal_cmd_help}`,
      `  whoami      - ${t.terminal_cmd_whoami}`,
      `  date        - ${t.terminal_cmd_date}`,
      `  echo <txt>  - ${t.terminal_cmd_echo}`,
      `  pwd         - ${t.terminal_cmd_pwd}`,
      `  ls / dir    - ${t.terminal_cmd_ls}`,
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
      `  history     - ${t.terminal_cmd_history}`,
      `  clear       - ${t.terminal_cmd_clear}`,
      `  reboot      - ${t.terminal_cmd_reboot}`,
      t.terminal_help_freeform,
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
    playOS("key");

    if (command === "clear" || command === "cls") {
      clearConsole();
      return;
    }

    if (command === "reboot") {
      // Bilang boot loader untuk memutar ulang animasi BIOS (reboot sungguhan).
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
        // Math.random() di sini dieksekusi saat pengguna mengetik perintah
        // "random"/"acak", bukan saat render; react-hooks v7 tidak bisa
        // membedakan scope command handler → false positive di-scope-suppress.
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
        // Navigasi mailto: dijalankan dalam command handler pengguna, bukan
        // saat render; react-hooks v7 tidak bisa membedakan scope handler →
        // false positive di-scope-suppress.
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
    // Hanya jalanan ini yang masih "aktif". Setelah await apapun, cek ulang:
    // bila user sudah mengetik query lain, hasil ini usang dan harus dibuang,
    // bukan ditumpangkan ke output query yang lebih baru.
    const isCurrent = () => querySeqRef.current === seq;
    // Yg berhak mereset gauge: hanya pemilik flag, bukan query usang.
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
      const result = queryAIEngine(raw, aiContext, language);
      if (result.confidence < 0.55 && cloudOn) {
        if (isCurrent()) appendLogs([markPlaceholder(t.terminal_log_cloud)]);
        try {
          const cloud = await askSigitBot(raw, language);
          if (!isCurrent()) return done(); // query baru sudah mengambil alih
          if (cloud.source === "cloud") {
            const outputLines = cloud.text.split("\n");
            setLogs((prev) => [
              ...prev.filter((l) => !isPlaceholderLine(l)),
              t.terminal_cloud_tag
                .replace("{provider}", "Gemini")
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
      if (!isCurrent()) return done(); // hasil usang jangan ditumpangkan
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
      // Clipboard ditolak browser — jangan tampilkan status COPIED palsu
    }
  };

  // Label sugesti diterjemahkan, tapi 5 dari 6 adalah nama perintah sungguhan
  // (parser hanya mengenal "help"/"skills"/"proyek"/…), jadi namanya sama di
  // kedua bahasa — lihat catatan di i18n.tsx. Hanya pertanyaan bebas yang
  // diterjemahkan penuh.
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
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-[#37ff9b]/70 font-pixel hidden sm:inline">{t.terminal_baud}</span>
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

      {/* Streaming Log Area */}
      {/* role="log" + aria-live: output bot terus berubah, tapi tanpa ini
          screen reader diam saja — pengguna tunanetra tidak pernah mendengar
          jawaban Sigit_Bot (padahal TTS hanyalah salah satu kanal). aria-busy
          memberi sinyal "sedang memproses" selama inferensi/cloud call. */}
      <div
        role="log"
        aria-label={t.terminal_log_label}
        aria-live="polite"
        aria-busy={isInferencing}
        tabIndex={0}
        className={`${
          fullscreen
            ? "flex-1 min-h-0"
            : "h-64 sm:h-72"
        } overflow-y-auto space-y-1 font-mono text-[11px] leading-relaxed pr-1 border-t border-b border-[#37ff9b]/20 py-2 scrollbar-thin focus:outline-none focus:ring-1 focus:ring-[#37ff9b]/50`}
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
                // "[AKTIF]" = "[ONLINE]" versi ID — log diterjemahkan sekarang.
                : log.includes("[OK]") || log.includes("[ONLINE]") || log.includes("[AKTIF]")
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
      <form onSubmit={handleCommandSubmit} className="mt-3 flex items-center gap-2 shrink-0">
        <span className="text-[#37ff9b] font-bold select-none font-mono shrink-0 flex items-center gap-1">
          <Bot className="h-3 w-3 text-sky-400" />
          <span>{t.terminal_prompt}</span>
        </span>
        <input
          type="text"
          value={commandInput}
          onChange={(e) => setCommandInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t.terminal_input_placeholder}
          aria-label={t.terminal_input_label}
          autoComplete="off"
          spellCheck={false}
          aria-describedby="sigitbot-hint"
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
            title={t.terminal_voice_input}
            aria-label={t.terminal_voice_input}
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
          title={t.terminal_tts}
          aria-label={t.terminal_tts}
          aria-pressed={ttsOn}
        >
          {ttsOn ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
        </button>
        <button
          type="submit"
          className="vt-btn vt-btn-chrome px-3 py-1 text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer"
        >
          <CornerDownLeft className="h-2.5 w-2.5 text-primary" />
          <span>{t.terminal_enter}</span>
        </button>
      </form>
      <p id="sigitbot-hint" className="sr-only">
        {t.terminal_input_hint}
      </p>
    </div>
  );
}
