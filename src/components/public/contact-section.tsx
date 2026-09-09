"use client";

import React, { useState, useRef } from "react";
import { Send, Bot, Sparkles, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ProfileData } from "@/lib/dummy-data";
import { useTranslation } from "@/lib/i18n";
import { OSWindow } from "@/components/public/os/os-window";
import { queryAIEngine, AIMessage } from "@/lib/ai-engine";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface ContactSectionProps {
  profile: ProfileData;
}

export function ContactSection({ profile }: ContactSectionProps) {
  const { t, language } = useTranslation();
  const containerRef = useRef<HTMLElement>(null);

  // --- State for AI Bot Window ---
  const [chatMessages, setChatMessages] = useState<AIMessage[]>([
    {
      id: "init-1",
      sender: "bot",
      text:
        language === "en"
          ? `Hello! I am Sigit_Bot.ai (Neural Engine v2.6). Feel free to ask anything about ${profile.name}, development services, tech stack, or project collaborations!`
          : `Halo! Saya Sigit_Bot.ai (Neural Engine v2.6). Tanyakan apa saja tentang ${profile.name}, keahlian teknis, layanan website/otomasi, atau penawaran kerja sama!`,
      timestamp: "09:00",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isBotThinking, setIsBotThinking] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // --- State for Formspree Mailer ---
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [submitStatus, setSubmitStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");

  useGSAP(
    () => {
      gsap.from(".sigit-contact-window", {
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 80%",
          toggleActions: "play none none none",
        },
        opacity: 0,
        y: 40,
        stagger: 0.15,
        duration: 0.85,
        ease: "power3.out",
        clearProps: "all",
      });
    },
    { scope: containerRef }
  );

  // Handle AI Bot Query
  const handleSendChat = (textToSend?: string) => {
    const text = (textToSend || chatInput).trim();
    if (!text) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsg: AIMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text,
      timestamp: timeStr,
    };

    setChatMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setChatInput("");
    setIsBotThinking(true);

    setTimeout(() => {
      chatScrollRef.current?.scrollTo({
        top: chatScrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }, 50);

    setTimeout(() => {
      const response = queryAIEngine(text, language);
      const botMsg: AIMessage = {
        id: `bot-${Date.now()}`,
        sender: "bot",
        text: response.text,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setChatMessages((prev) => [...prev, botMsg]);
      setIsBotThinking(false);

      setTimeout(() => {
        chatScrollRef.current?.scrollTo({
          top: chatScrollRef.current.scrollHeight,
          behavior: "smooth",
        });
      }, 50);
    }, 320);
  };

  // Handle Formspree AJAX Submission
  const handleMailerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitStatus("loading");
    setStatusMessage(
      language === "en"
        ? "TRANSMITTING VIA FORMSPREE PROTOCOL..."
        : "MENGIRIMKAN DATA MELALUI FORMSPREE PROTOCOL..."
    );

    try {
      const res = await fetch("https://formspree.io/f/mkgknrqk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          subject: formData.subject,
          message: formData.message,
        }),
      });

      if (res.ok) {
        setSubmitStatus("success");
        setStatusMessage(
          language === "en"
            ? "MESSAGE DISPATCHED! Formspree confirmed delivery to Sigit Adi."
            : "PESAN TERKIRIM! Gateway Formspree mengonfirmasi pesan telah diteruskan ke Sigit Adi."
        );
        setFormData({ name: "", email: "", subject: "", message: "" });
      } else {
        setSubmitStatus("error");
        setStatusMessage(
          language === "en"
            ? "FAILED: Unable to dispatch packet. Please check your connection or contact directly."
            : "GAGAL: Gagal mengirimkan pesan melalui Formspree. Silakan hubungi langsung via email."
        );
      }
    } catch {
      setSubmitStatus("error");
      setStatusMessage(
        language === "en"
          ? "NETWORK ERROR: Could not reach Formspree endpoint."
          : "NETWORK ERROR: Tidak dapat terhubung ke endpoint Formspree."
      );
    }
  };

  const quickBotPrompts = [
    language === "en" ? "Who is Sigit Adi?" : "Siapa Sigit Adi?",
    language === "en" ? "Tech stack & skills" : "Keahlian & teknologi",
    language === "en" ? "Services & hire" : "Layanan & pembuatan web",
    language === "en" ? "Direct contact channels" : "Kontak langsung",
  ];

  return (
    <section
      ref={containerRef}
      id="kontak"
      className="relative py-8 md:py-14 scroll-mt-14"
    >
      <div className="max-w-7xl mx-auto px-2 sm:px-4">
        {/* Section Heading */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1.5 font-pixel text-xs text-[var(--vt-blue)]">
            <span className="h-2 w-2 rounded-full bg-[var(--vt-blue)] animate-pulse" />
            <span>COMMUNICATION_CENTER // AI ASSISTANT & DIRECT DISPATCH</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-[var(--vt-ink)]">
            {t.contact_title}
          </h2>
          <p className="text-xs sm:text-sm font-mono text-[var(--vt-ink)] font-medium mt-1 max-w-2xl">
            {t.contact_subtitle}
          </p>
        </div>

        {/* Dual Window Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Window 1: Interactive AI Bot (Sigit_Bot.ai) */}
          <div className="sigit-contact-window lg:col-span-6 flex flex-col">
            <OSWindow
              title="Sigit_Bot.ai // Neural Assistant"
              icon={<Bot className="h-3.5 w-3.5 text-[#38bdf8]" />}
              statusText="Model: SigitOS NLP v2.6 // In-Browser Inference"
              className="h-full flex-1"
              bodyClassName="flex flex-col h-full p-3 sm:p-4 space-y-3"
            >
              {/* AI Badge header */}
              <div className="flex items-center justify-between px-2 py-1.5 vt-card-inset bg-[var(--vt-card)] text-[11px] font-mono border-l-3 border-l-primary">
                <div className="flex items-center gap-1.5 text-[var(--vt-ink)] font-bold">
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  <span>MACHINE LEARNING ENGINE</span>
                </div>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                  ONLINE [0ms LATENCY]
                </span>
              </div>

              {/* Chat Message Stream */}
              <div
                ref={chatScrollRef}
                className="flex-1 h-64 sm:h-80 overflow-y-auto space-y-2.5 p-2 vt-card-inset bg-[var(--vt-paper)] scrollbar-thin text-xs font-mono"
              >
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.sender === "user" ? "items-end" : "items-start"
                    }`}
                  >
                    <div className="flex items-center gap-1 text-[10px] text-[var(--vt-ink-mute)] font-bold mb-0.5">
                      <span>{msg.sender === "user" ? "You" : "Sigit_Bot.ai"}</span>
                      <span>•</span>
                      <span>{msg.timestamp}</span>
                    </div>
                    <div
                      className={`max-w-[90%] p-2.5 rounded-xs leading-relaxed ${
                        msg.sender === "user"
                          ? "bg-[var(--vt-navy)] text-white font-mono shadow-sm"
                          : "bg-card border border-[var(--vt-edge-lo-2)] text-[var(--vt-ink)] shadow-xs"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  </div>
                ))}
                {isBotThinking && (
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--vt-blue)] italic">
                    <span className="animate-spin">⟳</span>
                    <span>Sigit_Bot.ai inferencing neural weights...</span>
                  </div>
                )}
              </div>

              {/* Quick Prompts */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {quickBotPrompts.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => handleSendChat(q)}
                    className="px-2 py-0.5 text-[10px] font-mono font-bold vt-card-inset bg-muted text-[var(--vt-ink)] hover:bg-primary/20 transition-colors cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>

              {/* Chat Input form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendChat();
                }}
                className="flex items-center gap-2 pt-1"
              >
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={
                    language === "en"
                      ? "Ask the AI bot anything about Sigit..."
                      : "Tanyakan apa saja kepada AI bot seputar Sigit..."
                  }
                  className="flex-1 vt-card-inset bg-[var(--vt-paper)] text-[var(--vt-ink)] border border-[var(--vt-edge-lo-2)] text-xs font-mono h-8.5"
                />
                <button
                  type="submit"
                  disabled={isBotThinking || !chatInput.trim()}
                  className="vt-btn vt-btn-pink h-8.5 px-3 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Send className="h-3 w-3" />
                  <span>KIRIM</span>
                </button>
              </form>
            </OSWindow>
          </div>

          {/* Window 2: Direct Mailer Form (Formspree Integrated) */}
          <div className="sigit-contact-window lg:col-span-6 flex flex-col">
            <OSWindow
              title="Sigit_Mailer.exe // Send Message"
              icon={<Send className="h-3.5 w-3.5 text-[#37ff9b]" />}
              statusText="Gateway: Formspree API // mkgknrqk"
              className="h-full flex-1"
              bodyClassName="p-4 sm:p-5 flex flex-col justify-between"
            >
              <form onSubmit={handleMailerSubmit} className="space-y-3.5 font-mono text-xs">
                {/* Form feedback alert banner */}
                {statusMessage && (
                  <div
                    className={`p-2.5 rounded-xs text-[11px] font-mono flex items-center gap-2 border ${
                      submitStatus === "success"
                        ? "bg-emerald-950/20 border-emerald-500 text-emerald-700 dark:text-emerald-300"
                        : submitStatus === "error"
                        ? "bg-rose-950/20 border-rose-500 text-rose-700 dark:text-rose-300"
                        : "bg-blue-950/20 border-blue-500 text-blue-700 dark:text-blue-300"
                    }`}
                  >
                    {submitStatus === "success" && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                    {submitStatus === "error" && <AlertCircle className="h-4 w-4 shrink-0" />}
                    {submitStatus === "loading" && <RefreshCw className="h-4 w-4 shrink-0 animate-spin" />}
                    <span>{statusMessage}</span>
                  </div>
                )}

                {/* Name & Email Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="sender-name" className="text-xs font-bold font-mono text-[var(--vt-ink)]">
                      {t.contact_name_label} *
                    </Label>
                    <Input
                      id="sender-name"
                      name="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={t.contact_name_placeholder}
                      required
                      className="vt-card-inset bg-[var(--vt-paper)] text-[var(--vt-ink)] border border-[var(--vt-edge-lo-2)] text-xs font-mono h-9 placeholder:text-[var(--vt-ink-mute)]"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="sender-email" className="text-xs font-bold font-mono text-[var(--vt-ink)]">
                      {language === "en" ? "Your Email Address *" : "Alamat Email Anda *"}
                    </Label>
                    <Input
                      id="sender-email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="nama@domain.com"
                      required
                      className="vt-card-inset bg-[var(--vt-paper)] text-[var(--vt-ink)] border border-[var(--vt-edge-lo-2)] text-xs font-mono h-9 placeholder:text-[var(--vt-ink-mute)]"
                    />
                  </div>
                </div>

                {/* Subject Input */}
                <div className="space-y-1">
                  <Label htmlFor="sender-subject" className="text-xs font-bold font-mono text-[var(--vt-ink)]">
                    {t.contact_subject_label} *
                  </Label>
                  <Input
                    id="sender-subject"
                    name="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder={t.contact_subject_placeholder}
                    required
                    className="vt-card-inset bg-[var(--vt-paper)] text-[var(--vt-ink)] border border-[var(--vt-edge-lo-2)] text-xs font-mono h-9 placeholder:text-[var(--vt-ink-mute)]"
                  />
                </div>

                {/* Message Textarea */}
                <div className="space-y-1">
                  <Label htmlFor="sender-message" className="text-xs font-bold font-mono text-[var(--vt-ink)]">
                    {t.contact_message_label} *
                  </Label>
                  <Textarea
                    id="sender-message"
                    name="message"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder={t.contact_message_placeholder}
                    rows={4}
                    required
                    className="vt-card-inset bg-[var(--vt-paper)] text-[var(--vt-ink)] border border-[var(--vt-edge-lo-2)] text-xs font-mono leading-relaxed placeholder:text-[var(--vt-ink-mute)]"
                  />
                </div>

                {/* Submit button only (hapus teks "buka di email" completely) */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitStatus === "loading"}
                    className="vt-btn vt-btn-pink vt-btn-sweep w-full py-2.5 px-4 text-xs font-bold font-mono tracking-wider cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>
                      {submitStatus === "loading"
                        ? language === "en" ? "TRANSMITTING..." : "MENGIRIMKAN..."
                        : t.contact_send_btn}
                    </span>
                  </button>
                </div>
              </form>
            </OSWindow>
          </div>
        </div>
      </div>
    </section>
  );
}
