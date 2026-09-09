"use client";

import React, { useRef } from "react";
import { Mail, MapPin, Send, ExternalLink, MessageSquare } from "lucide-react";
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

  const gmailDirectUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
    profile.email
  )}`;

  return (
    <section
      ref={containerRef}
      id="kontak"
      className="relative py-12 md:py-20 scroll-mt-14"
    >
      <div className="max-w-7xl mx-auto px-2 sm:px-4">
        {/* Section Heading */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2 font-pixel text-xs text-[var(--vt-blue)]">
            <span className="h-2 w-2 rounded-full bg-[var(--vt-blue)] animate-pulse" />
            <span>MAIL_DISPATCH // HUBUNGI & DISKUSI PROYEK</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-display tracking-tight text-[var(--vt-ink)]">
            {t.contact_title}
          </h2>
          <p className="text-xs sm:text-sm font-mono text-[var(--vt-ink-soft)] mt-1 max-w-2xl">
            {t.contact_subtitle}
          </p>
        </div>

        {/* Dual Window Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Window 1: Contact Info Card */}
          <div className="sigit-contact-window lg:col-span-5 flex flex-col">
            <OSWindow
              title="Contact_Card.vcf // Direct Channels"
              icon={<Mail className="h-3 w-3 text-[#ffd400]" />}
              statusText="Network: Connected // Ready to reply"
              className="h-full flex-1"
              bodyClassName="flex flex-col justify-between h-full space-y-6"
            >
              <div className="space-y-4">
                <div className="vt-card-inset p-3 bg-card border-l-4 border-l-[var(--vt-blue)]">
                  <h3 className="font-mono text-sm font-bold text-[var(--vt-ink)]">
                    Saluran Komunikasi Langsung
                  </h3>
                  <p className="font-mono text-xs text-[var(--vt-ink-soft)] mt-1 leading-relaxed">
                    Tertarik mengembangkan website bisnis, aplikasi custom, atau konsultasi UI/UX? Kirim pesan langsung ke email atau form berikut.
                  </p>
                </div>

                {/* Email Box */}
                <div className="vt-card-inset p-3 bg-[var(--vt-card)] space-y-1">
                  <span className="font-pixel text-[10px] text-[var(--vt-ink-mute)] uppercase">
                    {t.contact_email_label}:
                  </span>
                  <a
                    href={gmailDirectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 font-mono text-xs sm:text-sm font-bold text-[var(--vt-blue)] hover:underline"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    <span className="truncate">{profile.email}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                {/* Location Box */}
                <div className="vt-card-inset p-3 bg-[var(--vt-card)] space-y-1">
                  <span className="font-pixel text-[10px] text-muted-foreground uppercase">
                    {t.contact_location_label}:
                  </span>
                  <p className="flex items-center gap-2 font-mono text-xs sm:text-sm font-bold text-foreground">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    <span>{profile.location}</span>
                  </p>
                </div>
              </div>

              {/* Direct Gmail Action */}
              <div className="pt-3 border-t border-border/80">
                <a
                  href={gmailDirectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="vt-btn vt-btn-chrome w-full py-2 px-3 text-xs font-bold font-mono text-foreground justify-center"
                >
                  <Mail className="h-3.5 w-3.5 text-rose-500 mr-1.5" />
                  <span>{language === "id" ? "Buka di Gmail Langsung" : "Open in Gmail Direct"}</span>
                </a>
              </div>
            </OSWindow>
          </div>

          {/* Window 2: Interactive Mailer Form */}
          <div className="sigit-contact-window lg:col-span-7 flex flex-col">
            <OSWindow
              title="Sigit_Mailer.exe // Send Message"
              icon={<MessageSquare className="h-3 w-3 text-[#37ff9b]" />}
              statusText="Protocol: SMTP Direct Mail // Ready"
              className="h-full flex-1"
              bodyClassName="p-4 sm:p-6"
            >
              <form
                action={`mailto:${profile.email}`}
                method="GET"
                className="space-y-4 font-mono text-xs"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="sender-name" className="text-xs font-bold font-mono text-[var(--vt-ink)]">
                      {t.contact_name_label} *
                    </Label>
                    <Input
                      id="sender-name"
                      name="name"
                      placeholder={t.contact_name_placeholder}
                      required
                      className="vt-card-inset bg-[var(--vt-paper)] text-[var(--vt-ink)] border border-[var(--vt-edge-lo-2)] text-xs font-mono h-9 placeholder:text-[var(--vt-ink-mute)]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="sender-subject" className="text-xs font-bold font-mono text-[var(--vt-ink)]">
                      {t.contact_subject_label} *
                    </Label>
                    <Input
                      id="sender-subject"
                      name="subject"
                      placeholder={t.contact_subject_placeholder}
                      required
                      className="vt-card-inset bg-[var(--vt-paper)] text-[var(--vt-ink)] border border-[var(--vt-edge-lo-2)] text-xs font-mono h-9 placeholder:text-[var(--vt-ink-mute)]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="sender-body" className="text-xs font-bold font-mono text-[var(--vt-ink)]">
                    {t.contact_message_label} *
                  </Label>
                  <Textarea
                    id="sender-body"
                    name="body"
                    placeholder={t.contact_message_placeholder}
                    rows={5}
                    required
                    className="vt-card-inset bg-[var(--vt-paper)] text-[var(--vt-ink)] border border-[var(--vt-edge-lo-2)] text-xs font-mono leading-relaxed placeholder:text-[var(--vt-ink-mute)]"
                  />
                </div>

                {/* Submit button with sweep sheen effect */}
                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <button
                    type="submit"
                    className="vt-btn vt-btn-pink vt-btn-sweep flex-1 py-2.5 px-4 text-xs font-bold font-mono tracking-wider"
                  >
                    <Send className="h-3.5 w-3.5 mr-1.5" />
                    <span>{t.contact_send_btn}</span>
                  </button>

                  <a
                    href={gmailDirectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="vt-btn vt-btn-chrome py-2.5 px-4 text-xs font-bold font-mono text-foreground justify-center"
                  >
                    <span>{language === "id" ? "Buka Gmail" : "Open Gmail"}</span>
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </div>
              </form>
            </OSWindow>
          </div>
        </div>
      </div>
    </section>
  );
}
