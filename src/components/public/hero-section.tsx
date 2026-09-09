"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { ArrowRight, ExternalLink, MapPin, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProfileData } from "@/lib/dummy-data";
import { useTranslation } from "@/lib/i18n";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

interface HeroSectionProps {
  profile: ProfileData;
}

export function HeroSection({ profile }: HeroSectionProps) {
  const { t, language } = useTranslation();
  const heroRef = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  const headline = (language === "en" && profile.headlineEn) ? profile.headlineEn : profile.headline;
  const bio = (language === "en" && profile.bioEn) ? profile.bioEn : profile.bio;

  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

      tl.from(".hero-status", {
        y: -20,
        opacity: 0,
        scale: 0.9,
        duration: 0.7,
        ease: "back.out(1.7)",
      })
        .from(
          headlineRef.current,
          {
            y: 45,
            opacity: 0,
            filter: "blur(10px)",
            duration: 1.1,
          },
          "-=0.4"
        )
        .from(
          ".hero-avatar-pill",
          {
            scale: 0.5,
            rotation: -8,
            opacity: 0,
            duration: 0.85,
            ease: "back.out(2.2)",
          },
          "-=0.7"
        )
        .from(
          ".hero-desc",
          {
            y: 25,
            opacity: 0,
            filter: "blur(6px)",
            duration: 0.8,
          },
          "-=0.6"
        )
        .from(
          ".hero-location-badge",
          {
            y: 15,
            opacity: 0,
            stagger: 0.1,
            duration: 0.6,
          },
          "-=0.5"
        )
        .from(
          ctaRef.current?.children ? Array.from(ctaRef.current.children) : [],
          {
            y: 20,
            opacity: 0,
            scale: 0.95,
            stagger: 0.12,
            duration: 0.7,
            ease: "back.out(1.5)",
          },
          "-=0.4"
        )
        .from(
          ".hero-stats-item",
          {
            y: 30,
            opacity: 0,
            scale: 0.92,
            stagger: 0.09,
            duration: 0.75,
            ease: "back.out(1.4)",
          },
          "-=0.3"
        )
        .from(
          ".hero-skill-badge",
          {
            scale: 0.75,
            opacity: 0,
            stagger: {
              amount: 0.45,
              from: "random",
            },
            duration: 0.6,
            ease: "back.out(2)",
          },
          "-=0.4"
        );
    },
    { scope: heroRef }
  );

  const getTranslatedStatLabel = (label: string) => {
    if (language === "id") return label;
    const map: Record<string, string> = {
      "Tahun Pengalaman": "Years Experience",
      "Proyek Selesai": "Projects Completed",
      "Klien Puas": "Satisfied Clients",
      "Mitra Kolaborasi": "Partners",
    };
    return map[label] || label;
  };

  return (
    <section
      id="hero"
      ref={heroRef}
      className="relative min-h-[85dvh] flex items-center pt-16 pb-24 md:pt-28 md:pb-36 overflow-hidden border-b border-border/60"
    >
      {/* Cinematic Ambient Floating Glow Orbs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-primary/8 rounded-full blur-[100px] pointer-events-none -z-10 animate-float-slow" />
      <div className="absolute top-1/3 right-10 w-[450px] h-[300px] bg-accent/10 rounded-full blur-[120px] pointer-events-none -z-10 animate-float-reverse" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 w-full">
        {/* Availability Pill */}
        {profile.availableForHire && (
          <div className="hero-status inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium border border-border bg-muted/40 text-foreground mb-8 backdrop-blur-xs hover:border-primary/40 transition-colors">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>{t.hero_available_badge}</span>
          </div>
        )}

        {/* 2-Line Iron Rule Headline with Inline Micro-Portrait */}
        <div className="max-w-5xl space-y-6">
          <h1
            ref={headlineRef}
            className="text-4xl sm:text-6xl md:text-7xl font-semibold tracking-tighter text-foreground leading-[1.1] flex flex-col gap-2 sm:gap-4"
          >
            <div className="flex items-center flex-wrap gap-x-4 gap-y-2">
              <span>{profile.name}</span>
              <span className="hero-avatar-pill inline-block relative w-16 h-10 sm:w-24 sm:h-14 md:w-28 md:h-16 rounded-full overflow-hidden border-2 border-primary/20 shadow-md align-middle mt-1 sm:mt-2 group cursor-pointer hover:border-primary/60 transition-colors">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={profile.avatarUrl} loading="eager" fetchPriority="high" decoding="sync"
                  alt={profile.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
              </span>
            </div>
            <span className="text-muted-foreground font-normal block">
              {headline}
            </span>
          </h1>

          <p className="hero-desc text-base sm:text-xl text-muted-foreground leading-relaxed max-w-2xl font-normal">
            {bio}
          </p>
        </div>

        {/* Location & Status Info */}
        <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-muted-foreground pt-6">
          <span className="hero-location-badge inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/30 border border-border/40">
            <MapPin className="h-4 w-4 text-primary" />
            {profile.location}
          </span>
          <span className="hero-location-badge inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/30 border border-border/40">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            {t.hero_verified_badge}
          </span>
        </div>

        {/* High-Contrast Action CTAs with Shine & Bounce */}
        <div ref={ctaRef} className="flex flex-wrap items-center gap-4 pt-8">
          <Button asChild size="lg" className="relative overflow-hidden h-12 px-7 font-medium gap-2 text-sm shadow-sm group">
            <Link href="/proyek">
              <span className="absolute inset-0 w-1/2 h-full bg-white/15 -skew-x-12 -translate-x-full group-hover:animate-[shine-sweep_1.2s_ease-in-out]" />
              <span>{t.hero_cta_projects}</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>

          <Button asChild variant="outline" size="lg" className="h-12 px-7 font-medium gap-2 text-sm border-border bg-card/80 backdrop-blur-xs hover:bg-muted/50 hover:border-foreground/30 transition-all">
            <a href="https://porto.sigitadi.id/" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
              <span>{t.hero_cta_portfolio}</span>
            </a>
          </Button>
        </div>

        {/* Dense Key Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-16 max-w-4xl border-t border-border/40 mt-16">
          {profile.stats.map((stat, idx) => (
            <div
              key={idx}
              className="hero-stats-item spotlight-card p-4 rounded-xl border border-border/60 bg-card/50 backdrop-blur-xs text-left"
            >
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {stat.value}
              </div>
              <div className="text-xs text-muted-foreground font-normal mt-1">
                {getTranslatedStatLabel(stat.label)}
              </div>
            </div>
          ))}
        </div>

        {/* Core Skills Badges */}
        <div className="pt-8 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-2">
            {t.hero_skills_label}:
          </span>
          {profile.skills.map((skill) => (
            <Badge
              key={skill}
              variant="outline"
              className="hero-skill-badge font-normal text-xs py-1 px-3 bg-background/80 border-border text-foreground hover:border-primary/60 hover:bg-primary/5 hover:scale-105 active:scale-95 transition-all duration-200 cursor-default"
            >
              {skill}
            </Badge>
          ))}
        </div>
      </div>
    </section>
  );
}
