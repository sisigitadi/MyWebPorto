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
        return <Layout className="h-3 w-3 text-[#0066cc] dark:text-[#38bdf8] shrink-0" />;
      case "server":
        return <Server className="h-3 w-3 text-[#d97706] dark:text-[#fbbf24] shrink-0" />;
      case "shield":
        return <Shield className="h-3 w-3 text-[#059669] dark:text-[#34d399] shrink-0" />;
      case "database":
        return <Database className="h-3 w-3 text-[#7c5cff] shrink-0" />;
      case "cpu":
        return <Cpu className="h-3 w-3 text-[#ec4899] shrink-0" />;
      case "code":
      default:
        return <Code className="h-3 w-3 text-[var(--vt-amber)] shrink-0" />;
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
    <div className="w-full mt-3 sm:mt-4 pt-2.5 border-t-2 border-[var(--vt-edge-lo-2)]">
      {/* ========================================================
          KARTU PROFIL TUNGGAL (Single Unified System Spec Card)
          Ringkas, Padat, Informatif & Sesuai Konteks Portofolio Web
          ======================================================== */}
      <div className="border-2 border-[var(--vt-edge-hi-2)] bg-[var(--vt-paper)] rounded-xs shadow-inner overflow-hidden font-mono text-xs">
        {/* Header Bar Retro */}
        <div className="flex items-center justify-between border-b-2 border-[var(--vt-edge-lo-2)] bg-[var(--vt-chrome)] px-2.5 py-1 text-[11px] sm:text-xs">
          <div className="flex items-center gap-1.5 font-bold text-[var(--vt-ink)] truncate">
            <Terminal className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="truncate">PROFILE_SPECIFICATION.SYS</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 shrink-0">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>LIVE // READY</span>
          </div>
        </div>

        {/* Konten Kartu Tunggal */}
        <div className="p-3 sm:p-3.5 space-y-3">
          {/* Top Status & SLA Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-2xs text-[11px]">
            <div className="flex items-center gap-1.5 font-extrabold text-emerald-900 dark:text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
              <span>{statusBadge}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground text-[10px] font-semibold">
              <span>{locationTimezone}</span>
              <span>•</span>
              <span className="font-bold text-primary flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>SLA {responseTimeSla}</span>
              </span>
            </div>
          </div>

          {/* 2-Column Grid: Left (Tech Stack) & Right (Scope & Experience) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-0.5">
            {/* Kolom Kiri: Tech Stack Arsenal */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 pb-1 border-b border-[var(--vt-edge-lo-2)] text-[11px] font-bold text-[var(--vt-ink)]">
                <Layers className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>{isEn ? "CORE ARSENAL" : "ARSENAL TEKNOLOGI"}</span>
              </div>

              <div className="space-y-1.5">
                {cards.techStack.map((category) => {
                  const title = isEn && category.titleEn ? category.titleEn : category.title;
                  return (
                    <div key={category.id} className="text-[10px] leading-tight">
                      <div className="flex items-center gap-1 text-muted-foreground font-semibold uppercase mb-0.5">
                        {getCategoryIcon(category.iconName)}
                        <span>{title}:</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {category.items.map((tech, idx) => (
                          <span
                            key={idx}
                            className="px-1.5 py-0.5 bg-[var(--vt-chrome)] border border-[var(--vt-edge-lo)] rounded-2xs text-[var(--vt-ink)] font-bold"
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

            {/* Kolom Kanan: Lingkup Kolaborasi & Rekam Jejak */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 pb-1 border-b border-[var(--vt-edge-lo-2)] text-[11px] font-bold text-[var(--vt-ink)]">
                <Briefcase className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>{isEn ? "ENGINEERING SCOPE" : "LINGKUP REKAYASA"}</span>
              </div>

              <ul className="space-y-1 text-[11px] font-sans">
                {cards.workPreferences.collaborationTypes.map((type, tIdx) => {
                  const title = isEn && type.titleEn ? type.titleEn : type.title;
                  return (
                    <li key={tIdx} className="flex items-start gap-1.5 text-[var(--vt-ink)] leading-snug">
                      <span className="text-primary font-bold font-mono shrink-0">»</span>
                      <span>{title}</span>
                    </li>
                  );
                })}
              </ul>

              {/* Highlight Rekam Jejak Karir Ringkas */}
              {cards.careerTimeline && cards.careerTimeline.length > 0 && (
                <div className="pt-2 border-t border-[var(--vt-edge-lo-2)]/60 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">
                    {isEn ? "EXPERIENCE HIGHLIGHT" : "SOROTAN PENGALAMAN"}:
                  </div>
                  {cards.careerTimeline.slice(0, 1).map((item, idx) => {
                    const role = isEn && item.roleEn ? item.roleEn : item.role;
                    const period = (isEn && item.periodEn ? item.periodEn : item.period).replace(/—/g, "-");
                    return (
                      <div key={item.id || idx} className="text-[11px] leading-tight">
                        <span className="font-bold text-[var(--vt-ink)]">{role}</span>{" "}
                        <span className="text-primary font-semibold">@ {item.company}</span>{" "}
                        <span className="text-muted-foreground text-[10px]">({period})</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer Card: Jaminan Konsultasi & SLA */}
          <div className="pt-2 border-t border-[var(--vt-edge-lo-2)] flex items-center justify-between text-[10px] text-muted-foreground gap-2">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="truncate">{slaDescription}</span>
            </div>
            <span className="text-primary font-bold shrink-0 hidden sm:inline">
              VERIFIED // READY
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Alias untuk kompatibilitas import sebelumnya
export const ProfileTabs = ProfileCard;
