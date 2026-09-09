"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { ArrowRight, ExternalLink, MapPin, User, Terminal } from "lucide-react";
import { ProfileData } from "@/lib/dummy-data";
import { useTranslation } from "@/lib/i18n";
import { OSWindow } from "@/components/public/os/os-window";
import { OSCrtTerminal } from "@/components/public/os/os-crt-terminal";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

interface HeroSectionProps {
  profile: ProfileData;
}

export function HeroSection({ profile }: HeroSectionProps) {
  const { t, language } = useTranslation();
  const heroRef = useRef<HTMLElement>(null);

  const headline = (language === "en" && profile.headlineEn) ? profile.headlineEn : profile.headline;
  const bio = (language === "en" && profile.bioEn) ? profile.bioEn : profile.bio;

  useGSAP(
    () => {
      gsap.from(".sigit-hero-window", {
        y: 35,
        opacity: 0,
        stagger: 0.15,
        duration: 0.9,
        ease: "power3.out",
        clearProps: "all",
      });
    },
    { scope: heroRef }
  );

  const getTranslatedStatLabel = (label: string) => {
    if (language === "id") return label;
    const map: Record<string, string> = {
      "Tahun Pengalaman": "Years Experience",
      "Proyek Selesai": "Projects Completed",
      "Kepuasan Klien": "Client Rating",
      "Mitra Kolaborasi": "Partners",
    };
    return map[label] || label;
  };

  return (
    <section
      id="hero"
      ref={heroRef}
      className="relative pt-6 pb-12 md:pt-10 md:pb-16 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-2 sm:px-4">
        {/* Desktop Dual Window Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Window 1: Profile Window (Sigit_Profile.exe) */}
          <div className="sigit-hero-window lg:col-span-7 flex flex-col">
            <OSWindow
              title="Sigit_Profile.exe // Developer Details"
              icon={<User className="h-3.5 w-3.5 text-[#ffd400]" />}
              statusText="Status: Available for hire & freelance development"
              className="h-full"
              bodyClassName="flex flex-col justify-between space-y-6"
            >
              {/* Header inside window */}
              <div>
                {/* Availability Badge */}
                {profile.availableForHire && (
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 mb-4 text-[11px] font-mono font-bold bg-[#37ff9b]/15 text-[#006633] dark:text-[#37ff9b] border border-[#37ff9b]/40 rounded-xs">
                    <span className="h-2 w-2 rounded-full bg-[#37ff9b] animate-ping" />
                    <span>SYSTEM ONLINE // {t.hero_available_badge}</span>
                  </div>
                )}

                {/* Name & Beveled Photo Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xs vt-raised p-1 shrink-0 bg-[var(--vt-chrome)] shadow-md">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={profile.avatarUrl}
                      alt={profile.name}
                      className="w-full h-full object-cover rounded-xs vt-card-inset"
                    />
                  </div>
                  <div>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight font-display text-foreground leading-[1.05]">
                      {profile.name}
                    </h1>
                    <p className="text-sm sm:text-base font-mono font-medium text-[var(--vt-blue)] mt-1">
                      &lt;{headline} /&gt;
                    </p>
                  </div>
                </div>

                {/* Bio text */}
                <div className="vt-card-inset p-3 bg-card text-foreground font-mono text-xs sm:text-sm leading-relaxed border-l-4 border-l-[var(--vt-blue)]">
                  {bio}
                </div>
              </div>

              {/* Stats Counters (Beveled Inset Grid) */}
              <div className="grid grid-cols-3 gap-2 text-center">
                {profile.stats.map((stat, idx) => (
                  <div
                    key={idx}
                    className="vt-card-inset p-2.5 bg-[var(--vt-card)]"
                  >
                    <div className="text-xl sm:text-2xl font-black font-display text-foreground">
                      {stat.value}
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-tight mt-0.5">
                      {getTranslatedStatLabel(stat.label)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons (Tactile 3D Buttons) */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href="#proyek"
                  className="vt-btn vt-btn-pink vt-btn-sweep px-5 py-2.5 text-xs font-bold uppercase tracking-wider font-mono"
                >
                  <span>{t.hero_cta_projects}</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Link>

                <a
                  href="https://porto.sigitadi.id/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="vt-btn vt-btn-chrome px-4 py-2.5 text-xs font-bold font-mono text-foreground"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-primary mr-1" />
                  <span>{t.hero_cta_portfolio}</span>
                </a>

                <span className="text-xs font-mono text-muted-foreground ml-auto hidden sm:inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-primary" />
                  <span>{profile.location}</span>
                </span>
              </div>
            </OSWindow>
          </div>

          {/* Window 2: Interactive CRT Terminal (Monitor_CRT.sys) */}
          <div className="sigit-hero-window lg:col-span-5 flex flex-col">
            <OSWindow
              title="Monitor_CRT.sys // Live Diagnostic"
              icon={<Terminal className="h-3.5 w-3.5 text-[#37ff9b]" />}
              statusText="Hardware status: NOMINAL // 100% Online"
              className="h-full"
              bodyClassName="p-2 sm:p-3 bg-[#0a0c10]"
            >
              <OSCrtTerminal ownerName={profile.name} />
            </OSWindow>
          </div>
        </div>
      </div>
    </section>
  );
}
