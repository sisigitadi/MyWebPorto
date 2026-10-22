"use client";

import React, { useRef } from "react";
import { ArrowRight, Mail, Briefcase, CheckCircle2, Check } from "lucide-react";
import { ServiceData, ProfileData } from "@/lib/dummy-data";
import { useTranslation } from "@/lib/i18n";
import { OSWindow } from "@/components/public/os/os-window";
import { ServiceSchematic } from "@/components/public/service-schematic";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { prefillContact, CONTACT_SECTION_HREF } from "@/lib/contact-link";
import { ShareButton } from "@/components/public/share-button";

gsap.registerPlugin(ScrollTrigger);

interface ServicesSectionProps {
  services: ServiceData[];
  profile: ProfileData;
}

interface ParsedServiceContent {
  summary: string;
  deliverables: string[];
}

function parseServiceContent(rawDescription?: string | null): ParsedServiceContent {
  if (!rawDescription) return { summary: "", deliverables: [] };

  const lines = rawDescription
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const summaryParts: string[] = [];
  const deliverables: string[] = [];

  for (const line of lines) {
    if (
      line.startsWith("- ") ||
      line.startsWith("• ") ||
      line.startsWith("* ") ||
      /^\d+[\.)]\s+/.test(line)
    ) {
      deliverables.push(line.replace(/^([-•*]|\d+[\.)])\s*/, "").trim());
    } else {
      summaryParts.push(line);
    }
  }

  return {
    summary: summaryParts.join(" "),
    deliverables,
  };
}

export function ServicesSection({ services: propServices, profile }: ServicesSectionProps) {
  const { t, language } = useTranslation();
  const sectionRef = useRef<HTMLElement>(null);

  // Tanpa fallback dummy: tanpa layanan, tampil empty state jujur
  const services = ((propServices && Array.isArray(propServices)) ? propServices : []).filter(
    (s) => s.published !== false
  );

  useGSAP(
    () => {
      gsap.from(".sigit-service-card", {
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 80%",
          toggleActions: "play none none none",
        },
        opacity: 0,
        y: 40,
        stagger: 0.12,
        duration: 0.85,
        ease: "power3.out",
        clearProps: "all",
      });
    },
    { scope: sectionRef }
  );

  return (
    <section
      ref={sectionRef}
      id="layanan"
      className="relative py-12 md:py-20 scroll-mt-14"
    >
      <div className="max-w-7xl mx-auto px-2 sm:px-4">
        {/* Section Header Window Wrapper */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 font-pixel text-xs text-[var(--vt-blue)]">
              <span className="h-2 w-2 rounded-full bg-[var(--vt-blue)] animate-pulse" />
              <span>{t.services_badge}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-display tracking-tight text-[var(--vt-ink)]">
              {t.services_title}
            </h2>
            <p className="text-xs sm:text-sm font-mono text-[var(--vt-ink)] font-medium mt-1 max-w-2xl">
              {t.services_subtitle}
            </p>
          </div>

          <div className="shrink-0">
            <ShareButton
              title={
                language === "en"
                  ? `Web Development & AI Services - ${profile.name}`
                  : `Layanan Pengembangan Web & Solusi AI - ${profile.name}`
              }
              url="/#layanan"
              summary={
                language === "en"
                  ? "Professional software engineering services including modern web apps, full-stack Next.js, AI integrations, intelligent automation, and high-performance cloud architecture."
                  : "Layanan rekayasa software profesional meliputi pembuatan aplikasi web modern, full-stack Next.js, integrasi sistem AI, otomasi cerdas, dan arsitektur cloud berkinerja tinggi."
              }
              badge={language === "en" ? "SERVICES" : "LAYANAN"}
              buttonText={language === "en" ? "Share Services" : "Bagikan Layanan"}
              className="vt-btn vt-btn-chrome text-xs font-mono font-bold"
            />
          </div>
        </div>

        {/* 3 Equal Columns Balanced OS Windows Grid */}
        {services.length === 0 ? (
          <div className="text-center py-10 vt-card-inset bg-[var(--vt-card)] rounded-xs border border-dashed border-border font-mono text-xs">
            <Briefcase className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="font-bold text-sm text-[var(--vt-ink)]">{t.services_empty}</p>
          </div>
        ) : (
        <div className={`grid gap-6 ${
          services.length === 1
            ? "grid-cols-1 max-w-xl mx-auto"
            : services.length === 2
            ? "grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto"
            : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
        }`}>
          {services.map((service, index) => {
            const title = (language === "en" && service.titleEn) ? service.titleEn : service.title;
            const description = (language === "en" && service.descriptionEn) ? service.descriptionEn : service.description;
            const { summary, deliverables } = parseServiceContent(description);

            const subjectText =
              language === "id"
                ? `Halo ${profile.name.split(" ")[0]}, saya tertarik dengan layanan ${title}`
                : `Hello ${profile.name.split(" ")[0]}, I am interested in ${title} services`;

            const bodyText =
              language === "id"
                ? `Halo ${profile.name.split(" ")[0]},\n\nSaya tertarik dengan layanan "${title}" dan ingin berdiskusi lebih lanjut mengenai kebutuhan saya.`
                : `Hello ${profile.name.split(" ")[0]},\n\nI am interested in "${title}" services and would like to discuss my needs further.`;
            return (
              <div key={service.id} className="sigit-service-card flex flex-col h-full">
                <OSWindow
                  title={`Service_0${index + 1}.exe`}
                  icon={<Briefcase className="h-3 w-3 text-[#ffd400]" />}
                  statusText={`Order: #${service.order} // Published`}
                  className="h-full flex-1"
                  bodyClassName="flex flex-col justify-between h-full space-y-4"
                >
                  <div className="space-y-3.5">
                    {/* Module Status Header */}
                    <div className="flex items-center justify-between">
                      <span className="font-pixel text-[11px] px-2 py-0.5 bg-[var(--vt-blue)] text-white font-bold tracking-wider">
                        {language === "en" ? "MODULE" : "MODUL"} 0{index + 1}
                      </span>
                      <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-emerald-800 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>{language === "en" ? "ACTIVE" : "AKTIF"}</span>
                      </span>
                    </div>

                    {/* Retro Flowchart Schematic Diagram */}
                    <ServiceSchematic service={service} index={index} />

                    {/* Title */}
                    <h3 className="text-base sm:text-lg font-bold font-mono text-[var(--vt-ink)] leading-snug">
                      {title}
                    </h3>

                    {/* Summary Description in Inter font-sans for high readability */}
                    {summary && (
                      <p className="text-xs sm:text-sm font-sans text-[var(--vt-ink)] font-normal leading-relaxed opacity-90">
                        {summary}
                      </p>
                    )}

                    {/* Structured Deliverables Checklist */}
                    {deliverables.length > 0 && (
                      <div className="pt-2.5 border-t border-border/70 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-pixel text-[9px] uppercase tracking-wider text-[var(--vt-blue)] font-bold">
                            {language === "en" ? "KEY DELIVERABLES" : "OUTPUT & SPESIFIKASI"}
                          </span>
                          <span className="font-mono text-[10px] text-muted-foreground font-medium">
                            {deliverables.length} {language === "en" ? "points" : "poin"}
                          </span>
                        </div>
                        <ul className="space-y-1.5" role="list">
                          {deliverables.map((item, dIdx) => (
                            <li
                              key={dIdx}
                              className="flex items-start gap-2 text-xs font-sans text-[var(--vt-ink)] leading-normal"
                            >
                              <span className="mt-0.5 shrink-0 inline-flex items-center justify-center w-3.5 h-3.5 rounded-xs bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              </span>
                              <span className="font-normal">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Mail Action CTA */}
                  <div className="pt-3 border-t border-border/80">
                    <a
                      href={CONTACT_SECTION_HREF}
                      onClick={() => prefillContact({ subject: subjectText, body: bodyText })}
                      className="vt-btn vt-btn-chrome w-full py-2 px-3 text-xs font-bold font-mono text-foreground justify-between group flex items-center"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-primary" />
                        <span>{t.services_cta}</span>
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                    </a>
                  </div>
                </OSWindow>
              </div>
            );
          })}
        </div>
        )}
      </div>
    </section>
  );
}
