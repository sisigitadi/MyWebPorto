"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Calendar, Mail, Terminal, HardDrive, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "@/lib/i18n";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { OSWindow } from "@/components/public/os/os-window";
import { prefillContact, CONTACT_SECTION_HREF } from "@/lib/contact-link";

function GithubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
    </svg>
  );
}

interface ProjectDetailContentProps {
  project: {
    id: string;
    slug: string;
    title: string;
    titleEn?: string | null;
    summary: string;
    summaryEn?: string | null;
    description: string;
    descriptionEn?: string | null;
    thumbnailUrl: string;
    demoUrl?: string | null;
    repoUrl?: string | null;
    techStack: string[];
    featured: boolean;
    published: boolean;
    createdAt: string | Date;
  };
  profile: {
    name: string;
    email: string;
  };
}

export function ProjectDetailContent({ project, profile }: ProjectDetailContentProps) {
  const { t, language } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);

  const title = language === "en" && project.titleEn ? project.titleEn : project.title;
  const summary =
    language === "en" && project.summaryEn
      ? project.summaryEn
      : language === "en" && project.descriptionEn
      ? project.descriptionEn
      : project.summary;
  const description = language === "en" && project.descriptionEn ? project.descriptionEn : project.description;

  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(".detail-content-section", {
        y: 20,
        opacity: 0,
        filter: "blur(4px)",
        duration: 0.6,
        stagger: 0.1,
      });
    },
    { scope: containerRef }
  );

  const isEnglish = language === "en";
  const discussionSubject = isEnglish ? `Project Discussion: ${title}` : `Diskusi Proyek: ${title}`;
  const discussionBody = isEnglish
    ? `Hello ${profile.name || "Sigit"},\n\nI came across "${title}" on your portfolio and would like to explore collaboration or a similar project.`
    : `Halo ${profile.name || "Sigit"},\n\nSaya melihat proyek "${title}" di portofolio Anda dan tertarik mendiskusikan peluang kerja sama atau proyek serupa.`;
  const ctaDesc = t.detail_cta_box_desc.replace("{name}", profile.name || "Sigit");

  return (
    <div ref={containerRef} className="py-6 md:py-10 vt-crt-on">
      <div className="max-w-5xl mx-auto px-3 sm:px-6 space-y-6">
        {/* Navigation Bar — sticky agar selalu terlihat saat scroll fullscreen */}
        <div className="sticky top-0 z-20 -mx-3 sm:mx-0 px-3 sm:px-0 py-2 bg-[var(--vt-paper)]/95 backdrop-blur border-b border-border/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              asChild
              size="sm"
              className="vt-btn vt-btn-chrome h-8 px-3 font-mono text-xs font-bold gap-1.5 cursor-pointer"
            >
              <Link href="/">
                <Monitor className="h-3.5 w-3.5 text-primary" />
                <span className="hidden sm:inline">{language === "en" ? "Back to Desktop OS" : "Kembali ke Desktop OS"}</span>
                <span className="sm:hidden">Desktop</span>
              </Link>
            </Button>

            <Button
              asChild
              size="sm"
              className="vt-btn vt-btn-chrome h-8 px-3 font-mono text-xs font-bold gap-1.5 cursor-pointer border-primary/30"
            >
              <Link href="/proyek">
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t.detail_back_all}</span>
                <span className="sm:hidden">{language === "en" ? "Projects" : "Proyek"}</span>
              </Link>
            </Button>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono font-bold text-[var(--vt-ink)] min-w-0">
            <HardDrive className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="hidden sm:inline mobile-safe-path max-w-[220px] sm:max-w-none">C:\Sigit\Projects\{project.slug}\</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-bold shrink-0">[OK]</span>
          </div>
        </div>

        {/* Main Project OS Window */}
        <OSWindow
          id={`project-${project.slug}`}
          title={`Project_Viewer.exe :: [${project.slug.toUpperCase()}]`}
          icon={<Terminal className="h-4 w-4 text-emerald-400" />}
          statusText={`Record ID: ${project.id} | Author: ${profile.name || "Sigit"} | Published: YES`}
        >
          <div className="detail-content-section space-y-6">
            {/* Header / Meta */}
            <div className="space-y-3 pb-4 border-b border-border/70">
              <div className="flex flex-wrap items-center gap-2">
                {project.featured && (
                  <span className="bg-amber-400 text-black text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase">
                    {t.projects_featured_badge}
                  </span>
                )}
                <span className="text-xs font-mono text-muted-foreground inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(project.createdAt).toLocaleDateString(t.date_locale || "id-ID", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold font-pixel tracking-tight text-foreground leading-tight">
                {title}
              </h1>

              <p className="text-xs sm:text-sm font-mono text-[var(--vt-ink)] leading-relaxed mobile-safe-text">
                {summary}
              </p>
            </div>

            {/* Media Frame */}
            <div className="relative aspect-[16/9] md:aspect-[21/9] w-full rounded border-2 border-border overflow-hidden bg-black/60 shadow-inner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={project.thumbnailUrl}
                alt={title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 text-[10px] font-mono text-emerald-400 border border-emerald-500/40 rounded">
                PREVIEW_MODE: HIGH_RES
              </div>
            </div>

            {/* Action Bar & Tech Stack */}
            <div className="p-4 rounded bg-muted/40 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-mono font-bold text-primary tracking-wider block">
                  {t.detail_tech_title}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {project.techStack.map((tech) => (
                    <span
                      key={tech}
                      className="text-[11px] font-mono px-2 py-0.5 rounded bg-background border border-border text-foreground"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                {project.demoUrl && (
                  <Button
                    asChild
                    size="sm"
                    className="vt-btn-pink h-9 px-4 text-xs font-mono font-bold uppercase gap-1.5"
                  >
                    <a href={project.demoUrl} target="_blank" rel="noreferrer">
                      <span>{t.detail_cta_demo}</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                )}

                {project.repoUrl && (
                  <Button
                    asChild
                    size="sm"
                    className="vt-btn h-9 px-4 text-xs font-mono font-bold uppercase gap-1.5"
                  >
                    <a href={project.repoUrl} target="_blank" rel="noreferrer">
                      <GithubIcon className="h-3.5 w-3.5" />
                      <span>{t.detail_cta_repo}</span>
                    </a>
                  </Button>
                )}
              </div>
            </div>

            {/* In-Depth Narrative */}
            <div className="space-y-4 pt-2">
              <h2 className="text-lg sm:text-xl font-bold font-mono tracking-tight text-foreground border-b border-border/60 pb-2">
                &gt; {t.detail_overview_title}
              </h2>
              <div className="text-muted-foreground font-mono leading-relaxed text-xs sm:text-sm space-y-3">
                <p>{description}</p>
                <p>{t.detail_overview_desc}</p>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Retro CTA Box */}
            <div className="vt-window p-6 text-center space-y-4 bg-muted/20">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-primary/10 border border-primary/30 text-primary text-xs font-mono">
                <span>CONNECT_SIGIT_SYSTEM</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold font-pixel tracking-tight text-foreground">
                {t.detail_cta_box_title}
              </h3>
              <p className="text-xs sm:text-sm font-mono text-muted-foreground max-w-lg mx-auto">
                {ctaDesc}
              </p>
              <div className="pt-2">
                <Button
                  asChild
                  size="default"
                  className="vt-btn-pink h-10 px-6 font-mono font-bold text-xs uppercase gap-2"
                >
                  <a
                    href={CONTACT_SECTION_HREF}
                    onClick={() => prefillContact({ subject: discussionSubject, body: discussionBody })}
                  >
                    <Mail className="h-4 w-4" />
                    <span>{t.detail_cta_gmail}</span>
                  </a>
                </Button>
              </div>
            </div>

            {/* NOTE: tombol kembali bawah dihapus — sticky nav bar di atas sudah
                menyediakan "Kembali ke Desktop OS" + "Kembali ke Semua Proyek",
                jadi duplikat di sini hanya tambahan visual tanpa fungsi baru. */}
          </div>
        </OSWindow>
      </div>
    </div>
  );
}
