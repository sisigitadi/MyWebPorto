"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { ArrowRight, FolderGit2, ExternalLink } from "lucide-react";
import { ProjectData } from "@/lib/dummy-data";
import { useTranslation } from "@/lib/i18n";
import { OSWindow } from "@/components/public/os/os-window";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface FeaturedProjectsSectionProps {
  projects: ProjectData[];
}

export function FeaturedProjectsSection({ projects }: FeaturedProjectsSectionProps) {
  const { t, language } = useTranslation();
  const sectionRef = useRef<HTMLElement>(null);

  // Tanpa fallback dummy: tanpa proyek unggulan, tampil empty state jujur
  const featuredProjects = ((projects && Array.isArray(projects)) ? projects : []).filter(
    (p) => p.published !== false && p.featured
  );

  useGSAP(
    () => {
      gsap.from(".sigit-project-card", {
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
      id="proyek"
      className="relative py-6 md:py-10 scroll-mt-14"
    >
      <div className="max-w-7xl mx-auto px-2 sm:px-4">
        {/* Explorer Address Bar Banner */}
        <div className="vt-raised p-2.5 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-xs font-bold text-[var(--vt-ink)] font-pixel">{language === "en" ? "DIRECTORY:" : "DIREKTORI:"}</span>
            <div className="vt-card-inset flex-1 px-2.5 py-1 bg-background text-[var(--vt-ink)] font-mono text-xs font-bold truncate">
              C:\Sigit\Portfolio\Projects\Featured\
            </div>
            <span className="hidden sm:inline-flex px-2.5 py-1 vt-btn vt-btn-chrome text-xs font-bold">
              [{featuredProjects.length} {language === "en" ? "ITEMS" : "ITEM"}]
            </span>
          </div>
        </div>

        {/* Section Heading */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2 font-pixel text-xs text-[var(--vt-blue)]">
            <span className="h-2 w-2 rounded-full bg-[var(--vt-blue)] animate-pulse" />
            <span>{t.projects_badge}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-display tracking-tight text-[var(--vt-ink)]">
            {t.projects_title}
          </h2>
          <p className="text-xs sm:text-sm font-mono text-[var(--vt-ink)] font-medium mt-1 max-w-2xl">
            {t.projects_page_subtitle}
          </p>
        </div>

        {/* Projects Grid */}
        {featuredProjects.length === 0 ? (
          <div className="text-center py-10 vt-card-inset bg-[var(--vt-card)] rounded-xs border border-dashed border-border font-mono text-xs">
            <FolderGit2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="font-bold text-sm text-[var(--vt-ink)]">{t.projects_empty}</p>
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredProjects.map((project, index) => {
            const title = (language === "en" && project.titleEn) ? project.titleEn : project.title;
            const summary = (language === "en" && project.summaryEn)
              ? project.summaryEn
              : project.summary;

            return (
              <div key={project.id} className="sigit-project-card flex flex-col h-full">
                <OSWindow
                  title={`Project_0${index + 1}.exe`}
                  icon={<FolderGit2 className="h-3 w-3 text-[#ffd400]" />}
                  className="h-full flex-1"
                  bodyClassName="flex flex-col justify-between h-full space-y-4"
                >
                  <div className="space-y-3">
                    {/* Thumbnail with retro sunken bevel */}
                    <div className="relative aspect-[16/10] overflow-hidden rounded-xs vt-card-inset bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={project.thumbnailUrl}
                        alt={title}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                      />
                      <span className="absolute top-2 right-2 font-pixel text-[10px] bg-[var(--vt-pink)] text-white px-2 py-0.5 shadow-md font-bold">
                        {language === "en" ? "FEATURED" : "UNGGULAN"}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-base sm:text-lg font-bold font-mono text-[var(--vt-ink)] leading-snug">
                      <Link href={`/proyek/${project.slug}`} className="hover:underline underline-offset-2">
                        {title}
                      </Link>
                    </h3>

                    {/* Summary */}
                    <p className="text-xs sm:text-sm font-mono text-[var(--vt-ink)] font-medium leading-relaxed line-clamp-2">
                      {summary}
                    </p>

                    {/* Tech Stack Chips */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {project.techStack.slice(0, 4).map((tech) => (
                        <span
                          key={tech}
                          className="vt-card-inset px-2.5 py-0.5 font-mono text-xs font-bold text-[var(--vt-ink)] bg-[var(--vt-card)] border border-[var(--vt-edge-lo-2)]"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-border/80 flex items-center gap-2">
                    <Link
                      href={`/proyek/${project.slug}`}
                      className="flex-1 vt-btn vt-btn-chrome py-1.5 px-2.5 text-xs font-bold font-mono text-foreground justify-center cursor-pointer inline-flex items-center gap-1"
                    >
                      <span>{t.projects_detail_btn}</span>
                      <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Link>

                    {project.demoUrl && (
                      <a
                        href={project.demoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="vt-btn vt-btn-pink py-1.5 px-3 text-xs font-bold font-mono justify-center"
                        title={language === "en" ? "Run Live Demo" : "Jalankan Demo Langsung"}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        <span>RUN</span>
                      </a>
                    )}
                  </div>
                </OSWindow>
              </div>
            );
          })}
        </div>
        )}
      </div>
    </section>
  );
}
