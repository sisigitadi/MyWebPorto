"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { ArrowRight, ExternalLink, MapPin, User } from "lucide-react";
import { ProfileData } from "@/lib/dummy-data";
import { useTranslation } from "@/lib/i18n";
import { OSWindow } from "@/components/public/os/os-window";
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
      className="relative pt-4 pb-10 md:pt-8 md:pb-14 overflow-hidden"
    >
      <div className="max-w-5xl mx-auto px-2 sm:px-4">
        {/* Profile Window (Sigit_Profile.exe) */}
        <div className="sigit-hero-window w-full flex flex-col">
          <OSWindow
            title="Sigit_Profile.exe // Developer Details"
            icon={<User className="h-3.5 w-3.5 text-[#ffd400]" />}
            className="h-full"
            bodyClassName="flex flex-col justify-between space-y-6 p-4 sm:p-6"
          >
            {/* Header inside window */}
            <div>
              {/* Availability Badge */}
              {profile.availableForHire && (
                <div className="inline-flex items-center gap-2 px-2.5 sm:px-3.5 py-1 sm:py-1.5 mb-3 sm:mb-4 text-[10px] sm:text-xs font-mono font-bold bg-[#032614] text-[#34d399] border-2 border-[#10b981] rounded-xs shadow-md">
                  <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34d399] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-[#10b981]"></span>
                  </span>
                  <span className="tracking-wide">SYSTEM ONLINE // {t.hero_available_badge}</span>
                </div>
              )}

              {/* Name & Beveled Photo Badge */}
              <div className="flex flex-row items-center gap-3 sm:gap-5 mb-4">
                <div className="relative w-16 h-16 sm:w-24 sm:h-24 rounded-xs vt-raised p-1 shrink-0 bg-[var(--vt-chrome)] shadow-md">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={profile.avatarUrl} loading="eager" fetchPriority="high" decoding="sync"
                    alt={profile.name}
                    className="w-full h-full object-cover rounded-xs vt-card-inset"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight font-display text-[var(--vt-ink)] leading-[1.1] sm:leading-[1.05] truncate sm:whitespace-normal">
                    {profile.name}
                  </h1>
                  <p className="text-xs sm:text-base font-mono font-bold text-[var(--vt-blue)] mt-0.5 sm:mt-1 truncate">
                    &lt;{headline} /&gt;
                  </p>
                </div>
              </div>

              {/* Bio text */}
              <div className="vt-card-inset p-3 sm:p-4 bg-card text-[var(--vt-ink)] font-mono text-xs sm:text-sm leading-relaxed border-l-4 border-l-[var(--vt-blue)] font-medium">
                {bio}
              </div>
            </div>

            {/* Stats Counters (Beveled Inset Grid) */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
              {profile.stats.map((stat, idx) => (
                <div
                  key={idx}
                  className="vt-card-inset p-2 sm:p-3 bg-[var(--vt-card)]"
                >
                  <div className="text-xl sm:text-3xl font-black font-display text-[var(--vt-ink)]">
                    {stat.value}
                  </div>
                  <div className="text-[10px] sm:text-xs font-mono font-bold text-[var(--vt-ink)] uppercase tracking-tight sm:tracking-wide mt-1">
                    {getTranslatedStatLabel(stat.label)}
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons (Tactile 3D Buttons) */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-2">
              <a
                href="https://porto.sigitadi.id/"
                target="_blank"
                rel="noopener noreferrer"
                className="vt-btn vt-btn-pink vt-btn-sweep px-4 sm:px-6 py-2 sm:py-2.5 text-xs font-bold uppercase tracking-wider font-mono text-center flex-1 sm:flex-initial"
              >
                <span>{t.hero_cta_portfolio}</span>
                <ExternalLink className="h-3.5 w-3.5 ml-1 inline" />
              </a>

              <span className="text-[11px] sm:text-xs font-mono font-bold text-[var(--vt-ink)] w-full sm:w-auto sm:ml-auto flex items-center justify-center sm:justify-start gap-1 pt-1 sm:pt-0">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                <span>{profile.location}</span>
              </span>
            </div>
          </OSWindow>
        </div>
      </div>
    </section>
  );
}
