"use client";

import React from "react";
import {
  Cpu,
  Clock,
  Terminal,
  Code,
  Layout,
  Server,
  Shield,
  Database,
  CheckCircle2,
  Briefcase,
  Layers,
} from "lucide-react";
import { ProfileCardsConfig } from "@/lib/profile-cards-meta";
import { useTranslation } from "@/lib/i18n";

export interface ProfileCardProps {
  cards: ProfileCardsConfig;
}

export function ProfileCard({ cards }: ProfileCardProps) {
  const { language } = useTranslation();
  const isEn = language === "en";

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case "layout":
        return <Layout className="h-3.5 w-3.5 text-[#0066cc] dark:text-[#38bdf8]" />;
      case "server":
        return <Server className="h-3.5 w-3.5 text-[#d97706] dark:text-[#fbbf24]" />;
      case "shield":
        return <Shield className="h-3.5 w-3.5 text-[#059669] dark:text-[#34d399]" />;
      case "database":
        return <Database className="h-3.5 w-3.5 text-[#7c5cff]" />;
      case "cpu":
        return <Cpu className="h-3.5 w-3.5 text-[#ec4899]" />;
      case "code":
      default:
        return <Code className="h-3.5 w-3.5 text-[var(--vt-amber)]" />;
    }
  };

  const statusBadge = (
    isEn && cards.workPreferences.statusBadgeEn
      ? cards.workPreferences.statusBadgeEn
      : cards.workPreferences.statusBadge
  ).replace(/—/g, "-");

  const locationTimezone = (
    isEn && cards.workPreferences.locationTimezoneEn
      ? cards.workPreferences.locationTimezoneEn
      : cards.workPreferences.locationTimezone
  ).replace(/—/g, "-");

  const responseTimeSla = (
    isEn && cards.workPreferences.responseTimeSlaEn
      ? cards.workPreferences.responseTimeSlaEn
      : cards.workPreferences.responseTimeSla
  ).replace(/—/g, "-");

  const slaDescription = (
    (isEn && cards.workPreferences.slaDescriptionEn
      ? cards.workPreferences.slaDescriptionEn
      : cards.workPreferences.slaDescription) ||
    (isEn
      ? "Direct technical consultation with rapid feasibility feedback."
      : "Konsultasi rekayasa langsung dengan penilaian kelayakan cepat.")
  ).replace(/—/g, "-");

  return (
    <div className="w-full mt-4 sm:mt-6 pt-3 border-t-2 border-[var(--vt-edge-lo-2)]">
      {/* ========================================================
          KARTU DETAIL PROFIL TERPADU (Single Unified System Spec)
          Ringkas, Informatif & Sesuai Konteks Portofolio
          ======================================================== */}
      <div className="border-2 border-[var(--vt-edge-hi-2)] bg-[var(--vt-paper)] rounded-xs shadow-inner overflow-hidden">
        {/* Header Bar Retro */}
        <div className="flex items-center justify-between border-b-2 border-[var(--vt-edge-lo-2)] bg-[var(--vt-chrome)] px-3 py-1.5 font-mono text-[11px] sm:text-xs">
          <div className="flex items-center gap-1.5 font-bold text-[var(--vt-ink)]">
            <Terminal className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>SYSTEM_SPEC :: PROFILE_SPECIFICATION.SYS</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>LIVE // READY</span>
          </div>
        </div>

        <div className="p-3 sm:p-4 space-y-4 font-mono">
          {/* Section 1: Availability & SLA Banner */}
          <div className="p-2.5 sm:p-3 bg-emerald-500/10 border-2 border-emerald-500/40 rounded-xs flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="font-extrabold text-emerald-900 dark:text-emerald-300 truncate">
                {statusBadge}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground md:justify-end">
              <span className="truncate">{locationTimezone}</span>
              <span className="hidden md:inline text-muted-foreground/60">•</span>
              <span className="font-bold text-primary flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>SLA {responseTimeSla}</span>
              </span>
            </div>
          </div>

          {/* Section 2: Core Arsenal & Tech Stack */}
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-[var(--vt-edge-lo-2)] pb-1 text-xs">
              <span className="font-bold text-[var(--vt-ink)] flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-primary" />
                <span>{isEn ? "CORE_TECH_STACK & ARSENAL" : "STACK_TEKNOLOGI & ARSENAL"}</span>
              </span>
              <span className="text-[10px] text-muted-foreground hidden sm:inline">
                Driver status: VERIFIED // PRODUCTION_READY
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {cards.techStack.map((category) => {
                const title = isEn && category.titleEn ? category.titleEn : category.title;
                return (
                  <div
                    key={category.id}
                    className="p-2.5 bg-[var(--vt-chrome)] border border-[var(--vt-edge-lo-2)] rounded-xs space-y-1.5 flex flex-col justify-between"
                  >
                    <div className="flex items-center gap-1.5 pb-1 border-b border-[var(--vt-edge-lo-2)]/60">
                      {getCategoryIcon(category.iconName)}
                      <span className="font-bold text-[11px] text-[var(--vt-ink)] uppercase tracking-wide truncate">
                        {title}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {category.items.map((tech, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 text-[10px] font-bold bg-[var(--vt-paper)] border border-[var(--vt-edge-lo)] rounded-2xs text-[var(--vt-ink)]"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Rekam Jejak Karir & Lingkup Kolaborasi (2 Kolom Seimbang) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 text-xs">
            {/* Kolom Kiri: Rekam Jejak Karir & Milestones Utama */}
            <div className="p-3 bg-[var(--vt-chrome)] border border-[var(--vt-edge-lo-2)] rounded-xs space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-[var(--vt-edge-lo-2)] pb-1.5 mb-2">
                  <span className="font-bold text-[var(--vt-ink)] flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5 text-primary" />
                    <span>{isEn ? "CAREER_RECORD" : "REKAM_JEJAK_KARIR"}</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {cards.careerTimeline.length} Milestones
                  </span>
                </div>

                <div className="space-y-2.5">
                  {cards.careerTimeline.slice(0, 2).map((item, idx) => {
                    const role = isEn && item.roleEn ? item.roleEn : item.role;
                    const period = (isEn && item.periodEn ? item.periodEn : item.period).replace(/—/g, "-");
                    const description = (isEn && item.descriptionEn ? item.descriptionEn : item.description).replace(/—/g, "-");

                    return (
                      <div
                        key={item.id || idx}
                        className="pl-2 border-l-2 border-primary space-y-0.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-1 text-[11px]">
                          <span className="font-bold text-[var(--vt-ink)]">
                            {role} <span className="text-primary">@ {item.company}</span>
                          </span>
                          <span className="text-[10px] text-muted-foreground font-semibold">
                            {period}
                          </span>
                        </div>
                        <p className="text-[11px] font-sans text-muted-foreground leading-snug line-clamp-2">
                          {description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 border-t border-[var(--vt-edge-lo-2)]/60 text-[10px] text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{slaDescription}</span>
              </div>
            </div>

            {/* Kolom Kanan: Ruang Lingkup Kolaborasi & Layanan */}
            <div className="p-3 bg-[var(--vt-chrome)] border border-[var(--vt-edge-lo-2)] rounded-xs space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-[var(--vt-edge-lo-2)] pb-1.5 mb-2">
                  <span className="font-bold text-[var(--vt-ink)] flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{isEn ? "COLLABORATION_SCOPE" : "LINGKUP_KOLABORASI"}</span>
                  </span>
                  <span className="text-[10px] text-primary font-bold">
                    PRODUCTION READY
                  </span>
                </div>

                <ul className="space-y-1.5 text-[11px]">
                  {cards.workPreferences.collaborationTypes.map((type, tIdx) => {
                    const title = isEn && type.titleEn ? type.titleEn : type.title;
                    return (
                      <li key={tIdx} className="flex items-start gap-1.5 text-[var(--vt-ink)] leading-snug">
                        <span className="text-primary font-extrabold shrink-0">»</span>
                        <span>{title}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="pt-2 border-t border-[var(--vt-edge-lo-2)]/60 text-[10px] text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 shrink-0" />
                <span>{isEn ? "Direct Technical Consultation" : "Konsultasi Rekayasa Langsung"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Alias untuk kompatibilitas import sebelumnya
export const ProfileTabs = ProfileCard;
