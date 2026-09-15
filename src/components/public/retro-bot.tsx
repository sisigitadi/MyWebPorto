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
  useRef,
  useState,
} from "react";
import { Send, X, Trash2, Sparkles } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { playOS } from "@/lib/os-sound";
import { RetroBotAvatar, type RetroBotMood } from "./retro-bot-avatar";

type Source = "local" | "cloud" | null;

interface Message {
  id: string;
  role: "user" | "assistant";
  // text = teks final; streaming = teks yang masih diketik (belum final)
  text: string;
  streaming?: boolean;
  source?: Source;
}

const STORAGE_DISMISSED = "sigitos_bot_greeting_dismissed";
const MAX_HISTORY_SEND = 4;

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function RetroBot() {
  const { t, language } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [mood, setMood] = useState<RetroBotMood>("idle");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [source, setSource] = useState<Source>(null);
  const [showGreeting, setShowGreeting] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);

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

  /** Kirim pertanyaan ke /api/retrobot dan konsumsi SSE. */
  const sendMessage = useCallback(
    async (raw: string) => {
      const text = raw.trim().slice(0, 500);
      if (!text || isStreaming) return;

      setInput("");
      playOS("click");
      setMood("thinking");

      const history = messages
        .filter((m) => !m.streaming)
        .slice(-MAX_HISTORY_SEND)
        .map((m) => ({ role: m.role, content: m.text }));

      const userMsg: Message = { id: uid(), role: "user", text };
      const botId = uid();
      setMessages((prev) => [
        ...prev,
        userMsg,
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
          body: JSON.stringify({ text, lang: isEn ? "en" : "id", history }),
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
    [isStreaming, messages, isEn, t]
  );

  const handleQuickPrompt = useCallback(
    (q: string) => {
      if (isStreaming) return;
      void sendMessage(q);
    },
    [isStreaming, sendMessage]
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
          // Klik murni → buka panel.
          openPanel();
        }
      };
      btn.addEventListener("pointermove", handleMove);
      btn.addEventListener("pointerup", handleUp);
      // Gestur dibatalkan (mis. browser ambil alih untuk scroll) → bersihkan
      // listener agar tidak bocor; anggap klik murni agar tetap bisa buka panel.
      btn.addEventListener("pointercancel", handleUp);
    },
    [openPanel]
  );

  const quickPrompts = [
    t.retrobot_quick_1,
    t.retrobot_quick_2,
    t.retrobot_quick_3,
    t.retrobot_quick_4,
  ];

  const posStyle = position
    ? { left: position.x, top: position.y, right: "auto", bottom: "auto" }
    : undefined;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none select-none" aria-hidden={isOpen ? "false" : "true"}>
      {/* Panel chat (expanded) */}
      {isOpen && (
        <div
          className="absolute bottom-3 right-3 sm:bottom-5 sm:right-5 w-[calc(100vw-1.5rem)] sm:w-80 max-w-sm pointer-events-auto"
          role="dialog"
          aria-label={t.retrobot_window_title}
        >
          <div className="vt-window vt-window-pop flex flex-col shadow-2xl border-2 border-[var(--vt-edge-lo-2)] max-h-[70vh]">
            {/* Titlebar */}
            <div className="vt-titlebar flex items-center justify-between gap-2 px-2 py-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <RetroBotAvatar mood={mood} size={20} className="shrink-0" />
                <div className="min-w-0">
                  <div className="font-pixel text-[10px] sm:text-[11px] font-bold text-[var(--vt-ink)] truncate">
                    {t.retrobot_window_title}
                  </div>
                  <div className="font-mono text-[8px] text-[var(--vt-ink)] opacity-70 truncate">
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
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[88%] px-2.5 py-1.5 text-[11px] leading-relaxed whitespace-pre-line break-words ${
                      m.role === "user"
                        ? "vt-btn vt-btn-blue text-white"
                        : "vt-card-inset text-[var(--vt-ink)]"
                    }`}
                  >
                    {m.text}
                    {m.streaming && (
                      <span className="rb-cursor inline-block w-1.5 h-3 ml-0.5 bg-current align-middle" />
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
                    <Sparkles className="h-2.5 w-2.5" />
                    <span className="truncate max-w-[120px]">{q}</span>
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
                className="flex-1 min-w-0 bg-[var(--vt-paper)] border-2 border-[var(--vt-edge-lo-2)] px-2 py-1 text-[11px] font-mono text-[var(--vt-ink)] placeholder:text-[var(--vt-ink)] placeholder:opacity-40 focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
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
              <span className="font-mono text-[8px] text-[var(--vt-ink)] opacity-60 text-right truncate">
                {t.retrobot_disclaimer}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Avatar standby (collapsed) — di luar panel, selalu terlihat */}
      {!isOpen && (
        <div
          className="absolute bottom-16 right-3 sm:bottom-20 sm:right-5 pointer-events-auto"
          style={posStyle || undefined}
        >
          {/* Gelembung sapaan sekali tampil (bisa di-dismiss) */}
          {showGreeting && (
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
            className="group relative p-1 cursor-pointer hover:scale-105 active:scale-95 transition-transform touch-action-none"
          >
            <RetroBotAvatar mood={mood} size={56} />
            {/* Cincin status online: ring lembut, bukan border keras */}
            <span className="absolute top-0.5 right-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-[var(--vt-paper)] animate-pulse" />
          </button>
        </div>
      )}
    </div>
  );
}
