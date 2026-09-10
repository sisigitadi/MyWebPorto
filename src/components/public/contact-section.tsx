"use client";

import React, { useState, useRef } from "react";
import { Send, CheckCircle2, AlertCircle, RefreshCw, Mail, MessageSquare, MapPin, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ProfileData } from "@/lib/dummy-data";
import { useTranslation } from "@/lib/i18n";
import { OSWindow } from "@/components/public/os/os-window";
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

  // Handle Formspree AJAX Submission
  const handleMailerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitStatus("loading");
    setStatusMessage(
      language === "en"
        ? "TRANSMITTING VIA GATEWAY PROTOCOL..."
        : "MENGIRIMKAN DATA MELALUI PROTOKOL GATEWAY..."
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
            ? "MESSAGE DISPATCHED! Message successfully delivered to Sigit Adi."
            : "PESAN TERKIRIM! Pesan berhasil diteruskan ke Sigit Adi."
        );
        setFormData({ name: "", email: "", subject: "", message: "" });
      } else {
        setSubmitStatus("error");
        setStatusMessage(
          language === "en"
            ? "FAILED: Unable to dispatch message. Please check your connection or contact directly."
            : "GAGAL: Gagal mengirimkan pesan. Silakan hubungi langsung via kontak yang tersedia."
        );
      }
    } catch {
      setSubmitStatus("error");
      setStatusMessage(
        language === "en"
          ? "NETWORK ERROR: Could not reach mail server."
          : "NETWORK ERROR: Tidak dapat terhubung ke server pesan."
      );
    }
  };

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
            <span>COMMUNICATION_CENTER // DIRECT DISPATCH & INBOX</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-[var(--vt-ink)]">
            {t.contact_title}
          </h2>
          <p className="text-xs sm:text-sm font-mono text-[var(--vt-ink)] font-medium mt-1 max-w-2xl">
            {t.contact_subtitle}
          </p>
        </div>

        {/* Dual Window Grid: Info & Mailer Form */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Window 1: Direct Channels & Information */}
          <div className="sigit-contact-window lg:col-span-5 flex flex-col">
            <OSWindow
              title="Channels_Info.txt // Direct Contact"
              icon={<Mail className="h-3.5 w-3.5 text-[#38bdf8]" />}
              statusText="Status: Available for Work & Projects"
              className="h-full flex-1"
              bodyClassName="p-4 sm:p-5 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-4 font-mono text-xs text-[var(--vt-ink)]">
                <div>
                  <h3 className="font-bold text-sm text-[var(--vt-ink)] mb-1 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    <span>{t.contact_direct_channels_title}</span>
                  </h3>
                  <p className="text-muted-foreground leading-relaxed text-xs">
                    {t.contact_direct_channels_desc}
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="p-3 vt-card-inset bg-[var(--vt-card)] rounded border border-[var(--vt-edge-lo-2)]">
                    <div className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1.5 mb-1">
                      <Mail className="h-3 w-3 text-primary" />
                      <span>{t.contact_email_label}</span>
                    </div>
                    <a
                      href={`mailto:${profile.email}`}
                      className="font-bold text-primary hover:underline break-all"
                    >
                      {profile.email}
                    </a>
                  </div>

                  {profile.location && (
                    <div className="p-3 vt-card-inset bg-[var(--vt-card)] rounded border border-[var(--vt-edge-lo-2)]">
                      <div className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1.5 mb-1">
                        <MapPin className="h-3 w-3 text-primary" />
                        <span>{t.contact_location_label}</span>
                      </div>
                      <span className="font-bold">{profile.location}</span>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-muted/40 rounded border border-dashed border-border text-[11px] leading-relaxed">
                  <span className="font-bold text-primary block mb-1">
                    {language === "en" ? "💡 Looking for AI Assistant?" : "💡 Mencari AI Assistant?"}
                  </span>
                  <span>
                    {language === "en"
                      ? "Sigit_Bot is now fully integrated into Terminal.bat! Open Terminal from the taskbar or Start menu to chat with Sigit_Bot."
                      : "Sigit_Bot kini telah dipindahkan dan terintegrasi penuh ke Terminal.bat! Buka Terminal dari taskbar atau Start menu untuk berinteraksi langsung."}
                  </span>
                </div>
              </div>

              <div className="pt-2 text-[11px] text-muted-foreground font-mono flex items-center gap-1">
                <span>Direct response SLA: under 24 hours</span>
              </div>
            </OSWindow>
          </div>

          {/* Window 2: Direct Mailer Form */}
          <div className="sigit-contact-window lg:col-span-7 flex flex-col">
            <OSWindow
              title="Sigit_Mailer.exe // Send Message"
              icon={<Send className="h-3.5 w-3.5 text-[#37ff9b]" />}
              statusText="Gateway: Direct Dispatch Protocol"
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

                {/* Submit button */}
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
