"use client";

import React, { useState, useRef } from "react";
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
} from "lucide-react";
import { ProfileCardsConfig } from "@/lib/profile-cards-meta";
import { useTranslation } from "@/lib/i18n";
import { playOS } from "@/lib/os-sound";

interface ProfileTabsProps {
  cards: ProfileCardsConfig;
}

type TabKey = "specs" | "timeline" | "availability";

const TAB_KEYS: TabKey[] = ["specs", "timeline", "availability"];

export function ProfileTabs({ cards }: ProfileTabsProps) {
  const { language } = useTranslation();
  const isEn = language === "en";

  const [activeTab, setActiveTab] = useState<TabKey>("specs");
  const tabButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleTabChange = (tab: TabKey) => {
    playOS("click");
    setActiveTab(tab);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const currentIndex = TAB_KEYS.indexOf(activeTab);
    let nextIndex = -1;

    if (e.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % TAB_KEYS.length;
    } else if (e.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + TAB_KEYS.length) % TAB_KEYS.length;
    } else if (e.key === "Home") {
      nextIndex = 0;
    } else if (e.key === "End") {
      nextIndex = TAB_KEYS.length - 1;
    }

    if (nextIndex !== -1) {
      e.preventDefault();
      const nextTab = TAB_KEYS[nextIndex];
      handleTabChange(nextTab);
      tabButtonRefs.current[nextIndex]?.focus();
    }
  };

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

  return (
    <div className="w-full mt-4 sm:mt-6 pt-3 border-t-2 border-[var(--vt-edge-lo-2)]">
      {/* ========================================================
          WINDOWS 98 TAB STRIP (3 Kolom Simetris Sejajar Kartu Statistik)
          ======================================================== */}
      <div
        role="tablist"
        aria-label="Profile Details Tabs"
        onKeyDown={handleKeyDown}
        className="grid grid-cols-3 gap-1 w-full font-mono text-[11px] sm:text-xs select-none relative -mb-[2px] z-10"
      >
        {/* Tab 1: SPECS.SYS */}
        <button
          ref={(el) => {
            tabButtonRefs.current[0] = el;
          }}
          id="profile-tab-specs"
          type="button"
          role="tab"
          aria-selected={activeTab === "specs"}
          aria-controls="profile-panel-specs"
          tabIndex={activeTab === "specs" ? 0 : -1}
          onClick={() => handleTabChange("specs")}
          className={`w-full px-1 sm:px-3 py-1.5 sm:py-2 rounded-t-xs border-t-2 border-l-2 border-r-2 flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer whitespace-nowrap text-center focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-1 ${
            activeTab === "specs"
              ? "bg-[var(--vt-paper)] border-[var(--vt-edge-hi-2)] text-[var(--vt-ink)] font-extrabold z-20 pb-2 shadow-xs"
              : "bg-[var(--vt-chrome)] border-[var(--vt-edge-lo-2)] text-muted-foreground hover:text-[var(--vt-ink)] opacity-85 hover:opacity-100"
          }`}
        >
          <Cpu className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="truncate">01_SPECS.SYS</span>
        </button>

        {/* Tab 2: TIMELINE.LOG */}
        <button
          ref={(el) => {
            tabButtonRefs.current[1] = el;
          }}
          id="profile-tab-timeline"
          type="button"
          role="tab"
          aria-selected={activeTab === "timeline"}
          aria-controls="profile-panel-timeline"
          tabIndex={activeTab === "timeline" ? 0 : -1}
          onClick={() => handleTabChange("timeline")}
          className={`w-full px-1 sm:px-3 py-1.5 sm:py-2 rounded-t-xs border-t-2 border-l-2 border-r-2 flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer whitespace-nowrap text-center focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-1 ${
            activeTab === "timeline"
              ? "bg-[var(--vt-paper)] border-[var(--vt-edge-hi-2)] text-[var(--vt-ink)] font-extrabold z-20 pb-2 shadow-xs"
              : "bg-[var(--vt-chrome)] border-[var(--vt-edge-lo-2)] text-muted-foreground hover:text-[var(--vt-ink)] opacity-85 hover:opacity-100"
          }`}
        >
          <Clock className="h-3.5 w-3.5 shrink-0 text-[#d97706] dark:text-[#fbbf24]" />
          <span className="truncate">02_TIMELINE.LOG</span>
        </button>

        {/* Tab 3: AVAILABILITY.CFG */}
        <button
          ref={(el) => {
            tabButtonRefs.current[2] = el;
          }}
          id="profile-tab-availability"
          type="button"
          role="tab"
          aria-selected={activeTab === "availability"}
          aria-controls="profile-panel-availability"
          tabIndex={activeTab === "availability" ? 0 : -1}
          onClick={() => handleTabChange("availability")}
          className={`w-full px-1 sm:px-3 py-1.5 sm:py-2 rounded-t-xs border-t-2 border-l-2 border-r-2 flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer whitespace-nowrap text-center focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-1 ${
            activeTab === "availability"
              ? "bg-[var(--vt-paper)] border-[var(--vt-edge-hi-2)] text-[var(--vt-ink)] font-extrabold z-20 pb-2 shadow-xs"
              : "bg-[var(--vt-chrome)] border-[var(--vt-edge-lo-2)] text-muted-foreground hover:text-[var(--vt-ink)] opacity-85 hover:opacity-100"
          }`}
        >
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
          <span className="truncate hidden sm:inline">03_AVAILABILITY.CFG</span>
          <span className="truncate sm:hidden">03_AVAIL.CFG</span>
        </button>
      </div>

      {/* ========================================================
          TAB CONTENT PANEL (Beveled Container)
          ======================================================== */}
      <div className="relative border-2 border-[var(--vt-edge-hi-2)] bg-[var(--vt-paper)] p-3 sm:p-5 rounded-b-xs rounded-tr-xs shadow-inner min-h-[240px]">
        {/* ======================================================
            TAB 1: TECH_STACK.SYS (Device Manager / Arsenal Teknis)
            ====================================================== */}
        {activeTab === "specs" && (
          <div
            id="profile-panel-specs"
            role="tabpanel"
            aria-labelledby="profile-tab-specs"
            tabIndex={0}
            className="space-y-4 animate-in fade-in duration-150 focus:outline-none"
          >
            <div className="flex items-center justify-between border-b border-[var(--vt-edge-lo-2)] pb-2 text-xs font-mono">
              <span className="font-bold text-[var(--vt-ink)] flex items-center gap-1.5">
                <Terminal className="h-3.5 w-3.5 text-primary" />
                <span>DEVICE_MANAGER :: ACTIVE_CHIPSET_&_ARSENAL</span>
              </span>
              <span className="text-[10px] text-muted-foreground hidden sm:inline">
                Driver status: VERIFIED // PRODUCTION_READY
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {cards.techStack.map((category) => {
                const title = isEn && category.titleEn ? category.titleEn : category.title;
                return (
                  <div
                    key={category.id}
                    className="p-3 bg-[var(--vt-chrome)] border border-[var(--vt-edge-lo-2)] rounded-xs shadow-xs"
                  >
                    <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-[var(--vt-edge-lo-2)]/60">
                      {getCategoryIcon(category.iconName)}
                      <div className="font-mono font-bold text-xs text-[var(--vt-ink)] uppercase tracking-wider">
                        {title}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {category.items.map((tech, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 text-[10px] sm:text-[11px] font-mono font-bold bg-[var(--vt-paper)] border border-[var(--vt-edge-lo)] rounded-2xs text-[var(--vt-ink)] hover:border-primary transition-colors cursor-default"
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
        )}

        {/* ======================================================
            TAB 2: CAREER_LOG.TXT (Timeline / Riwayat Rekayasa)
            ====================================================== */}
        {activeTab === "timeline" && (
          <div
            id="profile-panel-timeline"
            role="tabpanel"
            aria-labelledby="profile-tab-timeline"
            tabIndex={0}
            className="space-y-4 animate-in fade-in duration-150 focus:outline-none"
          >
            <div className="flex items-center justify-between border-b border-[var(--vt-edge-lo-2)] pb-2 text-xs font-mono">
              <span className="font-bold text-[var(--vt-ink)] flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-[#d97706] dark:text-[#fbbf24]" />
                <span>EVENT_VIEWER :: CAREER_CHRONOLOGY.LOG</span>
              </span>
              <span className="text-[10px] text-muted-foreground hidden sm:inline">
                Total Milestones: {cards.careerTimeline.length} entries
              </span>
            </div>

            <div className="space-y-3 font-mono">
              {cards.careerTimeline.map((item, idx) => {
                const role = isEn && item.roleEn ? item.roleEn : item.role;
                const rawPeriod = isEn && item.periodEn ? item.periodEn : item.period;
                const period = rawPeriod.replace(/—/g, "-");
                const rawDescription =
                  isEn && item.descriptionEn ? item.descriptionEn : item.description;
                const description = rawDescription.replace(/—/g, "-");

                return (
                  <div
                    key={item.id || idx}
                    className="p-3 bg-[var(--vt-chrome)] border-l-4 border-l-primary border-t border-r border-b border-[var(--vt-edge-lo-2)] rounded-xs space-y-1.5 hover:border-[var(--vt-edge-hi-2)] transition-colors"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] sm:text-xs">
                      <span className="font-bold text-[var(--vt-ink)]">
                        {role} <span className="text-primary">@ {item.company}</span>
                      </span>
                      <span className="px-2 py-0.5 bg-black/10 dark:bg-black/30 border border-border text-[10px] text-muted-foreground font-bold rounded-2xs">
                        {period}
                      </span>
                    </div>

                    <p className="text-xs font-sans text-[var(--vt-ink)] leading-relaxed">
                      {description}
                    </p>

                    {item.badges && item.badges.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 pt-1">
                        {item.badges.map((b, bIdx) => (
                          <span
                            key={bIdx}
                            className="text-[9px] sm:text-[10px] font-mono px-1.5 py-0.5 bg-[var(--vt-paper)] border border-border text-muted-foreground rounded-2xs"
                          >
                            #{b}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ======================================================
            TAB 3: WORK_PREFERENCES.CFG (Status, SLA & Kolaborasi)
            ====================================================== */}
        {activeTab === "availability" && (
          <div
            id="profile-panel-availability"
            role="tabpanel"
            aria-labelledby="profile-tab-availability"
            tabIndex={0}
            className="space-y-4 animate-in fade-in duration-150 focus:outline-none"
          >
            <div className="flex items-center justify-between border-b border-[var(--vt-edge-lo-2)] pb-2 text-xs font-mono">
              <span className="font-bold text-[var(--vt-ink)] flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>SYSTEM_CONFIG :: WORK_PREFERENCES_&_SLA</span>
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                ● LIVE MONITOR
              </span>
            </div>

            {/* Status & Timezone Banner */}
            <div className="p-3 bg-emerald-500/10 border-2 border-emerald-500/40 rounded-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="font-extrabold text-emerald-700 dark:text-emerald-300">
                  {isEn && cards.workPreferences.statusBadgeEn
                    ? cards.workPreferences.statusBadgeEn
                    : cards.workPreferences.statusBadge}
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground sm:text-right">
                {(isEn && cards.workPreferences.locationTimezoneEn
                  ? cards.workPreferences.locationTimezoneEn
                  : cards.workPreferences.locationTimezone).replace(/—/g, "-")}
              </div>
            </div>

            {/* 2 Kolom Seimbang: SLA Respon (Kiri) & Ruang Lingkup Kolaborasi (Kanan) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 font-mono text-xs">
              <div className="p-3.5 bg-[var(--vt-chrome)] border border-[var(--vt-edge-lo-2)] rounded-xs space-y-2.5 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block border-b border-border/60 pb-1.5">
                    {isEn ? "Response Time Guarantee (SLA)" : "Jaminan Waktu Respon (SLA)"}
                  </span>
                  <p className="font-bold text-[var(--vt-ink)] text-sm flex items-center gap-1.5 mt-2">
                    <Clock className="h-4 w-4 text-primary shrink-0" />
                    <span>
                      {(isEn && cards.workPreferences.responseTimeSlaEn
                        ? cards.workPreferences.responseTimeSlaEn
                        : cards.workPreferences.responseTimeSla).replace(/—/g, "-")}
                    </span>
                  </p>
                  <p className="text-[11px] text-muted-foreground font-sans mt-2 leading-relaxed">
                    {isEn
                      ? "Inquiries received via the contact form or WhatsApp are reviewed promptly with direct technical feasibility feedback."
                      : "Pesan yang masuk melalui form kontak maupun WhatsApp ditinjau cepat dengan penilaian teknis langsung."}
                  </p>
                </div>
                <div className="pt-2 border-t border-[var(--vt-edge-lo-2)]/60 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>{isEn ? "Direct Technical Consultation" : "Konsultasi Rekayasa Langsung"}</span>
                </div>
              </div>

              <div className="p-3.5 bg-[var(--vt-chrome)] border border-[var(--vt-edge-lo-2)] rounded-xs space-y-2.5">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block border-b border-border/60 pb-1.5">
                  {isEn ? "Core Collaboration Scope" : "Ruang Lingkup Kolaborasi"}
                </span>
                <ul className="space-y-2 text-[11px]">
                  {cards.workPreferences.collaborationTypes.map((type, tIdx) => {
                    const title = isEn && type.titleEn ? type.titleEn : type.title;
                    return (
                      <li key={tIdx} className="flex items-start gap-2 text-[var(--vt-ink)] leading-snug">
                        <span className="text-primary font-bold">»</span>
                        <span>{title}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
