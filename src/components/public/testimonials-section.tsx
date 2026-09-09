"use client";

import { useRef } from "react";
import { Star, Quote } from "lucide-react";
import { Card } from "@/components/ui/card";
import { TestimonialData, DUMMY_TESTIMONIALS } from "@/lib/dummy-data";
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
  const rawTestimonials =
    propTestimonials && Array.isArray(propTestimonials) && propTestimonials.length > 0
      ? propTestimonials
      : DUMMY_TESTIMONIALS;
  const published = rawTestimonials.filter((t) => t.published !== false);
  const testimonials = published.length > 0 ? published : DUMMY_TESTIMONIALS;

  useGSAP(
    () => {
      // Header Animation
      gsap.from(".testi-eyebrow", {
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 85%",
          toggleActions: "play none none none",
        },
        opacity: 0,
        y: 15,
        duration: 0.6,
        ease: "power3.out",
        clearProps: "all",
      });

      gsap.from(".testi-title", {
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 82%",
          toggleActions: "play none none none",
        },
        opacity: 0,
        y: 30,
        filter: "blur(6px)",
        duration: 0.9,
        ease: "power4.out",
        clearProps: "all",
      });

      gsap.from(".testi-subtitle", {
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 80%",
          toggleActions: "play none none none",
        },
        opacity: 0,
        y: 20,
        duration: 0.8,
        delay: 0.1,
        ease: "power3.out",
        clearProps: "all",
      });

      // Bento Testimonials Cards Stagger
      gsap.from(".bento-testimonial-card", {
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 78%",
          toggleActions: "play none none none",
        },
        opacity: 0,
        y: 45,
        scale: 0.95,
        stagger: 0.12,
        duration: 0.85,
        ease: "back.out(1.3)",
        clearProps: "all",
      });
    },
    { scope: containerRef }
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
      ref={containerRef}
      id="testimoni"
      className="relative py-24 md:py-36 border-b border-border/60 scroll-mt-16 bg-muted/15 overflow-hidden"
    >
      {/* Background Glow */}
      <div className="absolute top-1/3 left-1/4 w-[520px] h-[320px] bg-primary/4 rounded-full blur-[110px] pointer-events-none -z-10 animate-float-slow" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="max-w-3xl mb-16 space-y-3">
          <span className="testi-eyebrow text-xs uppercase tracking-[0.2em] font-semibold text-primary inline-flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {t.testi_eyebrow}
          </span>
          <h2 className="testi-title text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-foreground">
            {t.testi_title}
          </h2>
          <p className="testi-subtitle text-sm md:text-base text-muted-foreground leading-relaxed">
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
                onMouseMove={handleCardMouseMove}
                className={`bento-testimonial-card spotlight-card ${colSpan} p-8 md:p-10 relative flex flex-col justify-between border-border bg-card/85 backdrop-blur-xs hover:border-foreground/35 transition-all duration-300 group`}
              >
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    {/* Rating stars */}
                    <div className="flex items-center gap-1 text-amber-500">
                      {Array.from({ length: testi.rating || 5 }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-amber-500 text-amber-500 transition-transform duration-200 group-hover:scale-110" />
                      ))}
                    </div>
                    <Quote className="h-6 w-6 text-muted-foreground/30 group-hover:text-primary/70 group-hover:rotate-12 group-hover:scale-115 transition-all duration-300" />
                  </div>

                  {/* Quote content */}
                  <p className="text-base md:text-lg text-foreground/90 font-serif italic leading-relaxed">
                    &ldquo;{content}&rdquo;
                  </p>
                </div>

                {/* Author Info */}
                <div className="pt-8 mt-8 border-t border-border/50 flex items-center gap-4">
                  {testi.avatarUrl ? (
                    <div className="relative h-12 w-12 rounded-full overflow-hidden border border-border bg-muted shrink-0 shadow-sm group-hover:border-primary/50 transition-colors">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={testi.avatarUrl}
                        alt={testi.clientName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-semibold text-sm text-primary shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                      {testi.clientName.charAt(0)}
                    </div>
                  )}

                  <div>
                    <h4 className="text-sm font-semibold text-foreground leading-snug group-hover:text-primary transition-colors">
                      {testi.clientName}
                    </h4>
                    <p className="text-xs text-muted-foreground leading-tight mt-0.5 font-normal">
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
