"use client";

import { useRef } from "react";
import Image from "next/image";
import { Star, Quote } from "lucide-react";
import { Card } from "@/components/ui/card";
import { TestimonialData } from "@/lib/dummy-data";
import { useTranslation } from "@/lib/i18n";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface TestimonialsSectionProps {
  testimonials: TestimonialData[];
}

export function TestimonialsSection({ testimonials: propTestimonials }: TestimonialsSectionProps) {
  const { t, language } = useTranslation();
  const containerRef = useRef<HTMLElement>(null);
  const testimonials = propTestimonials.filter((t) => t.published);

  useGSAP(
    () => {
      
    },
    { scope: containerRef }
  );

  return (
    <section
      ref={containerRef}
      id="testimoni"
      className="py-24 md:py-36 border-b border-border/60 scroll-mt-16 bg-muted/20"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="max-w-3xl mb-16 space-y-3">
          <span className="text-xs uppercase tracking-[0.2em] font-semibold text-primary block">
            {t.testi_eyebrow}
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-foreground">
            {t.testi_title}
          </h2>
          <p className="text-sm md:text-base text-muted-foreground">
            {t.testi_subtitle}
          </p>
        </div>

        {/* Bento Testimonials Grid (12-col dense) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 grid-flow-dense">
          {testimonials.map((testi, idx) => {
            let colSpan = "md:col-span-6";
            if (testimonials.length === 1) {
              colSpan = "md:col-span-12";
            } else if (testimonials.length === 2) {
              colSpan = idx === 0 ? "md:col-span-7" : "md:col-span-5";
            } else if (testimonials.length === 3) {
              colSpan = "md:col-span-4";
            } else {
              colSpan = idx % 2 === 0 ? "md:col-span-7" : "md:col-span-5";
            }

            const content = (language === "en" && testi.contentEn) ? testi.contentEn : testi.content;
            const clientRole = (language === "en" && testi.clientRoleEn) ? testi.clientRoleEn : testi.clientRole;

            return (
              <Card
                key={testi.id}
                className={`bento-testimonial-card ${colSpan} p-8 md:p-10 relative flex flex-col justify-between border-border bg-card/70 backdrop-blur-sm hover:border-foreground/30 hover:shadow-lg transition-all duration-300 group`}
              >
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    {/* Rating stars */}
                    <div className="flex items-center gap-1 text-amber-500">
                      {Array.from({ length: testi.rating || 5 }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-amber-500 text-amber-500" />
                      ))}
                    </div>
                    <Quote className="h-6 w-6 text-muted-foreground/30 group-hover:text-primary/40 transition-colors" />
                  </div>

                  {/* Quote content */}
                  <p className="text-base md:text-lg text-foreground/90 font-serif italic leading-relaxed">
                    &ldquo;{content}&rdquo;
                  </p>
                </div>

                {/* Author Info */}
                <div className="pt-8 mt-8 border-t border-border/50 flex items-center gap-4">
                  {testi.avatarUrl ? (
                    <div className="relative h-12 w-12 rounded-full overflow-hidden border border-border bg-muted shrink-0 shadow-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={testi.avatarUrl}
                        alt={testi.clientName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-semibold text-sm text-primary shrink-0 shadow-sm">
                      {testi.clientName.charAt(0)}
                    </div>
                  )}

                  <div>
                    <h4 className="text-sm font-semibold text-foreground leading-snug">
                      {testi.clientName}
                    </h4>
                    <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                      {clientRole}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
