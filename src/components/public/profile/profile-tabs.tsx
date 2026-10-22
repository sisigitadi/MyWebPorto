"use client";

import React, { useState } from "react";
import {
  Cpu,
  Clock,
  ShieldCheck,
  FileCode,
  Terminal,
  Code,
  Layout,
  Server,
  Shield,
  Database,
  Mail,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { ProfileCardsConfig } from "@/lib/profile-cards-meta";
import { useTranslation } from "@/lib/i18n";
import { playOS } from "@/lib/os-sound";

interface ProfileTabsProps {
  cards: ProfileCardsConfig;
}

export function ProfileTabs({ cards }: ProfileTabsProps) {
  const { language } = useTranslation();
  const isEn = language === "en";

  const [activeTab, setActiveTab] = useState<
    "specs" | "timeline" | "availability" | "credentials" | "manifesto"
  >("specs");

  const handleTabChange = (
    tab: "specs" | "timeline" | "availability" | "credentials" | "manifesto"
  ) => {
    playOS("click");
    setActiveTab(tab);
  };

  const handleRequestResume = () => {
    playOS("windowOpen");
    // Buka aplikasi Kontak SigitOS dengan template permohonan resume terisi otomatis
    const resumePrompt = isEn
      ? "Hello Sigit, I would like to request a copy of your full CV/Resume for an upcoming project/opportunity. Please let me know your availability."
      : "Halo Sigit, saya tertarik untuk meminta salinan dokumen CV / Resume lengkap Anda untuk keperluan proyek/peluang kerja. Mohon informasikan ketersediaan Anda.";

    try {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("contactSubject", isEn ? "Full CV / Resume Request" : "Permintaan CV / Resume Lengkap");
        sessionStorage.setItem("contactBody", resumePrompt);
      }
    } catch {}

    const event = new CustomEvent("switch-os-app", {
      detail: "kontak",
    });
    window.dispatchEvent(event);

    // Kirim event tambahan untuk mengisi pesan di form kontak
    const fillEvent = new CustomEvent("prefill-contact-form", {
      detail: {
        subject: isEn ? "Full CV / Resume Request" : "Permintaan CV / Resume Lengkap",
        message: resumePrompt,
      },
    });
    window.dispatchEvent(fillEvent);
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
          WINDOWS 98 TAB STRIP (Authentic Beveled Tabs)
          ======================================================== */}
      <div
        role="tablist"
        aria-label="Profile Details Tabs"
        className="flex items-end gap-1 overflow-x-auto vt-scrollbar pb-[1px] -mb-[2px] z-10 relative select-none font-mono text-[11px] sm:text-xs"
      >
        {/* Tab 1: SPECS.SYS */}
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "specs"}
          onClick={() => handleTabChange("specs")}
          className={`px-2.5 sm:px-3.5 py-1.5 rounded-t-xs border-t-2 border-l-2 border-r-2 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "specs"
              ? "bg-[var(--vt-paper)] border-[var(--vt-edge-hi-2)] text-[var(--vt-ink)] font-extrabold z-20 pb-2 shadow-xs"
              : "bg-[var(--vt-chrome)] border-[var(--vt-edge-lo-2)] text-muted-foreground hover:text-[var(--vt-ink)] opacity-85 hover:opacity-100"
          }`}
        >
          <Cpu className="h-3.5 w-3.5 text-primary" />
          <span>01_SPECS.SYS</span>
        </button>

        {/* Tab 2: TIMELINE.LOG */}
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "timeline"}
          onClick={() => handleTabChange("timeline")}
          className={`px-2.5 sm:px-3.5 py-1.5 rounded-t-xs border-t-2 border-l-2 border-r-2 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "timeline"
              ? "bg-[var(--vt-paper)] border-[var(--vt-edge-hi-2)] text-[var(--vt-ink)] font-extrabold z-20 pb-2 shadow-xs"
              : "bg-[var(--vt-chrome)] border-[var(--vt-edge-lo-2)] text-muted-foreground hover:text-[var(--vt-ink)] opacity-85 hover:opacity-100"
          }`}
        >
          <Clock className="h-3.5 w-3.5 text-[#d97706] dark:text-[#fbbf24]" />
          <span>02_TIMELINE.LOG</span>
        </button>

        {/* Tab 3: AVAILABILITY.CFG */}
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "availability"}
          onClick={() => handleTabChange("availability")}
          className={`px-2.5 sm:px-3.5 py-1.5 rounded-t-xs border-t-2 border-l-2 border-r-2 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "availability"
              ? "bg-[var(--vt-paper)] border-[var(--vt-edge-hi-2)] text-[var(--vt-ink)] font-extrabold z-20 pb-2 shadow-xs"
              : "bg-[var(--vt-chrome)] border-[var(--vt-edge-lo-2)] text-muted-foreground hover:text-[var(--vt-ink)] opacity-85 hover:opacity-100"
          }`}
        >
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          <span>03_AVAILABILITY.CFG</span>
        </button>

        {/* Tab 4: SECURITY_CLEARANCE.DAT */}
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "credentials"}
          onClick={() => handleTabChange("credentials")}
          className={`px-2.5 sm:px-3.5 py-1.5 rounded-t-xs border-t-2 border-l-2 border-r-2 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "credentials"
              ? "bg-[var(--vt-paper)] border-[var(--vt-edge-hi-2)] text-[var(--vt-ink)] font-extrabold z-20 pb-2 shadow-xs"
              : "bg-[var(--vt-chrome)] border-[var(--vt-edge-lo-2)] text-muted-foreground hover:text-[var(--vt-ink)] opacity-85 hover:opacity-100"
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5 text-[#059669] dark:text-[#34d399]" />
          <span>04_SECURITY.DAT</span>
        </button>

        {/* Tab 5: MANIFESTO.TXT */}
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "manifesto"}
          onClick={() => handleTabChange("manifesto")}
          className={`px-2.5 sm:px-3.5 py-1.5 rounded-t-xs border-t-2 border-l-2 border-r-2 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "manifesto"
              ? "bg-[var(--vt-paper)] border-[var(--vt-edge-hi-2)] text-[var(--vt-ink)] font-extrabold z-20 pb-2 shadow-xs"
              : "bg-[var(--vt-chrome)] border-[var(--vt-edge-lo-2)] text-muted-foreground hover:text-[var(--vt-ink)] opacity-85 hover:opacity-100"
          }`}
        >
          <FileCode className="h-3.5 w-3.5 text-[#7c5cff]" />
          <span>05_MANIFESTO.TXT</span>
        </button>
      </div>

      {/* ========================================================
          TAB CONTENT PANEL (Beveled Container)
          ======================================================== */}
      <div className="relative border-2 border-[var(--vt-edge-hi-2)] bg-[var(--vt-paper)] p-3 sm:p-5 rounded-b-xs rounded-tr-xs shadow-inner min-h-[260px]">
        {/* ======================================================
            TAB 1: TECH_STACK.SYS (Device Manager / Arsenal Teknis)
            ====================================================== */}
        {activeTab === "specs" && (
          <div className="space-y-4 animate-in fade-in duration-150">
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
                      <h4 className="font-mono font-bold text-xs text-[var(--vt-ink)] uppercase tracking-wider">
                        {title}
                      </h4>
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
          <div className="space-y-4 animate-in fade-in duration-150">
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
                const period = isEn && item.periodEn ? item.periodEn : item.period;
                const description =
                  isEn && item.descriptionEn ? item.descriptionEn : item.description;

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
            TAB 3: WORK_PREFERENCES.CFG (Status, SLA & Minta CV)
            ====================================================== */}
        {activeTab === "availability" && (
          <div className="space-y-4 animate-in fade-in duration-150">
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
                {isEn && cards.workPreferences.locationTimezoneEn
                  ? cards.workPreferences.locationTimezoneEn
                  : cards.workPreferences.locationTimezone}
              </div>
            </div>

            {/* SLA & Types of Work */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 font-mono text-xs">
              <div className="p-3 bg-[var(--vt-chrome)] border border-[var(--vt-edge-lo-2)] rounded-xs space-y-2">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block border-b border-border/60 pb-1">
                  {isEn ? "Response Time Guarantee (SLA)" : "Jaminan Waktu Respon (SLA)"}
                </span>
                <p className="font-bold text-[var(--vt-ink)] text-sm flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>
                    {isEn && cards.workPreferences.responseTimeSlaEn
                      ? cards.workPreferences.responseTimeSlaEn
                      : cards.workPreferences.responseTimeSla}
                  </span>
                </p>
                <p className="text-[11px] text-muted-foreground font-sans">
                  {isEn
                    ? "Inquiries received via the contact form or WhatsApp are reviewed promptly with direct technical feasibility feedback."
                    : "Pesan yang masuk melalui form kontak maupun WhatsApp ditinjau cepat dengan penilaian teknis langsung."}
                </p>
              </div>

              <div className="p-3 bg-[var(--vt-chrome)] border border-[var(--vt-edge-lo-2)] rounded-xs space-y-2">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block border-b border-border/60 pb-1">
                  {isEn ? "Core Collaboration Scope" : "Ruang Lingkup Kolaborasi"}
                </span>
                <ul className="space-y-1.5 text-[11px]">
                  {cards.workPreferences.collaborationTypes.map((type, tIdx) => {
                    const title = isEn && type.titleEn ? type.titleEn : type.title;
                    return (
                      <li key={tIdx} className="flex items-start gap-1.5 text-[var(--vt-ink)]">
                        <span className="text-primary font-bold">»</span>
                        <span>{title}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>

            {/* Request CV Action Box (No direct download per requirement #3) */}
            <div className="mt-4 p-3.5 bg-[var(--vt-paper)] border-2 border-[var(--vt-edge-hi-2)] rounded-xs flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
              <div className="space-y-0.5 text-center sm:text-left">
                <span className="font-mono text-xs font-bold text-[var(--vt-ink)] flex items-center justify-center sm:justify-start gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-primary" />
                  <span>{isEn ? "Need an Official CV / Resume Document?" : "Membutuhkan Dokumen CV / Resume Resmi?"}</span>
                </span>
                <p className="text-[11px] font-sans text-muted-foreground">
                  {isEn && cards.workPreferences.contactPromptEn
                    ? cards.workPreferences.contactPromptEn
                    : cards.workPreferences.contactPrompt}
                </p>
              </div>

              <button
                type="button"
                onClick={handleRequestResume}
                className="vt-btn vt-btn-pink px-4 py-2 text-xs font-mono font-bold text-white flex items-center gap-2 cursor-pointer shadow-md shrink-0 hover:scale-[1.02] transition-transform"
              >
                <Mail className="h-3.5 w-3.5" />
                <span>{isEn ? "Request Full CV via Contact" : "Minta CV Lengkap via Form Kontak"}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ======================================================
            TAB 4: CREDENTIALS_&_BADGES.DAT (Cybersecurity & Quality)
            ====================================================== */}
        {activeTab === "credentials" && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-[var(--vt-edge-lo-2)] pb-2 text-xs font-mono">
              <span className="font-bold text-[var(--vt-ink)] flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-[#059669] dark:text-[#34d399]" />
                <span>CERTIFICATE_AUTHORITY :: SECURITY_&_STANDARDS.DAT</span>
              </span>
              <span className="text-[10px] text-muted-foreground hidden sm:inline">
                Clearance: VERIFIED
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 font-mono text-xs">
              {cards.credentials.map((cred, cIdx) => {
                const title = isEn && cred.titleEn ? cred.titleEn : cred.title;
                return (
                  <div
                    key={cred.id || cIdx}
                    className="p-3 bg-[var(--vt-chrome)] border border-[var(--vt-edge-lo-2)] rounded-xs flex flex-col justify-between space-y-2 hover:border-primary transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-1 text-[10px] text-muted-foreground">
                        <span className="font-bold">{cred.issuer}</span>
                        <span>{cred.year}</span>
                      </div>
                      <h4 className="font-bold text-xs sm:text-sm text-[var(--vt-ink)] leading-snug">
                        {title}
                      </h4>
                    </div>

                    {cred.badgeText && (
                      <div className="pt-1">
                        <span className="inline-block px-2 py-0.5 bg-black/10 dark:bg-black/30 border border-[var(--vt-edge-lo)] text-[9px] font-bold text-primary rounded-2xs">
                          {cred.badgeText}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ======================================================
            TAB 5: CODE_PHILOSOPHY.TXT (Notepad Manifesto)
            ====================================================== */}
        {activeTab === "manifesto" && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-[var(--vt-edge-lo-2)] pb-2 text-xs font-mono">
              <span className="font-bold text-[var(--vt-ink)] flex items-center gap-1.5">
                <FileCode className="h-3.5 w-3.5 text-[#7c5cff]" />
                <span>NOTEPAD.EXE :: CODE_PHILOSOPHY.TXT</span>
              </span>
              <span className="text-[10px] text-muted-foreground hidden sm:inline">
                Encoding: UTF-8 // Plaintext
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 font-mono text-xs">
              {cards.philosophy.map((phil, pIdx) => {
                const principle = isEn && phil.principleEn ? phil.principleEn : phil.principle;
                const detail = isEn && phil.detailEn ? phil.detailEn : phil.detail;

                return (
                  <div
                    key={phil.id || pIdx}
                    className="p-3 bg-[var(--vt-chrome)] border border-[var(--vt-edge-lo-2)] rounded-xs space-y-1.5"
                  >
                    <div className="flex items-center gap-2 text-primary font-bold text-xs">
                      <span className="px-1.5 py-0.5 bg-[var(--vt-paper)] border border-border text-[10px] rounded-2xs">
                        0{pIdx + 1}
                      </span>
                      <span>{principle}</span>
                    </div>
                    <p className="text-xs font-sans text-[var(--vt-ink)] leading-relaxed">
                      {detail}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
