"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowRight, Calendar, Folder, HardDrive, Terminal, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { OSWindow } from "@/components/public/os/os-window";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface ProjectItem {
  id: string;
  slug: string;
  title: string;
  titleEn?: string | null;
  summary: string;
  summaryEn?: string | null;
  descriptionEn?: string | null;
  thumbnailUrl: string;
  techStack: string[];
  featured: boolean;
  published: boolean;
  createdAt: string | Date;
}

interface ProjectsCatalogContentProps {
  projects: ProjectItem[];
}

export function ProjectsCatalogContent({ projects }: ProjectsCatalogContentProps) {
  const { t, language } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.from(".catalog-project-card", {
        y: 35,
        opacity: 0,
        filter: "blur(6px)",
        duration: 0.7,
        stagger: 0.08,
        ease: "power3.out",
        clearProps: "transform,filter",
      });
    },
    { scope: containerRef }
  );

  return (
    <div ref={containerRef} className="py-8 md:py-14 relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 space-y-6">
        {/* Main Explorer Window */}
        <OSWindow
          id="projects-catalog"
          title="SigitOS_File_Manager :: C:\Sigit\Projects\All_Items"
          icon={<Folder className="h-4 w-4 text-amber-300" />}
          statusText={`Total records: ${projects.length} files found | Directory status: READ_ONLY`}
        >
          {/* Retro Explorer Address Bar & Back to Desktop OS */}
          <div className="mb-6 p-2 rounded bg-muted/40 border border-border flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2 min-w-0">
              <Link
                href="/"
                className="vt-btn vt-btn-chrome px-3 py-1 text-xs font-bold text-foreground inline-flex items-center gap-1.5 shrink-0"
              >
                <Monitor className="h-3.5 w-3.5 text-primary" />
                <span className="hidden sm:inline">{language === "en" ? "Back to Desktop OS" : "Kembali ke Menu Desktop"}</span>
                <span className="sm:hidden">Desktop</span>
              </Link>
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-[var(--vt-ink)] font-bold">Address:</span>
                <div className="px-2 py-1 bg-background border border-border/80 rounded flex items-center gap-1 text-primary font-bold">
                  <HardDrive className="h-3.5 w-3.5" />
                  <span className="truncate">C:\Sigit\Portfolio\Projects\Catalog.exe</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[var(--vt-ink)] font-bold text-xs min-w-0">
              <Terminal className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span className="mobile-safe-inline">SIGIT_KERNEL_OK</span>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-8 space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-primary/10 border border-primary/30 text-primary text-xs font-mono font-bold">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
              <span>{t.projects_page_badge}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold font-pixel tracking-tight text-foreground">
              {t.projects_page_title}
            </h1>
            <p className="text-xs sm:text-sm text-[var(--vt-ink)] font-medium font-mono max-w-2xl mobile-safe-text">
              {t.projects_page_subtitle}
            </p>
          </div>

          {/* Projects Grid */}
          {projects.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-lg bg-card/40 font-mono text-xs text-[var(--vt-ink)] font-bold">
              <p>{t.projects_empty}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project, idx) => {
                const title = language === "en" && project.titleEn ? project.titleEn : project.title;
                const summary =
                  language === "en" && project.summaryEn
                    ? project.summaryEn
                    : language === "en" && project.descriptionEn
                    ? project.descriptionEn
                    : project.summary;

                return (
                  <div
                    key={project.id}
                    className="catalog-project-card vt-window flex flex-col group overflow-hidden"
                  >
                    {/* Sub-window Titlebar */}
                    <div className="vt-titlebar py-1 px-2 text-xs font-bold">
                      <span className="truncate">ITEM_{String(idx + 1).padStart(2, "0")}.DAT</span>
                      {project.featured && (
                        <span className="bg-amber-400 text-black text-[10px] font-bold px-1.5 py-0.2 rounded font-mono uppercase">
                          FEATURED
                        </span>
                      )}
                    </div>

                    <div className="p-3 bg-card flex flex-col flex-1">
                      {/* Media Frame with scanline overlay */}
                      <div className="relative aspect-[16/10] w-full overflow-hidden rounded border border-border bg-black/40 mb-3 group-hover:border-primary/50 transition-colors">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={project.thumbnailUrl}
                          alt={title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                      </div>

                      <div className="space-y-2 flex-1">
                        <Link href={`/proyek/${project.slug}`}>
                          <h2 className="text-sm md:text-base font-bold font-mono tracking-tight text-foreground group-hover:text-primary transition-colors line-clamp-1">
                            {title}
                          </h2>
                        </Link>

                        <p className="text-xs text-[var(--vt-ink)] font-medium font-mono leading-relaxed line-clamp-2 mobile-safe-text">
                          {summary}
                        </p>

                        <div className="flex flex-wrap gap-1 pt-1">
                          {project.techStack.map((tech) => (
                            <span
                              key={tech}
                              className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-muted text-[var(--vt-ink)] border border-border"
                            >
                              {tech}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs font-mono font-bold text-[var(--vt-ink)]">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(project.createdAt).toLocaleDateString(t.date_locale || "id-ID", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>

                        <Button
                          asChild
                          size="sm"
                          className="vt-btn-pink h-7 px-2.5 text-[11px] font-mono uppercase font-bold"
                        >
                          <Link href={`/proyek/${project.slug}`}>
                            <span>Open</span>
                            <ArrowRight className="h-3 w-3 ml-1" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </OSWindow>
      </div>
    </div>
  );
}
