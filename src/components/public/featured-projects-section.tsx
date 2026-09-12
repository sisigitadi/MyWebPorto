"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowLeft,
  FolderGit2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Mail,
} from "lucide-react";
import { ProjectData, ProfileData, DUMMY_PROJECTS } from "@/lib/dummy-data";
import { useTranslation } from "@/lib/i18n";
import { OSWindow } from "@/components/public/os/os-window";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { buildContactPrefillUrl } from "@/lib/contact-link";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

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

interface FeaturedProjectsSectionProps {
  projects: ProjectData[];
  profile?: ProfileData;
}

export function FeaturedProjectsSection({ projects, profile }: FeaturedProjectsSectionProps) {
  const { t, language } = useTranslation();
  const sectionRef = useRef<HTMLElement>(null);
  const [selectedProject, setSelectedProject] = useState<ProjectData | null>(null);

  const rawProjects = projects && Array.isArray(projects) && projects.length > 0 ? projects : DUMMY_PROJECTS;
  const filtered = rawProjects.filter((p) => p.published !== false && p.featured);
  const featuredProjects = filtered.length > 0 ? filtered : rawProjects.slice(0, 3);

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

  // When a project is selected for in-window detail inspection
  if (selectedProject) {
    const title = (language === "en" && selectedProject.titleEn) ? selectedProject.titleEn : selectedProject.title;
    const summary = (language === "en" && selectedProject.summaryEn)
      ? selectedProject.summaryEn
      : selectedProject.summary;
    const description = (language === "en" && selectedProject.descriptionEn)
      ? selectedProject.descriptionEn
      : (selectedProject.description || selectedProject.summary);

    const currentIndex = featuredProjects.findIndex((p) => p.id === selectedProject.id);
    const prevProject = featuredProjects[(currentIndex - 1 + featuredProjects.length) % featuredProjects.length];
    const nextProject = featuredProjects[(currentIndex + 1) % featuredProjects.length];

    const discussionSubject = language === "en" ? `Project Inquiry: ${title}` : `Diskusi Proyek: ${title}`;
    const discussionBody = language === "en"
      ? `Hello ${profile?.name || "Sigit Adi"},\n\nI saw your project "${title}" and would like to discuss building something similar.`
      : `Halo ${profile?.name || "Sigit Adi"},\n\nSaya melihat proyek "${title}" di portofolio Anda dan ingin mendiskusikan peluang kerja sama atau proyek serupa.`;
    const contactDiscussionUrl = buildContactPrefillUrl({
      subject: discussionSubject,
      body: discussionBody,
    });

    return (
      <section id="proyek" className="relative py-4 md:py-6">
        <div className="max-w-6xl mx-auto space-y-4">
          {/* Top In-Window Breadcrumb & Controls */}
          <div className="vt-raised p-2 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
            {/* Back Button */}
            <button
              type="button"
              onClick={() => setSelectedProject(null)}
              className="vt-btn vt-btn-chrome px-3 py-1 text-xs font-bold text-foreground flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-primary" />
              <span className="hidden sm:inline">{language === "en" ? "Back to Projects Grid" : "Kembali ke Daftar Proyek"}</span>
              <span className="sm:hidden">{language === "en" ? "Projects" : "Proyek"}</span>
            </button>


            {/* Prev / Next Project Switcher */}
            <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
              <button
                type="button"
                onClick={() => setSelectedProject(prevProject)}
                className="vt-btn vt-btn-chrome px-2 py-1 text-xs font-bold flex items-center gap-1 cursor-pointer"
                title="Lihat Proyek Sebelumnya"
              >
                <ChevronLeft className="h-3 w-3" />
                <span className="hidden md:inline">Prev</span>
              </button>
              <span className="px-2 py-0.5 bg-muted rounded border border-border text-[11px] font-bold text-[var(--vt-ink)]">
                {currentIndex + 1} / {featuredProjects.length}
              </span>
              <button
                type="button"
                onClick={() => setSelectedProject(nextProject)}
                className="vt-btn vt-btn-chrome px-2 py-1 text-xs font-bold flex items-center gap-1 cursor-pointer"
                title="Lihat Proyek Selanjutnya"
              >
                <span className="hidden md:inline">Next</span>
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Main In-Window Project Viewer */}
          <OSWindow
            title="Project_Viewer.exe"
            icon={<FolderGit2 className="h-4 w-4 text-cyan-400" />}
            statusText="Author: Sigit Adi // Status: VERIFIED"
          >
            <div className="space-y-6">
              {/* Header Title & Date */}
              <div className="space-y-2 pb-4 border-b border-border/70">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="bg-amber-400 text-black text-xs font-bold px-2 py-0.5 rounded-xs font-mono uppercase">
                    FEATURED PROJECT
                  </span>
                  <span className="text-xs font-mono font-bold text-[var(--vt-ink)] inline-flex items-center gap-1 ml-auto">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    <span>{new Date(selectedProject.createdAt).toLocaleDateString("id-ID", { year: "numeric", month: "long" })}</span>
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-display tracking-tight text-[var(--vt-ink)]">
                  {title}
                </h2>

                <p className="text-sm font-mono font-bold text-[var(--vt-blue)]">
                  {summary}
                </p>
              </div>

              {/* Media Preview Box */}
              <div className="relative aspect-[16/9] max-h-[420px] w-full overflow-hidden rounded-xs vt-card-inset bg-black/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedProject.thumbnailUrl}
                  alt={title}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Action Buttons Toolbar */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {selectedProject.demoUrl && (
                  <a
                    href={selectedProject.demoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="vt-btn vt-btn-pink px-4 py-2 text-xs font-bold font-mono flex items-center gap-1.5 shadow-md"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>RUN LIVE DEMO</span>
                  </a>
                )}

                {selectedProject.repoUrl && (
                  <a
                    href={selectedProject.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="vt-btn vt-btn-chrome px-4 py-2 text-xs font-bold font-mono flex items-center gap-1.5"
                  >
                    <GithubIcon className="h-4 w-4" />
                    <span>SOURCE CODE</span>
                  </a>
                )}

                <Link
                  href={contactDiscussionUrl}
                  className="vt-btn vt-btn-chrome px-4 py-2 text-xs font-bold font-mono flex items-center gap-1.5"
                >
                  <Mail className="h-4 w-4 text-rose-500" />
                  <span>DISKUSIKAN VIA EMAIL</span>
                </Link>

              </div>

              {/* Tech Stack Chips */}
              <div className="space-y-2 pt-2">
                <span className="font-pixel text-xs font-bold text-[var(--vt-ink)] uppercase">
                  TEKNOLOGI & SPESIFIKASI:
                </span>
                <div className="flex flex-wrap gap-2">
                  {selectedProject.techStack.map((tech) => (
                    <span
                      key={tech}
                      className="vt-card-inset px-3 py-1 font-mono text-xs font-bold text-[var(--vt-ink)] bg-[var(--vt-card)] border border-[var(--vt-edge-lo-2)]"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              {/* In-depth Project Description */}
              <div className="space-y-2 pt-2">
                <span className="font-pixel text-xs font-bold text-[var(--vt-ink)] uppercase">
                  DOKUMENTASI & RINGKASAN:
                </span>
                <div className="vt-card-inset p-4 bg-card text-[var(--vt-ink)] font-mono text-xs sm:text-sm leading-relaxed border-l-4 border-l-[var(--vt-blue)] font-medium space-y-3 whitespace-pre-line">
                  {description}
                </div>
              </div>

              {/* Bottom Back Action */}
              <div className="pt-4 border-t border-border/80 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setSelectedProject(null)}
                  className="vt-btn vt-btn-chrome px-4 py-2 text-xs font-bold font-mono flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5 text-primary" />
                  <span className="hidden sm:inline">{language === "en" ? "Back to Projects Grid" : "Kembali ke Daftar Proyek"}</span>
                  <span className="sm:hidden">{language === "en" ? "Projects" : "Proyek"}</span>
                </button>

                <span className="text-xs font-mono font-bold text-[var(--vt-ink)] opacity-75">
                  SigitOS // Instant Project Viewer
                </span>
              </div>
            </div>
          </OSWindow>
        </div>
      </section>
    );
  }

  // Default Grid View
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
            <span className="text-xs font-bold text-[var(--vt-ink)] font-pixel">DIRECTORY:</span>
            <div className="vt-card-inset flex-1 px-2.5 py-1 bg-background text-[var(--vt-ink)] font-mono text-xs font-bold truncate">
              C:\Sigit\Portfolio\Projects\Featured\
            </div>
            <span className="hidden sm:inline-flex px-2.5 py-1 vt-btn vt-btn-chrome text-xs font-bold">
              [{featuredProjects.length} ITEMS]
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
                        FEATURED
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-base sm:text-lg font-bold font-mono text-[var(--vt-ink)] leading-snug">
                      {title}
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

                  {/* Actions (Instant In-Window Detail View) */}
                  <div className="pt-3 border-t border-border/80 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedProject(project)}
                      className="flex-1 vt-btn vt-btn-chrome py-1.5 px-2.5 text-xs font-bold font-mono text-foreground justify-center cursor-pointer"
                    >
                      <span>Detail</span>
                      <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </button>

                    {project.demoUrl && (
                      <a
                        href={project.demoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="vt-btn vt-btn-pink py-1.5 px-3 text-xs font-bold font-mono justify-center"
                        title="Jalankan Demo Langsung"
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
      </div>
    </section>
  );
}
