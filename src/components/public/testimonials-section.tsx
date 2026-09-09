"use client";

import React, { useRef } from "react";
import { Star, MessageSquareQuote } from "lucide-react";
import { TestimonialData, DUMMY_TESTIMONIALS } from "@/lib/dummy-data";
import { useTranslation } from "@/lib/i18n";
import { OSWindow } from "@/components/public/os/os-window";
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
      gsap.from(".sigit-testi-card", {
        scrollTrigger: {
          trigger: containerRef.current,
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
    { scope: containerRef }
  );

  return (
    <section
      ref={containerRef}
      id="testimoni"
      className="relative py-12 md:py-20 scroll-mt-14"
    >
      <div className="max-w-7xl mx-auto px-2 sm:px-4">
        {/* Section Heading */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2 font-pixel text-xs text-[var(--vt-blue)]">
            <span className="h-2 w-2 rounded-full bg-[var(--vt-blue)] animate-pulse" />
            <span>CLIENT_LOGS // ULASAN & TESTIMONI MITRA</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-display tracking-tight text-[var(--vt-ink)]">
            {t.testi_title}
          </h2>
          <p className="text-xs sm:text-sm font-mono text-[var(--vt-ink-soft)] mt-1 max-w-2xl">
            {t.testi_subtitle}
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {testimonials.map((testi, index) => {
            const role = (language === "en" && testi.clientRoleEn) ? testi.clientRoleEn : testi.clientRole;
            const content = (language === "en" && testi.contentEn) ? testi.contentEn : testi.content;

            return (
              <div key={testi.id} className="sigit-testi-card flex flex-col h-full">
                <OSWindow
                  title={`Feedback_Log_0${index + 1}.txt`}
                  icon={<MessageSquareQuote className="h-3 w-3 text-[#ffd400]" />}
                  statusText={`Verified Client Rating: ${testi.rating}/5.0`}
                  className="h-full flex-1"
                  bodyClassName="flex flex-col justify-between h-full space-y-4"
                >
                  {/* Rating Stars */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[#ffd400]">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < testi.rating ? "fill-[#ffd400]" : "text-muted opacity-30"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="font-pixel text-[10px] bg-[var(--vt-blue)] text-white px-2 py-0.5">
                      VERIFIED 100%
                    </span>
                  </div>

                  {/* Testimonial Quote in Sunken Box */}
                  <div className="vt-card-inset p-3 bg-card text-[var(--vt-ink)] font-mono text-xs sm:text-sm leading-relaxed italic border-l-4 border-l-[var(--vt-pink)]">
                    &ldquo;{content}&rdquo;
                  </div>

                  {/* Client Info */}
                  <div className="flex items-center gap-3 pt-2 border-t border-border/80">
                    <div className="w-10 h-10 rounded-xs vt-raised p-0.5 shrink-0 bg-[var(--vt-chrome)] overflow-hidden">
                      {testi.avatarUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={testi.avatarUrl}
                          alt={testi.clientName}
                          className="w-full h-full object-cover rounded-xs"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-mono font-bold text-xs bg-[var(--vt-blue)] text-white">
                          {testi.clientName.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-bold text-[var(--vt-ink)] truncate">
                        {testi.clientName}
                      </p>
                      <p className="font-mono text-[10px] text-[var(--vt-ink-soft)] truncate">
                        {role}
                      </p>
                    </div>
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
