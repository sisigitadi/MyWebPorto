"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Calendar, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

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
  const headerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // Animate header
      gsap.from(headerRef.current, {
        y: 25,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
      });

      // Animate project cards with stagger
      
    },
    { scope: containerRef }
  );

  return (
    <div ref={containerRef} className="py-24 md:py-36">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Page Header - Clean, Wide, 1-2 Lines */}
        <div ref={headerRef} className="max-w-4xl mb-16 md:mb-20 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-mono font-medium">
            <Layers className="h-3.5 w-3.5" />
            <span>{t.projects_page_badge}</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-foreground leading-[1.1]">
            {t.projects_page_title}
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl">
            {t.projects_page_subtitle}
          </p>
        </div>

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <div className="text-center py-24 border rounded-2xl border-dashed border-border bg-card/40">
            <p className="text-muted-foreground text-sm">{t.projects_empty}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {projects.map((project) => {
              const title = (language === "en" && project.titleEn) ? project.titleEn : project.title;
              const summary = (language === "en" && project.summaryEn)
                ? project.summaryEn
                : (language === "en" && project.descriptionEn)
                ? project.descriptionEn
                : project.summary;

              return (
                <Card
                  key={project.id}
                  className="catalog-project-card group flex flex-col overflow-hidden border-border bg-card/60 backdrop-blur-sm hover:border-foreground/30 hover:shadow-xl transition-all duration-300"
                >
                  <div>
                    {/* Fixed Media Frame with Hover Physics */}
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted border-b border-border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={project.thumbnailUrl}
                        alt={title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                      />
                      {project.featured && (
                        <div className="absolute top-3.5 right-3.5 z-10">
                          <Badge variant="secondary" className="font-medium text-xs shadow-sm backdrop-blur-md bg-background/90 border border-border/80">
                            {t.projects_featured_badge}
                          </Badge>
                        </div>
                      )}
                    </div>

                    <CardContent className="p-6 md:p-7 space-y-3.5">
                      <Link href={`/proyek/${project.slug}`}>
                        <h2 className="text-xl font-semibold tracking-tight text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {title}
                        </h2>
                      </Link>

                      <p className="text-xs md:text-sm text-muted-foreground leading-relaxed line-clamp-2">
                        {summary}
                      </p>

                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {project.techStack.map((tech) => (
                          <Badge
                            key={tech}
                            variant="outline"
                            className="text-[11px] font-normal py-0.5 px-2 bg-muted/30 text-muted-foreground border-border"
                          >
                            {tech}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </div>

                  <div className="p-6 md:p-7 pt-0 mt-auto border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(project.createdAt).toLocaleDateString(t.date_locale || "id-ID", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <Button asChild variant="ghost" size="sm" className="gap-1.5 p-0 h-auto font-medium text-foreground group-hover:text-primary transition-colors text-xs">
                      <Link href={`/proyek/${project.slug}`}>
                        <span>{t.projects_detail_btn}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
