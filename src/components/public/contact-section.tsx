"use client";

import React, { useEffect, useState, useRef } from "react";
import { Send, CheckCircle2, AlertCircle, RefreshCw, Mail, ShieldCheck, Globe } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ProfileData } from "@/lib/dummy-data";
import { useTranslation } from "@/lib/i18n";
import { OSWindow } from "@/components/public/os/os-window";
import { buildSocialLinks } from "@/components/public/social-icons";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface ContactSectionProps {
  profile?: ProfileData;
}

const FALLBACK_CONTACT_EMAIL = "x@sigitadi.id";
const CONFIGURED_CONTACT_EMAIL =
  (process.env.NEXT_PUBLIC_CONTACT_RECIPIENT_EMAIL || FALLBACK_CONTACT_EMAIL).trim();
const FORMSPREE_ENDPOINT =
  (process.env.NEXT_PUBLIC_FORMSPREE_ENDPOINT || "https://formspree.io/f/mkgknrqk").trim();

export function ContactSection({ profile }: ContactSectionProps) {
  const { t, language } = useTranslation();
  const containerRef = useRef<HTMLElement>(null);
  const contactEmail = CONFIGURED_CONTACT_EMAIL || profile?.email || FALLBACK_CONTACT_EMAIL;
  const socialLinks = profile ? buildSocialLinks(profile) : [];

  // --- State for Formspree Mailer ---
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [submitStatus, setSubmitStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    let subject = sessionStorage.getItem("contactSubject");
    let body = sessionStorage.getItem("contactBody");

    if (subject || body) {
      sessionStorage.removeItem("contactSubject");
      sessionStorage.removeItem("contactBody");
    } else {
      const params = new URLSearchParams(window.location.search);
      subject = params.get("contactSubject");
      body = params.get("contactBody");
    }

    if (!subject && !body) return;

    setFormData((current) => ({
      ...current,
      subject: subject || current.subject,
      message: body || current.message,
    }));
  }, []);

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
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          subject: formData.subject,
          _subject: formData.subject,
          message: formData.message,
          _replyto: formData.email,
          _to: contactEmail,
          to: contactEmail,
          recipient: contactEmail,
          email_to: contactEmail,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setSubmitStatus("success");
        setStatusMessage(
          language === "en"
            ? `MESSAGE DISPATCHED! Message successfully submitted for ${contactEmail}.`
            : `PESAN TERKIRIM! Pesan berhasil diteruskan untuk ${contactEmail}.`
        );
        setFormData({ name: "", email: "", subject: "", message: "" });
      } else {
        setSubmitStatus("error");
        setStatusMessage(
          data.error || (language === "en"
            ? "FAILED: Unable to dispatch message. Please check your connection or contact directly."
            : "GAGAL: Gagal mengirimkan pesan. Silakan hubungi langsung via kontak yang tersedia.")
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
      <div className="max-w-4xl mx-auto px-2 sm:px-4">
        {/* Section Heading */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1.5 font-pixel text-xs text-[var(--vt-blue)]">
            <span className="h-2 w-2 rounded-full bg-[var(--vt-blue)] animate-pulse" />
            <span>COMMUNICATION_CENTER // DIRECT DISPATCH & INBOX</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-[var(--vt-ink)]">
            {t.contact_title}
          </h2>
          <p className="text-xs sm:text-sm font-mono text-[var(--vt-ink)] font-bold mt-1 max-w-2xl">
            {t.contact_subtitle}
          </p>
        </div>

        {/* Direct Mailer Form Window */}
        <div className="sigit-contact-window w-full flex flex-col">
          <OSWindow
            title="Sigit_Mailer.exe // Send Message"
            icon={<Send className="h-3.5 w-3.5 text-[#37ff9b]" />}
            statusText={`Gateway: Formspree -> ${contactEmail}`}
            className="w-full flex-1"
            bodyClassName="p-4 sm:p-6 flex flex-col justify-between"
          >
            <form onSubmit={handleMailerSubmit} className="space-y-3.5 font-mono text-xs">
              <div className="vt-card-inset bg-[var(--vt-card)] border border-[var(--vt-edge-lo-2)] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[var(--vt-ink)]">
                <div className="flex items-start gap-2 min-w-0">
                  <Mail className="h-4 w-4 text-[var(--vt-blue)] shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="font-pixel text-[10px] sm:text-xs font-bold tracking-wide uppercase text-[var(--vt-ink)]">
                      {language === "en" ? "Destination Inbox" : "Inbox Tujuan"}
                    </p>
                    <p className="font-mono text-sm sm:text-base font-extrabold text-[var(--vt-ink)] break-all leading-snug">
                      {contactEmail}
                    </p>
                  </div>
                </div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[var(--vt-paper)] border border-[var(--vt-edge-lo-2)] text-[10px] font-extrabold text-[var(--vt-ink)] shrink-0">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-300" />
                  <span>{language === "en" ? "DIRECT MAILER" : "MAILER LANGSUNG"}</span>
                </div>
              </div>

              {/* Form feedback alert banner */}
              {statusMessage && (
                <div
                  className={`vt-status-banner p-2.5 rounded-xs text-[11px] font-mono font-bold flex items-center gap-2 border-2 ${
                    submitStatus === "success"
                      ? "vt-status-success"
                      : submitStatus === "error"
                      ? "vt-status-error"
                      : "vt-status-loading"
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
                    placeholder={language === "en" ? "name@domain.com" : "nama@domain.com"}
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

        {/* Social Channels (conditional) */}
        {socialLinks.length > 0 && (
          <div className="sigit-contact-window w-full flex flex-col mt-6">
            <OSWindow
              title="Sigit_Connect.exe // Social Channels"
              icon={<Globe className="h-3.5 w-3.5 text-[#37ff9b]" />}
              statusText={`${socialLinks.length} channel(s) ready // Direct Links`}
              className="w-full"
            >
              <div className="flex flex-wrap gap-2">
                {socialLinks.map((link) => (
                  <a
                    key={link.key}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={link.label}
                    className="vt-btn vt-btn-chrome inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold text-[var(--vt-ink)] hover:-translate-y-0.5 transition-all"
                  >
                    {link.icon}
                    <span>{link.label}</span>
                  </a>
                ))}
              </div>
            </OSWindow>
          </div>
        )}
      </div>
    </section>
  );
}
