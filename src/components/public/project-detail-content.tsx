"use client";

import React, { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Calendar, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "@/lib/i18n";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

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
  const mediaRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const title = (language === "en" && project.titleEn) ? project.titleEn : project.title;
  const summary = (language === "en" && project.summaryEn)
    ? project.summaryEn
    : (language === "en" && project.descriptionEn)
    ? project.descriptionEn
    : project.summary;
  const description = (language === "en" && project.descriptionEn) ? project.descriptionEn : project.description;

  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.from(".detail-back-btn", { y: -10, opacity: 0, duration: 0.5 })
        .from(".detail-header", { y: 20, opacity: 0, duration: 0.7 }, "-=0.3")
        .from(mediaRef.current, { scale: 0.96, opacity: 0, duration: 0.8 }, "-=0.4")
        .from(contentRef.current, { y: 25, opacity: 0, duration: 0.7 }, "-=0.4");
    },
    { scope: containerRef }
  );

  const isEnglish = language === "en";
  const encodedDiscussionSubject = encodeURIComponent(
    isEnglish ? `Project Discussion: ${title}` : `Diskusi Proyek: ${title}`
  );
  const encodedDiscussionMsg = encodeURIComponent(
    isEnglish
      ? `Hello ${profile.name || "Admin"},\n\nI came across "${title}" on your portfolio and would like to explore collaboration or a similar project.`
      : `Halo ${profile.name || "Admin"},\n\nSaya melihat proyek "${title}" di portofolio Anda dan tertarik mendiskusikan peluang kerja sama atau proyek serupa.`
  );
  const emailDiscussionUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
    profile.email
  )}&su=${encodedDiscussionSubject}&body=${encodedDiscussionMsg}`;

  const ctaDesc = t.detail_cta_box_desc.replace("{name}", profile.name || "Portfolio Owner");

  return (
    <div ref={containerRef} className="py-20 md:py-32">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Back Link */}
        <div className="mb-10 detail-back-btn">
          <Button asChild variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground -ml-3 text-xs font-medium">
            <Link href="/proyek">
              <ArrowLeft className="h-4 w-4" />
              <span>{t.detail_back_all}</span>
            </Link>
          </Button>
        </div>

        {/* Project Header - Wide & Breathable */}
        <div className="detail-header space-y-5 mb-10">
          <div className="flex flex-wrap items-center gap-3">
            {project.featured && (
              <Badge variant="secondary" className="font-medium text-xs shadow-sm">
                {t.projects_featured_badge}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(project.createdAt).toLocaleDateString(t.date_locale || "id-ID", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-foreground leading-[1.08] max-w-4xl">
            {title}
          </h1>

          <p className="text-base sm:text-xl text-muted-foreground leading-relaxed max-w-3xl">
            {summary}
          </p>
        </div>

        {/* Fixed Media Frame - Cinematic Display */}
        <div
          ref={mediaRef}
          className="relative aspect-[16/9] md:aspect-[21/9] w-full rounded-2xl overflow-hidden border border-border bg-muted mb-12 shadow-xl"
        >
          <Image
            src={project.thumbnailUrl}
            alt={title}
            fill
            priority
            sizes="(max-width: 1200px) 100vw, 1100px"
            className="object-cover"
          />
        </div>

        {/* Meta Bar & Direct Action Links (Clean, unboxed) */}
        <div
          ref={contentRef}
          className="space-y-12"
        >
          <div className="p-6 md:p-8 rounded-2xl border border-border bg-card/60 backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="text-xs uppercase tracking-[0.2em] font-semibold text-primary block">
                {t.detail_tech_title}
              </span>
              <div className="flex flex-wrap gap-2">
                {project.techStack.map((tech) => (
                  <Badge
                    key={tech}
                    variant="outline"
                    className="bg-background/80 text-foreground border-border font-normal text-xs py-1 px-3"
                  >
                    {tech}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {project.demoUrl && (
                <Button asChild size="default" className="gap-2 font-medium h-10 text-xs shadow-sm">
                  <a href={project.demoUrl} target="_blank" rel="noreferrer">
                    <span>{t.detail_cta_demo}</span>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              )}

              {project.repoUrl && (
                <Button asChild variant="outline" size="default" className="gap-2 font-medium h-10 text-xs border-border bg-card hover:bg-muted/40">
                  <a href={project.repoUrl} target="_blank" rel="noreferrer">
                    <GithubIcon className="h-4 w-4" />
                    <span>{t.detail_cta_repo}</span>
                  </a>
                </Button>
              )}
            </div>
          </div>

          {/* Project In-Depth Narrative Description */}
          <div className="space-y-6 max-w-3xl">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground border-b border-border/60 pb-4">
              {t.detail_overview_title}
            </h2>
            <div className="text-muted-foreground leading-relaxed text-base md:text-lg space-y-4 font-normal">
              <p>{description}</p>
              <p>{t.detail_overview_desc}</p>
            </div>
          </div>

          <Separator className="my-14" />

          {/* High-Contrast Conversion CTA Box */}
          <div className="p-8 md:p-14 rounded-3xl border border-border bg-card/80 backdrop-blur-sm text-card-foreground text-center space-y-5 shadow-lg">
            <h3 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
              {t.detail_cta_box_title}
            </h3>
            <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
              {ctaDesc}
            </p>
            <div className="pt-3">
              <Button asChild size="lg" className="h-12 px-8 gap-2.5 font-medium text-sm shadow-md">
                <a href={emailDiscussionUrl} target="_blank" rel="noopener noreferrer">
                  <Mail className="h-4 w-4 text-red-500" />
                  <span>{t.detail_cta_gmail}</span>
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
