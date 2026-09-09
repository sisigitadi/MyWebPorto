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
  const services = propServices.filter((s) => s.published);

  useGSAP(
    () => {
      gsap.from(".bento-service-card", {
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 80%",
        },
        opacity: 0,
        y: 35,
        stagger: 0.12,
        duration: 0.75,
        ease: "power3.out",
      });
    },
    { scope: sectionRef }
  );

  return (
    <section
      ref={sectionRef}
      id="layanan"
      className="py-24 md:py-36 border-b border-border/60 scroll-mt-16 overflow-hidden"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div className="space-y-3 max-w-xl">
            <span className="text-xs uppercase tracking-[0.25em] font-semibold text-primary block">
              {t.services_eyebrow}
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-foreground leading-[1.1]">
              {t.services_title}
            </h2>
          </div>
          <p className="text-sm md:text-base text-muted-foreground max-w-md leading-relaxed">
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
                className={`bento-service-card group relative flex flex-col justify-between border-border bg-card hover:border-foreground/30 transition-all duration-300 ${colSpan}`}
              >
                <div>
                  <CardHeader className="p-6 md:p-8">
                    <div className="h-2 w-2 rounded-full bg-primary/40 group-hover:bg-primary transition-colors mb-4" />
                    <CardTitle className="text-xl md:text-2xl font-semibold tracking-tight text-foreground leading-snug">
                      {title}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="p-6 md:p-8 pt-0">
                    <CardDescription className="text-sm md:text-base leading-relaxed text-muted-foreground">
                      {description}
                    </CardDescription>
                  </CardContent>
                </div>

                <CardFooter className="p-6 md:p-8 pt-4 border-t border-border/40">
                  <Button asChild variant="ghost" size="sm" className="w-full justify-between group-hover:text-primary transition-colors p-0 h-auto text-xs font-medium">
                    <a href={mailtoUrl}>
                      <span className="inline-flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5" />
                        {t.services_cta}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
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
