"use client";

/**
 * RetroBot — widget asisten AI mengambang (standby) gaya Windows 95.
 *
 * Avatar pixel-art (retro-bot-avatar.tsx) melayang di pojok kanan-bawah,
 * bisa di-drag, dan membuka panel chat bila diklik. Jawaban mengalir via
 * SSE dari /api/retrobot (key TIDAK pernah di client — lihat route handler).
 *
 * Logika hybrid sama dengan Terminal: mesin TF-IDF lokal dipakai untuk
 * pertanyaan yang sudah dikenalnya; baru eskalasi ke cloud bila confidence
 * rendah DAN provider opt-in aktif (AI_PROVIDER=openai|gemini).
 *
 * Catatan hydration: posisi drag & status "greeting sudah ditutup" hanya
 * diubah setelah mount (useEffect) — nilai default identik SSR/client.
 */

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  Send,
  X,
  Trash2,
  Sparkles,
  MapPin,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { useFeature } from "@/lib/features-context";
import { playOS } from "@/lib/os-sound";
import { RetroBotAvatar, type RetroBotMood } from "./retro-bot-avatar";

type Source = "local" | "cloud" | null;

/** Id aplikasi SigitOS yang sedang dibuka pengunjung (lihat os-desktop-manager). */
type OsAppId =
  | "profil"
  | "layanan"
  | "proyek"
  | "toko"
  | "testimoni"
  | "artikel"
  | "kontak"
  | "terminal";

interface Message {
  id: string;
  role: "user" | "assistant";
  // text = teks final; streaming = teks yang masih diketik (belum final)
  text: string;
  streaming?: boolean;
  source?: Source;
  /** Aplikasi SigitOS yang bisa dibuka dari pesan ini (jalan pintas). */
  navTo?: string;
  navLabel?: string;
}

const STORAGE_DISMISSED = "sigitos_bot_greeting_dismissed";
const MAX_HISTORY_SEND = 4;

/**
 * Partikel ledakan saat jawaban tiba: 8 titik cyan/violet melayang ke luar.
 * Arah & jarak diatur via CSS custom property (--bx/--by) di keyframe.
 */
const BURST_PARTICLES = [
  { color: "#43e8cf", x: "14px", y: "-12px" },
  { color: "#7c5cff", x: "-14px", y: "-10px" },
  { color: "#43e8cf", x: "18px", y: "4px" },
  { color: "#ff3e9a", x: "-18px", y: "6px" },
  { color: "#7c5cff", x: "8px", y: "16px" },
  { color: "#43e8cf", x: "-8px", y: "-18px" },
  { color: "#ffd400", x: "16px", y: "-4px" },
  { color: "#7c5cff", x: "-16px", y: "14px" },
];

/** Hovertip acak (muncul saat kursor di atas avatar, panel tertutup). */
const HOVER_TIPS_ID = [
  "Klik aku untuk bertanya!",
  "Mau tahu proyek Sigit? Tanya aku!",
  "Aku bisa jelaskan keahlian Sigit.",
  "Butuh bantuan? Klik aku!",
  "Sigit_Bot siap melayani.",
];
const HOVER_TIPS_EN = [
  "Click me to ask a question!",
  "Want to know Sigit's projects? Ask me!",
  "I can explain Sigit's skills.",
  "Need help? Click me!",
  "Sigit_Bot at your service.",
];

/**
 * Quick prompt per aplikasi SigitOS. Dipilih agar selalu relevan dengan
 * halaman yang sedang dibuka pengunjung (interaktivitas kontekstual).
 */
const TASKBAR_MATCH: Record<string, string[]> = {
  profil: ["profil", "profile"],
  layanan: ["layanan", "services"],
  proyek: ["proyek", "projects"],
  toko: ["toko", "store"],
  testimoni: ["testimoni", "reviews"],
  artikel: ["artikel", "articles"],
  kontak: ["kontak", "contact"],
  terminal: ["terminal"],
};

/** Label tombol jalan pintas (pesan nav di dalam chat). */
const NAV_LABELS_ID: Record<string, string> = {
  profil: "Buka Profil.exe",
  layanan: "Buka Layanan.exe",
  proyek: "Buka Proyek.exe",
  toko: "Buka Toko.zip",
  testimoni: "Buka Testimoni.txt",
  artikel: "Buka Artikel.doc",
  kontak: "Buka Kontak.exe",
  terminal: "Buka Terminal.bat",
};
const NAV_LABELS_EN: Record<string, string> = {
  profil: "Open Profile.exe",
  layanan: "Open Services.exe",
  proyek: "Open Projects.exe",
  toko: "Open Store.zip",
  testimoni: "Open Reviews.txt",
  artikel: "Open Articles.doc",
  kontak: "Open Contact.exe",
  terminal: "Open Terminal.bat",
};

const APP_QUICK_PROMPTS: Record<
  string,
  { id: string; en: string }[]
> = {
  profil: [
    { id: "Siapa Sigit Adi Irianto?", en: "Who is Sigit Adi Irianto?" },
    { id: "Apa keahlian utamanya?", en: "What are the main skills?" },
    { id: "Apakah tersedia untuk proyek baru?", en: "Available for new projects?" },
  ],
  layanan: [
    { id: "Layanan apa saja yang ditawarkan?", en: "What services are offered?" },
    { id: "Berapa estimasi biaya pembuatan web?", en: "What's the estimated cost for a website?" },
    { id: "Apakah bisa integrasi AI/automation?", en: "Can you integrate AI/automation?" },
  ],
  proyek: [
    { id: "Proyek unggulan apa saja?", en: "What are the featured projects?" },
    { id: "Tech stack yang dipakai?", en: "What tech stack is used?" },
    { id: "Ceritakan proyek favorit", en: "Tell me about the favorite project" },
  ],
  toko: [
    { id: "Produk digital apa saja yang dijual?", en: "What digital products are sold?" },
    { id: "Bagaimana cara memesan?", en: "How do I order?" },
    { id: "Apakah ada garansi/dukungan?", en: "Is there a warranty/support?" },
  ],
  testimoni: [
    { id: "Apa kata klien tentang Sigit?", en: "What do clients say about Sigit?" },
    { id: "Proyek dengan testimoni terbaik?", en: "Project with the best testimonial?" },
  ],
  artikel: [
    { id: "Topik artikel apa saja?", en: "What article topics are there?" },
    { id: "Artikel tentang AI terbaru?", en: "Latest article about AI?" },
  ],
  kontak: [
    { id: "Bagaimana cara menghubungi Sigit?", en: "How can I contact Sigit?" },
    { id: "Berapa lama waktu respons?", en: "How long is the response time?" },
  ],
  terminal: [
    { id: "Perintah apa saja di terminal?", en: "What commands are in the terminal?" },
    { id: "Apa itu SigitOS?", en: "What is SigitOS?" },
  ],
};

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function RetroBot() {
  const { t, language } = useTranslation();
  // Gate feature flag (settings.features): widget adalah bagian "asisten AI
  // retro" bersama app Terminal — satu flag mengikat keduanya.
  const enableTerminal = useFeature("enable_terminal");
  const [isOpen, setIsOpen] = useState(false);
  const [mood, setMood] = useState<RetroBotMood>("idle");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [source, setSource] = useState<Source>(null);
  const [showGreeting, setShowGreeting] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  /** Aplikasi SigitOS yang sedang aktif (untuk prompt & jawaban sadar halaman). */
  const [currentApp, setCurrentApp] = useState<OsAppId | null>(null);
  /** Ledakan partikel saat jawaban tiba (sekali per jawaban). */
  const [burstId, setBurstId] = useState(0);
  /** Getaran singkat avatar saat pengguna mengirim pesan ("startle"). */
  const [nudge, setNudge] = useState(false);
  /** Hovertip kecil: pesan acak saat kursor di atas avatar. */
  const [hoverTip, setHoverTip] = useState<string | null>(null);
  /** Pemilih tip hover berikutnya (bergantian setiap hover). */
  const hoverIdxRef = useRef(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);
  // Posisi panel dihitung dari rect avatar (mengikuti robot ke mana pun ia
  // di-drag). Disimpan agar panel tidak melompat saat re-render.
  const [panelGeo, setPanelGeo] = useState<React.CSSProperties>({});

  const isEn = language === "en";

  // Greeting hanya muncul setelah mount (SSR tidak punya sessionStorage).
  useEffect(() => {
    try {
      if (window.sessionStorage?.getItem(STORAGE_DISMISSED) !== "1") {
        setShowGreeting(true);
      }
    } catch {
      // Storage diblokir — tampilkan greeting saja (default aman).
    }
  }, []);

  // Scroll ke bawah saat pesan/streaming berubah.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isStreaming]);

  // Hentikan stream saat unmount / komponen ditutup.
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  // Sadari aplikasi SigitOS mana yang sedang dibuka pengunjung. Sumber:
  //  - event "switch-os-app" yang dipancarkan os-desktop-manager/terminal/hero,
  //  - #hash langsung (mis. pengunjung membuka /#proyek dari luar).
  // Dipakai untuk quick prompt kontekstual & menambahkan konteks halaman ke
  // pertanyaan yang dikirim ke /api/retrobot.
  useEffect(() => {
    const aliasMap: Record<string, OsAppId> = {
      profil: "profil", profile: "profil", hero: "profil", about: "profil",
      layanan: "layanan", services: "layanan",
      proyek: "proyek", projects: "proyek",
      toko: "toko", produk: "toko", store: "toko", products: "toko",
      testimoni: "testimoni", testimonials: "testimoni", reviews: "testimoni",
      artikel: "artikel", articles: "artikel", blog: "artikel",
      kontak: "kontak", contact: "kontak",
      terminal: "terminal",
    };
    const fromHash = (): OsAppId | null => {
      const hash = window.location.hash.replace("#", "").toLowerCase();
      return (hash && aliasMap[hash]) || null;
    };
    setCurrentApp(fromHash());
    const onSwitch = (e: Event) => {
      const detail = (e as CustomEvent<OsAppId>).detail;
      if (detail) setCurrentApp(detail);
    };
    const onHash = () => setCurrentApp(fromHash());
    window.addEventListener("switch-os-app", onSwitch as EventListener);
    window.addEventListener("hashchange", onHash);
    return () => {
      window.removeEventListener("switch-os-app", onSwitch as EventListener);
      window.removeEventListener("hashchange", onHash);
    };
  }, []);

  const dismissGreeting = useCallback(() => {
    setShowGreeting(false);
    try {
      window.sessionStorage?.setItem(STORAGE_DISMISSED, "1");
    } catch {
      /* Storage diblokir — tidak fatal, greeting akan tampil lagi nanti */
    }
  }, []);

  const openPanel = useCallback(() => {
    setIsOpen(true);
    dismissGreeting();
    playOS("windowOpen");
    // Fokus input setelah render panel.
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [dismissGreeting]);

  const closePanel = useCallback(() => {
    setIsOpen(false);
    abortRef.current?.abort();
    playOS("windowClose");
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    setSource(null);
    playOS("click");
  }, []);

  /**
   * Deteksi niat navigasi dari teks pengguna (untuk nav chip di percakapan).
   *
   * Hanya dipicu bila kata kuncinya spesifik (mis. "proyek", "layanan",
   * "kontak") — bukan kata umum seperti "siapa"/"nama"/"harga" yang sebelumnya
   * memicu chip salah ("Buka Profil.exe" untuk "nama istrinya siapa?").
   * Juga tidak menawarkan halaman yang sedang dibuka pengunjung.
   *
   * HARUS dideklarasikan sebelum sendMessage: sendMessage memanggilnya dan
   * memasukkannya ke dependency array useCallback. Deklarasi setelahnya
   * menyebabkan TDZ ReferenceError saat render.
   */
  const detectNavIntent = useCallback(
    (text: string): OsAppId | null => {
      const q = text.toLowerCase();
      const pick = (appId: OsAppId, kws: string[]): OsAppId | null =>
        kws.some((k) => q.includes(k)) ? appId : null;
      const intent =
        pick("proyek", ["proyek", "project", "portofolio", "portfolio"]) ||
        pick("layanan", ["layanan", "service", "jasa"]) ||
        pick("kontak", ["kontak", "contact", "hubungi", "whatsapp"]) ||
        pick("toko", ["toko", "store", "produk digital", "beli", "order"]) ||
        pick("artikel", ["artikel", "article", "blog", "tulisan"]) ||
        pick("testimoni", ["testimoni", "review", "ulasan", "klien"]) ||
        null;
      if (!intent || intent === currentApp) return null;
      return intent;
    },
    [currentApp]
  );

  /** Kirim pertanyaan ke /api/retrobot dan konsumsi SSE. */
  const sendMessage = useCallback(
    async (raw: string) => {
      const text = raw.trim().slice(0, 500);
      if (!text || isStreaming) return;

      setInput("");
      playOS("click");
      setMood("thinking");
      // Getaran reaktif: avatar "terkejut" saat pengguna mengirim pesan.
      setNudge(true);
      window.setTimeout(() => setNudge(false), 500);

      const history = messages
        .filter((m) => !m.streaming)
        .slice(-MAX_HISTORY_SEND)
        .map((m) => ({ role: m.role, content: m.text }));

      const userMsg: Message = { id: uid(), role: "user", text };
      const botId = uid();
      // Niat navigasi: tawarkan jalan pintas ke jendela yang relevan sebagai
      // pesan pertama (sebelum jawaban AI mengalir).
      const navApp = detectNavIntent(text);
      const navMsg: Message | null = navApp
        ? {
            id: uid(),
            role: "assistant",
            text: isEn
              ? `I can open that page for you:`
              : `Saya bisa bukakan halaman itu untuk Anda:`,
            navTo: navApp,
            navLabel: isEn
              ? NAV_LABELS_EN[navApp]
              : NAV_LABELS_ID[navApp],
          }
        : null;
      setMessages((prev) => [
        ...prev,
        userMsg,
        ...(navMsg ? [navMsg] : []),
        { id: botId, role: "assistant", text: "", streaming: true },
      ]);
      setIsStreaming(true);
      setSource(null);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/retrobot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            lang: isEn ? "en" : "id",
            history,
            app: currentApp,
          }),
          signal: controller.signal,
        });

        if (res.status === 429) {
          setIsStreaming(false);
          setMood("idle");
          setMessages((prev) =>
            prev.map((m) =>
              m.id === botId
                ? { ...m, text: t.retrobot_rate_limited, streaming: false, source: "local" }
                : m
            )
          );
          playOS("error");
          return;
        }
        if (!res.ok || !res.body) throw new Error(`status_${res.status}`);

        // Buffer internal: seluruh teks yang sudah tiba dari stream. Delta
        // ditulis langsung ke pesan — kecepatan kedatangan chunk sudah memberi
        // efek ketik alami, dan cursor blok berkedip selama streaming: true.
        let buffer = "";
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let raw = "";

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          raw += decoder.decode(value, { stream: true });
          const events = raw.split("\n\n");
          raw = events.pop() || "";
          for (const evt of events) {
            const lines = evt.split("\n");
            let eventName = "message";
            let dataLine = "";
            for (const ln of lines) {
              if (ln.startsWith("event:")) eventName = ln.slice(6).trim();
              else if (ln.startsWith("data:")) dataLine = ln.slice(5).trim();
            }
            if (!dataLine) continue;
            let payload: Record<string, unknown>;
            try {
              payload = JSON.parse(dataLine);
            } catch {
              continue;
            }
            if (eventName === "meta") {
              setSource(payload.source === "cloud" ? "cloud" : "local");
              setMood("talking");
            } else if (eventName === "delta") {
              // Delta langsung di-append ke teks pesan. Kecepatan kedatangan
              // chunk dari route sudah memberi efek ketik (token-by-token
              // untuk cloud, word-chunk untuk lokal); cursor blok berkedip
              // selama streaming: true.
              const chunk = typeof payload.t === "string" ? payload.t : "";
              if (!chunk) continue;
              buffer += chunk;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === botId ? { ...m, text: buffer, streaming: true } : m
                )
              );
            } else if (eventName === "done") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === botId
                    ? { ...m, text: buffer || m.text, streaming: false }
                    : m
                )
              );
              setMood("idle");
              // Ledakan partikel: rayakan jawaban yang tiba (sekali per jawaban).
              setBurstId((n) => n + 1);
              window.setTimeout(() => setBurstId(0), 800);
            }
          }
        }
        // Stream selesai tanpa event done eksplisit (defensive).
        setMessages((prev) =>
          prev.map((m) => (m.id === botId ? { ...m, streaming: false } : m))
        );
        setMood("idle");
        if (!buffer) {
          // Tidak ada jawaban sama sekali → pesan offline.
          setMessages((prev) =>
            prev.map((m) =>
              m.id === botId
                ? { ...m, text: t.retrobot_offline, source: "local" }
                : m
            )
          );
          playOS("error");
        } else {
          playOS("bot");
        }
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === botId
              ? {
                  ...m,
                  text: t.retrobot_offline,
                  streaming: false,
                  source: "local",
                }
              : m
          )
        );
        setMood("idle");
        playOS("error");
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [isStreaming, messages, isEn, t, currentApp, detectNavIntent]
  );

  const handleQuickPrompt = useCallback(
    (q: string) => {
      if (isStreaming) return;
      void sendMessage(q);
    },
    [isStreaming, sendMessage]
  );

  /**
   * Arahkan pengunjung ke aplikasi SigitOS lain: pindahkan avatar ke ikon
   * taskbar aplikasi target (animasi "bergerak menuju taskbar"), lalu buka
   * jendela tersebut via event switch-os-app yang sama dipakai terminal/hero.
   * Bila panel belum dibuka, hanya animasi singkat lalu buka panel.
   */
  const navigateToApp = useCallback(
    (appId: string) => {
      if (typeof window === "undefined") return;
      playOS("nav");
      // Cari tombol taskbar aplikasi target (os-desktop-manager merender
      // aria-label = nama file, mis. "Proyek.exe").
      const btn = Array.from(
        document.querySelectorAll<HTMLButtonElement>("button[aria-label]")
      ).find((b) => {
        const label = b.getAttribute("aria-label") || "";
        return TASKBAR_MATCH[appId]?.some((kw) => label.toLowerCase().includes(kw));
      });
      if (btn) {
        const r = btn.getBoundingClientRect();
        // Avatar "melayang" ke ikon taskbar: set posisi tepat di atas ikon.
        setPosition({
          x: Math.max(8, r.left + r.width / 2 - 28),
          y: Math.max(8, r.top - 64),
        });
        btn.classList.add("rb-taskbar-glow");
        window.setTimeout(() => btn.classList.remove("rb-taskbar-glow"), 1600);
      }
      // Buka jendela aplikasi (os-desktop-manager mendengarkan event ini).
      window.dispatchEvent(new CustomEvent("switch-os-app", { detail: appId }));
      if (!isOpen) openPanel();
    },
    [isOpen, openPanel]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      void sendMessage(input);
    },
    [input, sendMessage]
  );

  // === Drag (collapsed avatar) — pointer events, clamp ke viewport ===
  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      // Hanya drag dengan gerakan; klik biasa tetap membuka panel (logika
      // di onPointerUp: bila tidak bergerak jauh → anggap klik).
      const startX = e.clientX;
      const startY = e.clientY;
      const btn = e.currentTarget;
      const rect = btn.getBoundingClientRect();
      dragRef.current = { dx: startX - rect.left, dy: startY - rect.top };
      btn.setPointerCapture(e.pointerId);

      const handleMove = (ev: PointerEvent) => {
        if (!dragRef.current) return;
        const x = ev.clientX - dragRef.current.dx;
        const y = ev.clientY - dragRef.current.dy;
        // Clamp: jangan keluar layar, sisakan margin.
        const margin = 8;
        const size = 56;
        const maxX = window.innerWidth - size - margin;
        const maxY = window.innerHeight - size - margin;
        setPosition({
          x: Math.max(margin, Math.min(maxX, x)),
          y: Math.max(margin, Math.min(maxY, y)),
        });
      };
      const handleUp = (ev: PointerEvent) => {
        btn.removeEventListener("pointermove", handleMove);
        btn.removeEventListener("pointerup", handleUp);
        btn.removeEventListener("pointercancel", handleUp);
        const moved = Math.hypot(ev.clientX - startX, ev.clientY - startY);
        dragRef.current = null;
        if (moved < 6) {
          // Klik murni → toggle panel. Avatar tetap tampil saat panel terbuka,
          // jadi klik kedua menutupnya (sebelumnya avatar justru hilang).
          if (isOpen) closePanel();
          else openPanel();
        }
      };
      btn.addEventListener("pointermove", handleMove);
      btn.addEventListener("pointerup", handleUp);
      // Gestur dibatalkan (mis. browser ambil alih untuk scroll) → bersihkan
      // listener agar tidak bocor; anggap klik murni agar tetap bisa buka panel.
      btn.addEventListener("pointercancel", handleUp);
    },
    [openPanel, closePanel, isOpen]
  );

  /**
   * Quick prompt kontekstual: berbeda per aplikasi SigitOS yang sedang dibuka,
   * jadi selalu relevan dengan halaman yang dilihat pengunjung.
   */
  const quickPrompts = currentApp
    ? APP_QUICK_PROMPTS[currentApp].map((q) => (isEn ? q.en : q.id))
    : [t.retrobot_quick_1, t.retrobot_quick_2, t.retrobot_quick_3, t.retrobot_quick_4];

  const contextHint = currentApp ? t[`retrobot_context_${currentApp}`] : null;

  const posStyle = position
    ? { left: position.x, top: position.y, right: "auto", bottom: "auto" }
    : undefined;

  /**
   * Panel mengikuti robot: posisi dihitung dari rect avatar yang sebenarnya
   * (bukan dipaku pojok kanan-bawah), sehingga muncul di sekitar robot ke
   * mana pun ia di-drag. Flip sisi bila tidak muat di viewport.
   */
  useLayoutEffect(() => {
    if (!isOpen) {
      if (Object.keys(panelGeo).length) setPanelGeo({});
      return;
    }
    const el = avatarRef.current;
    if (!el) return;

    const PANEL_W = 360; // w-[22rem]
    const MAX_W = 448; // max-w-md
    const GAP = 10; // jarak panel ke avatar
    const M = 8; // margin pinggir layar

    const place = () => {
      const r = el.getBoundingClientRect();
      if (!r.width && !r.height) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const isNarrow = vw < 640;
      // Layar sempit memakai hampir seluruh lebar (sesuai perilaku lama).
      const w = Math.min(isNarrow ? vw - 2 * M : PANEL_W, MAX_W);

      // Horizontal: pinggir kanan panel sejajar kanan avatar; geser/flip
      // bila menyentuh tepi layar.
      let left = r.right - w;
      if (left < M) left = Math.min(r.left, vw - M - w);
      left = Math.max(M, Math.min(vw - M - w, left));

      // Vertikal: utamanya di ATAS avatar (robot terlihat di bawah panel).
      // Bila ruang atas terlalu sempit, panel muncul di bawah robot.
      const roomAbove = r.top - GAP - M;
      const roomBelow = vh - r.bottom - GAP - M;
      const maxH = Math.min(0.7 * vh, Math.max(roomAbove, roomBelow));
      const style: React.CSSProperties = {
        left,
        width: w,
        maxWidth: MAX_W,
        maxHeight: Math.max(160, maxH),
      };
      if (roomAbove >= roomBelow) {
        // tumbuh ke atas dari atas avatar
        style.bottom = vh - r.top + GAP;
        style.top = "auto";
        style.maxHeight = Math.max(160, Math.min(0.7 * vh, roomAbove));
      } else {
        style.top = r.bottom + GAP;
        style.bottom = "auto";
        style.maxHeight = Math.max(160, Math.min(0.7 * vh, roomBelow));
      }
      setPanelGeo(style);
    };

    place();
    // Robot bisa di-drag saat panel terbuka → posisi panel ikut berubah.
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
    // panelGeo sengaja di luar deps: place() menulisnya setiap kali, jadi
    // memasukkannya akan membuat loop render tanpa henti.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, position]);

  // HARUS setelah SELURUShook (termasuk useLayoutEffect di atas): bila ada
  // hook setelah baris ini, ia ter-skip saat flag OFF → melanggar aturan hook
  // (render berbeda jumlah hook). Letak ini adalah setelah hook terakhir.
  if (!enableTerminal) return null;

  return (
    // Tanpa aria-hidden di container: tombol avatar (aria-label tooltip) &
    // tombol dismiss greeting tetap focusable di dalam layer ini saat panel
    // tertutup — aria-hidden="true" pada ancestor focusable melanggar WCAG
    // (audit Lighthouse aria-hidden-focus). Dekorasi (scan ring, radar ping,
    // burst partikel) sudah punya aria-hidden sendiri; panel terbuka punya
    // role="dialog" + aria-label.
    <div className="fixed inset-0 z-50 pointer-events-none select-none">
      {/* Panel chat (expanded) — mengikuti posisi avatar (panelGeo) */}
      {isOpen && (
        <div
          // Container luar memegang maxHeight (dari panelGeo) + overflow-hidden;
          // inner flex-1 min-h-0 menyusut mengikuti ruang yang tersedia, jadi
          // kolom pesanlah yang ter-scroll, bukan footer/input yang terpotong.
          className="absolute pointer-events-auto flex flex-col overflow-hidden"
          style={panelGeo}
          role="dialog"
          aria-label={t.retrobot_window_title}
        >
          <div className="vt-window vt-window-pop rb-panel-in flex-1 min-h-0 flex flex-col shadow-2xl border-2 border-[var(--vt-edge-lo-2)] max-h-[70vh]">
            {/* Titlebar */}
            <div className="vt-titlebar flex items-center justify-between gap-2 px-2 py-1.5">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <RetroBotAvatar mood={mood} size={20} className="shrink-0" />
                {/* Tanpa truncate: teks status ("Neural Engine v2.6 // ...")
                    dipotong dan tidak terbaca sebelumnya. Biarkan wrap penuh. */}
                <div className="min-w-0">
                  {/* Jangan override warna ke --vt-ink: titlebar .vt-titlebar
                      punya background gradient navy gelap dengan teks putih
                      (--vt-titlebar-ink). --vt-ink hampir hitam → gelap di atas
                      gelap, tidak terbaca. Biarkan mewarisi warna titlebar. */}
                  <div className="font-pixel text-[10px] sm:text-[11px] font-bold text-white">
                    {t.retrobot_window_title}
                  </div>
                  <div className="font-mono text-[8px] text-white/80">
                    {t.retrobot_window_status}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={clearChat}
                  title={t.retrobot_clear}
                  aria-label={t.retrobot_clear}
                  className="vt-btn vt-btn-chrome h-6 w-6 p-0 flex items-center justify-center cursor-pointer"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={closePanel}
                  title={t.retrobot_close}
                  aria-label={t.retrobot_close}
                  className="vt-btn vt-btn-chrome h-6 w-6 p-0 flex items-center justify-center cursor-pointer hover:text-red-500"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2 vt-scrollbar font-mono text-[11px] bg-[var(--vt-card)]"
              aria-live="polite"
            >
              {messages.length === 0 && (
                <div className="vt-card-inset p-2.5 text-[var(--vt-ink)] leading-relaxed">
                  {t.retrobot_greeting}
                </div>
              )}
              {messages.length === 0 && contextHint && (
                <div className="flex items-start gap-1.5 px-1 text-[9px] leading-snug text-[var(--vt-ink)] opacity-80">
                  <MapPin className="h-2.5 w-2.5 shrink-0 mt-0.5" />
                  <span>{contextHint}</span>
                </div>
              )}
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`min-w-0 max-w-[92%] px-2.5 py-1.5 text-[11px] leading-relaxed whitespace-pre-line break-words overflow-wrap-anywhere ${
                      m.role === "user"
                        ? "vt-btn vt-btn-blue text-white"
                        : "vt-card-inset text-[var(--vt-ink)]"
                    }`}
                  >
                    {m.text}
                    {m.streaming && (
                      <span className="rb-cursor inline-block w-1.5 h-3 ml-0.5 bg-current align-middle" />
                    )}
                    {m.navTo && (
                      <button
                        type="button"
                        onClick={() => m.navTo && navigateToApp(m.navTo)}
                        disabled={isStreaming}
                        className="mt-1.5 vt-btn vt-btn-chrome px-2 py-0.5 text-[9px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-40"
                      >
                        <MapPin className="h-2.5 w-2.5 shrink-0" />
                        <span>{m.navLabel}</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {isStreaming && messages[messages.length - 1]?.streaming !== true && (
                <div className="flex justify-start">
                  <div className="vt-card-inset px-2.5 py-1.5 text-[var(--vt-ink)] opacity-80">
                    {t.retrobot_thinking}
                  </div>
                </div>
              )}
            </div>

            {/* Quick prompts */}
            {messages.length === 0 && (
              <div className="px-2 pb-1.5 flex flex-wrap gap-1">
                {quickPrompts.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => handleQuickPrompt(q)}
                    disabled={isStreaming}
                    className="vt-btn vt-btn-chrome px-2 py-0.5 text-[9px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-40"
                  >
                    <Sparkles className="h-2.5 w-2.5 shrink-0" />
                    <span>{q}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <form
              onSubmit={handleSubmit}
              className="p-2 border-t-2 border-[var(--vt-edge-lo-2)] flex items-center gap-1.5 bg-[var(--vt-chrome)]"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t.retrobot_placeholder}
                maxLength={500}
                disabled={isStreaming}
                aria-label={t.retrobot_placeholder}
                className="flex-1 min-w-0 bg-[var(--vt-paper)] border-2 border-[var(--vt-edge-lo-2)] px-2 py-1 text-[11px] font-mono text-[var(--vt-ink)] placeholder:text-[var(--vt-ink)] placeholder:opacity-50 focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isStreaming || !input.trim()}
                aria-label={t.retrobot_send}
                title={t.retrobot_send}
                className="vt-btn vt-btn-pink h-8 w-8 p-0 flex items-center justify-center text-white cursor-pointer disabled:opacity-40"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>

            {/* Footer: source badge + disclaimer */}
            <div className="px-2 py-1 flex items-center justify-between gap-2 border-t border-[var(--vt-edge-lo-2)] bg-[var(--vt-chrome)]">
              <span
                className={`font-mono text-[8px] font-bold px-1.5 py-0.5 ${
                  source === "cloud"
                    ? "bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/40"
                    : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40"
                }`}
              >
                {source === "cloud" ? t.retrobot_source_cloud : t.retrobot_source_local}
              </span>
              <span className="font-mono text-[8px] text-[var(--vt-ink)] opacity-80 text-right">
                {t.retrobot_disclaimer}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Avatar standby — selalu terlihat, juga saat panel terbuka. Sebelumnya
          ia dibungkus {!isOpen} sehingga robot "hilang" saat panel muncul dan
          tidak bisa diklik lagi untuk menutup. Ref ini dipakai panel untuk
          menghitung posisi (mengikuti robot ke mana pun ia di-drag). */}
      <div
        ref={avatarRef}
        // transition-all: saat navigateToApp() memindahkan avatar ke ikon
        // taskbar, ia "melayang" ke sana, bukan teleport (interaktivitas).
        className="absolute bottom-16 right-3 sm:bottom-20 sm:right-5 pointer-events-auto transition-all duration-500 ease-out"
        style={posStyle || undefined}
        onMouseEnter={() => {
          if (isOpen) return;
          const tips = isEn ? HOVER_TIPS_EN : HOVER_TIPS_ID;
          setHoverTip(tips[hoverIdxRef.current % tips.length]);
          hoverIdxRef.current += 1;
        }}
        onMouseLeave={() => setHoverTip(null)}
      >
        {/* Cincin pemindai berputar (idle) — efek radar retro di sekeliling
            avatar. Disembunyikan saat thinking (digantikan denyut radar). */}
        {mood === "idle" && (
          <span className="rb-scan-ring" aria-hidden="true" />
        )}
        {/* Denyut radar membesar saat thinking (mencari sinyal jawaban). */}
        {mood === "thinking" && (
          <>
            <span className="rb-ping-out" aria-hidden="true" />
            <span
              className="rb-ping-out"
              aria-hidden="true"
              style={{ animationDelay: "0.7s" }}
            />
          </>
        )}
        {/* Ledakan partikel kecil saat jawaban tiba (sekali per jawaban). */}
        {burstId > 0 && (
          <span key={burstId} className="pointer-events-none absolute inset-0" aria-hidden="true">
            {BURST_PARTICLES.map((p, idx) => (
              <span
                key={idx}
                className="rb-burst-p"
                style={{
                  background: p.color,
                  ["--bx" as string]: p.x,
                  ["--by" as string]: p.y,
                }}
              />
            ))}
          </span>
        )}
        {/* Hovertip kecil: pesan acak muncul saat kursor di atas avatar
            (hanya saat panel tertutup, agar tidak menumpuk greeting). */}
        {hoverTip && !isOpen && (
          <div className="rb-tip-in absolute bottom-full right-0 mb-2 w-40 vt-window p-1.5 shadow-lg">
            <p className="font-mono text-[9px] text-[var(--vt-ink)] leading-relaxed">
              {hoverTip}
            </p>
          </div>
        )}

        {/* Gelembung sapaan sekali tampil (bisa di-dismiss); sembunyi saat panel
            terbuka agar tidak menumpuk di atas panel. */}
        {showGreeting && !isOpen && (
          <div className="rb-pop absolute bottom-full right-0 mb-2 w-48 vt-window p-2 shadow-lg">
            <button
              type="button"
              onClick={dismissGreeting}
              aria-label={t.retrobot_close}
              className="absolute top-0.5 right-0.5 vt-btn vt-btn-chrome h-5 w-5 p-0 flex items-center justify-center cursor-pointer"
            >
              <X className="h-2.5 w-2.5" />
            </button>
            <p className="font-mono text-[9px] text-[var(--vt-ink)] leading-relaxed pr-4">
              {t.retrobot_greeting}
            </p>
          </div>
        )}

        <button
          type="button"
          onPointerDown={onPointerDown}
          title={t.retrobot_tooltip}
          aria-label={t.retrobot_tooltip}
          // touch-action-none wajib: tanpa itu browser mengambil alih gestur
          // sentuh untuk scroll → pointerup tidak pernah sampai → panel tidak
          // terbuka di mobile (pointercancel menggantikannya).
          // Tanpa border/kotak (vt-card-inset) — avatar mengambang bebas.
          className={`group relative p-1 cursor-pointer hover:scale-105 active:scale-95 transition-transform touch-action-none ${
            nudge ? "rb-nudge" : ""
          }`}
        >
          <RetroBotAvatar mood={mood} size={56} />
          {/* Cincin status online: ring lembut, bukan border keras */}
          <span className="absolute top-0.5 right-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-[var(--vt-paper)] animate-pulse" />
          {/* Penanda state aktif: avatar " menyala" saat panel terbuka, jadi
              pengunjung tahu robot bisa diklik lagi untuk menutup. */}
          {isOpen && (
            <span className="absolute inset-0 rounded-full ring-2 ring-primary/70 animate-pulse pointer-events-none" />
          )}
        </button>
      </div>
    </div>
  );
}
