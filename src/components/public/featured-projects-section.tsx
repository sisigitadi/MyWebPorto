"use client";

import React, { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
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
      gsap.from(".bento-project-card", {
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 80%",
        },
        opacity: 0,
        y: 40,
        stagger: 0.15,
        duration: 0.8,
        ease: "power3.out",
      });
    },
    { scope: sectionRef }
  );

  return (
    <section
      ref={sectionRef}
      id="proyek"
      className="py-24 md:py-36 border-b border-border/60 scroll-mt-16 overflow-hidden"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div className="space-y-3 max-w-xl">
            <span className="text-xs uppercase tracking-[0.25em] font-semibold text-primary block">
              {t.projects_eyebrow}
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-foreground leading-[1.1]">
              {t.projects_title}
            </h2>
          </div>
          <Button asChild variant="outline" size="sm" className="h-10 px-5 gap-2 border-border bg-card hover:bg-muted/40 text-xs font-medium self-start md:self-auto">
            <Link href="/proyek">
              <span>{t.projects_view_all}</span>
              <ArrowRight className="h-3.5 w-3.5" />
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
                className={`bento-project-card group relative overflow-hidden flex flex-col justify-between border-border bg-card hover:border-foreground/30 transition-all duration-300 ${colSpan}`}
              >
                <div>
                  {/* Image Container with Hover Scale Physics */}
                  <div className={`relative w-full overflow-hidden bg-muted border-b border-border ${isWideCard ? "aspect-[21/9]" : "aspect-[16/10]"}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={project.thumbnailUrl}
                      alt={title}
                      className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                    <div className="absolute top-4 right-4">
                      <Badge variant="secondary" className="text-[10px] uppercase tracking-wider font-semibold backdrop-blur-md bg-background/80 shadow-xs border border-border/50">
                        {t.projects_featured_badge}
                      </Badge>
                    </div>
                  </div>

                  <CardContent className="p-6 md:p-8 space-y-3">
                    <Link href={`/proyek/${project.slug}`}>
                      <h3 className="font-semibold text-xl md:text-2xl text-foreground group-hover:text-primary transition-colors flex items-center justify-between gap-3">
                        <span>{title}</span>
                        <ExternalLink className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground shrink-0" />
                      </h3>
                    </Link>

                    <p className="text-sm md:text-base text-muted-foreground line-clamp-2 leading-relaxed">
                      {summary}
                    </p>

                    {/* Tech stack badges */}
                    <div className="flex flex-wrap gap-1.5 pt-3">
                      {project.techStack.map((tech) => (
                        <Badge
                          key={tech}
                          variant="outline"
                          className="text-xs font-normal py-0.5 px-2.5 bg-muted/30 text-muted-foreground border-border"
                        >
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </div>

                {/* Card Footer Details */}
                <div className="p-6 md:p-8 pt-0 mt-auto border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-mono text-[11px]">{project.createdAt}</span>
                  <Link
                    href={`/proyek/${project.slug}`}
                    className="font-medium text-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5 group/link"
                  >
                    <span>{t.projects_detail_btn}</span>
                    <ArrowRight className="h-3.5 w-3.5 group-hover/link:translate-x-1 transition-transform" />
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
