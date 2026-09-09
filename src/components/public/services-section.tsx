"use client";

import React, { useRef } from "react";
import { ArrowRight, Mail, Briefcase, CheckCircle2 } from "lucide-react";
import { ServiceData, ProfileData, DUMMY_SERVICES } from "@/lib/dummy-data";
import { useTranslation } from "@/lib/i18n";
import { OSWindow } from "@/components/public/os/os-window";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

interface ServicesSectionProps {
  services: ServiceData[];
  profile: ProfileData;
}

export function ServicesSection({ services: propServices, profile }: ServicesSectionProps) {
  const { t, language } = useTranslation();
  const sectionRef = useRef<HTMLElement>(null);

  // Resilient fallback to guarantee cards are always visible even if DB returns empty
  const rawServices =
    propServices && Array.isArray(propServices) && propServices.length > 0
      ? propServices
      : DUMMY_SERVICES;
  const publishedServices = rawServices.filter((s) => s.published !== false);
  const services = publishedServices.length > 0 ? publishedServices : rawServices;

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
        <div className="mb-8">
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

        {/* 3 Equal Columns Balanced OS Windows Grid */}
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

            const subjectText =
              language === "id"
                ? `Halo ${profile.name.split(" ")[0]}, saya tertarik dengan layanan ${title}`
                : `Hello ${profile.name.split(" ")[0]}, I am interested in ${title} services`;

            const encodedSubject = encodeURIComponent(subjectText);
            const mailtoUrl = `mailto:${profile.email}?subject=${encodedSubject}`;

            return (
              <div key={service.id} className="sigit-service-card flex flex-col h-full">
                <OSWindow
                  title={`Service_0${index + 1}.exe`}
                  icon={<Briefcase className="h-3 w-3 text-[#ffd400]" />}
                  statusText={`Order: #${service.order} // Published`}
                  className="h-full flex-1"
                  bodyClassName="flex flex-col justify-between h-full space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-pixel text-[11px] px-2 py-0.5 bg-[var(--vt-blue)] text-white font-bold tracking-wider">
                        MODULE 0{index + 1}
                      </span>
                      <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>ACTIVE</span>
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold font-mono text-[var(--vt-ink)] leading-snug">
                      {title}
                    </h3>

                    <p className="text-xs sm:text-sm font-mono text-[var(--vt-ink)] font-medium leading-relaxed">
                      {description}
                    </p>
                  </div>

                  {/* Mail Action CTA */}
                  <div className="pt-3 border-t border-border/80">
                    <a
                      href={mailtoUrl}
                      className="vt-btn vt-btn-chrome w-full py-2 px-3 text-xs font-bold font-mono text-foreground justify-between group"
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
      </div>
    </section>
  );
}
