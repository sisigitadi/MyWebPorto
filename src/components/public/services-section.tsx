"use client";

import React, { useRef } from "react";
import { ArrowRight, Mail } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ServiceData, ProfileData } from "@/lib/dummy-data";
import { useTranslation } from "@/lib/i18n";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

interface ServicesSectionProps {
  services: ServiceData[];
  profile: ProfileData;
}

export function ServicesSection({ services: propServices, profile }: ServicesSectionProps) {
  const { t, language } = useTranslation();
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const services = propServices.filter((s) => s.published);

  useGSAP(
    () => {
      // Header Animation
      gsap.from(".services-eyebrow", {
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 82%",
        },
        opacity: 0,
        y: 15,
        duration: 0.6,
        ease: "power3.out",
      });

      gsap.from(".services-title", {
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

      gsap.from(".services-subtitle", {
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 78%",
        },
        opacity: 0,
        y: 20,
        duration: 0.8,
        delay: 0.1,
        ease: "power3.out",
      });

      // Bento Cards Stagger with subtle rotational personality
      const cards = gsap.utils.toArray<HTMLElement>(".bento-service-card");
      cards.forEach((card, i) => {
        gsap.from(card, {
          scrollTrigger: {
            trigger: card,
            start: "top 88%",
          },
          opacity: 0,
          y: 40,
          rotation: i % 2 === 0 ? -1.2 : 1.2,
          scale: 0.96,
          duration: 0.8,
          delay: (i % 3) * 0.1,
          ease: "back.out(1.35)",
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
      id="layanan"
      className="relative py-24 md:py-36 border-b border-border/60 scroll-mt-16 overflow-hidden"
    >
      {/* Subtle Background Glow */}
      <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-primary/4 rounded-full blur-[110px] pointer-events-none -z-10 animate-float-slow" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div ref={headerRef} className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div className="space-y-3 max-w-xl">
            <span className="services-eyebrow text-xs uppercase tracking-[0.25em] font-semibold text-primary inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              {t.services_eyebrow}
            </span>
            <h2 className="services-title text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-foreground leading-[1.1]">
              {t.services_title}
            </h2>
          </div>
          <p className="services-subtitle text-sm md:text-base text-muted-foreground max-w-md leading-relaxed">
            {t.services_subtitle}
          </p>
        </div>

        {/* Gapless Mathematically Perfect 12-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 grid-flow-dense">
          {services.map((service, index) => {
            const title = (language === "en" && service.titleEn) ? service.titleEn : service.title;
            const description = (language === "en" && service.descriptionEn) ? service.descriptionEn : service.description;

            const subjectText =
              language === "id"
                ? `Halo ${profile.name.split(" ")[0]}, saya tertarik dengan layanan ${title}`
                : `Hello ${profile.name.split(" ")[0]}, I am interested in ${title} services`;

            const encodedSubject = encodeURIComponent(subjectText);
            const mailtoUrl = `mailto:${profile.email}?subject=${encodedSubject}`;

            const isFirst = index === 0;
            const colSpan =
              services.length === 3
                ? isFirst
                  ? "md:col-span-12 lg:col-span-6"
                  : "md:col-span-6 lg:col-span-3"
                : "md:col-span-6 lg:col-span-4";

            return (
              <Card
                key={service.id}
                onMouseMove={handleCardMouseMove}
                className={`bento-service-card spotlight-card group relative flex flex-col justify-between border-border bg-card/80 backdrop-blur-xs hover:border-foreground/35 transition-all duration-300 ${colSpan}`}
              >
                <div>
                  <CardHeader className="p-6 md:p-8">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-2 w-2 rounded-full bg-primary/40 group-hover:bg-primary group-hover:scale-125 transition-all" />
                      <span className="text-[11px] font-mono uppercase text-muted-foreground tracking-wider opacity-60 group-hover:opacity-100 transition-opacity">
                        0{index + 1}
                      </span>
                    </div>
                    <CardTitle className="text-xl md:text-2xl font-semibold tracking-tight text-foreground leading-snug group-hover:text-primary transition-colors">
                      {title}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="p-6 md:p-8 pt-0">
                    <CardDescription className="text-sm md:text-base leading-relaxed text-muted-foreground font-normal">
                      {description}
                    </CardDescription>
                  </CardContent>
                </div>

                <CardFooter className="p-6 md:p-8 pt-4 border-t border-border/40">
                  <Button asChild variant="ghost" size="sm" className="w-full justify-between group-hover:text-primary transition-colors p-0 h-auto text-xs font-medium">
                    <a href={mailtoUrl}>
                      <span className="inline-flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 group-hover:rotate-6 transition-transform" />
                        {t.services_cta}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1.5 transition-transform duration-300" />
                    </a>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
