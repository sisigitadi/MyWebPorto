"use client";

import React, { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProjectData } from "@/lib/dummy-data";
import { useTranslation } from "@/lib/i18n";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

interface FeaturedProjectsSectionProps {
  projects: ProjectData[];
}

export function FeaturedProjectsSection({ projects }: FeaturedProjectsSectionProps) {
  const { t, language } = useTranslation();
  const sectionRef = useRef<HTMLElement>(null);
  const featuredProjects = projects.filter((p) => p.published && p.featured);

  useGSAP(
    () => {
      // Header Animation
      gsap.from(".projects-eyebrow", {
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 82%",
        },
        opacity: 0,
        y: 15,
        duration: 0.6,
        ease: "power3.out",
      });

      gsap.from(".projects-title", {
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 80%",
        },
        opacity: 0,
        y: 30,
        filter: "blur(6px)",
        duration: 0.9,
        ease: "power4.out",
      });

      gsap.from(".projects-view-all-btn", {
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 80%",
        },
        opacity: 0,
        scale: 0.9,
        duration: 0.7,
        ease: "back.out(1.5)",
      });

      // Bento Project Cards Stagger
      const cards = gsap.utils.toArray<HTMLElement>(".bento-project-card");
      cards.forEach((card, idx) => {
        gsap.from(card, {
          scrollTrigger: {
            trigger: card,
            start: "top 88%",
          },
          opacity: 0,
          y: 45,
          scale: 0.96,
          rotation: idx % 2 === 0 ? -1 : 1,
          duration: 0.85,
          delay: (idx % 2) * 0.12,
          ease: "back.out(1.3)",
        });
      });
    },
    { scope: sectionRef }
  );

  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty("--mouse-x", `${x}px`);
    e.currentTarget.style.setProperty("--mouse-y", `${y}px`);
  };

  return (
    <section
      ref={sectionRef}
      id="proyek"
      className="relative py-24 md:py-36 border-b border-border/60 scroll-mt-16 overflow-hidden"
    >
      {/* Ambient background glow */}
      <div className="absolute top-1/3 right-1/4 w-[480px] h-[300px] bg-accent/5 rounded-full blur-[120px] pointer-events-none -z-10 animate-float-reverse" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div className="space-y-3 max-w-xl">
            <span className="projects-eyebrow text-xs uppercase tracking-[0.25em] font-semibold text-primary inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              {t.projects_eyebrow}
            </span>
            <h2 className="projects-title text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-foreground leading-[1.1]">
              {t.projects_title}
            </h2>
          </div>
          <Button asChild variant="outline" size="sm" className="projects-view-all-btn h-10 px-5 gap-2 border-border bg-card hover:bg-muted/50 hover:border-foreground/30 text-xs font-medium self-start md:self-auto group transition-all">
            <Link href="/proyek">
              <span>{t.projects_view_all}</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>

        {/* Gapless Mathematically-Locked Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 grid-flow-dense">
          {featuredProjects.map((project, idx) => {
            const isHeroCard = idx === 0;
            const isWideCard = idx === 2 && featuredProjects.length === 3;
            const colSpan = isWideCard
              ? "md:col-span-12"
              : isHeroCard
              ? "md:col-span-7"
              : idx % 2 === 1
              ? "md:col-span-5"
              : "md:col-span-7";

            const title = (language === "en" && project.titleEn) ? project.titleEn : project.title;
            const summary = (language === "en" && project.summaryEn)
              ? project.summaryEn
              : (language === "en" && project.descriptionEn)
              ? project.descriptionEn
              : project.summary;

            return (
              <Card
                key={project.id}
                onMouseMove={handleCardMouseMove}
                className={`bento-project-card spotlight-card group relative overflow-hidden flex flex-col justify-between border-border bg-card/85 backdrop-blur-xs hover:border-foreground/35 transition-all duration-300 ${colSpan}`}
              >
                <div>
                  {/* Image Container with Hover Scale Physics */}
                  <div className={`relative w-full overflow-hidden bg-muted border-b border-border/60 ${isWideCard ? "aspect-[21/9]" : "aspect-[16/10]"}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={project.thumbnailUrl}
                      alt={title}
                      className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-108"
                    />
                    <div className="absolute top-4 right-4 z-10">
                      <Badge variant="secondary" className="text-[10px] uppercase tracking-wider font-semibold backdrop-blur-md bg-background/85 shadow-sm border border-border/60 group-hover:border-primary/50 transition-colors">
                        {t.projects_featured_badge}
                      </Badge>
                    </div>
                  </div>

                  <CardContent className="p-6 md:p-8 space-y-3">
                    <Link href={`/proyek/${project.slug}`}>
                      <h3 className="font-semibold text-xl md:text-2xl text-foreground group-hover:text-primary transition-colors flex items-center justify-between gap-3">
                        <span>{title}</span>
                        <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0 text-primary shrink-0" />
                      </h3>
                    </Link>

                    <p className="text-sm md:text-base text-muted-foreground line-clamp-2 leading-relaxed font-normal">
                      {summary}
                    </p>

                    {/* Tech stack badges with micro-lift */}
                    <div className="flex flex-wrap gap-1.5 pt-3">
                      {project.techStack.map((tech) => (
                        <Badge
                          key={tech}
                          variant="outline"
                          className="text-xs font-normal py-0.5 px-2.5 bg-muted/40 text-muted-foreground border-border/60 hover:border-foreground/30 hover:bg-muted/70 hover:scale-105 active:scale-95 transition-all cursor-default"
                        >
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </div>

                {/* Card Footer Details */}
                <div className="p-6 md:p-8 pt-0 mt-auto border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-mono text-[11px] opacity-75">
                    {project.createdAt
                      ? new Date(project.createdAt).toLocaleDateString(
                          language === "en" ? "en-US" : "id-ID",
                          { month: "short", year: "numeric" }
                        )
                      : ""}
                  </span>
                  <Link
                    href={`/proyek/${project.slug}`}
                    className="font-medium text-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5 group/link"
                  >
                    <span>{t.projects_detail_btn}</span>
                    <ArrowRight className="h-3.5 w-3.5 group-hover/link:translate-x-1.5 transition-transform duration-300" />
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
