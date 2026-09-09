"use client";

import { useRef } from "react";
import { Mail, MapPin, Send, ExternalLink } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ProfileData } from "@/lib/dummy-data";
import { useTranslation } from "@/lib/i18n";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface ContactSectionProps {
  profile: ProfileData;
}

export function ContactSection({ profile }: ContactSectionProps) {
  const { t, language } = useTranslation();
  const containerRef = useRef<HTMLElement>(null);
  const leftColRef = useRef<HTMLDivElement>(null);
  const rightColRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.from(leftColRef.current, {
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 80%",
        },
        x: -40,
        opacity: 0,
        filter: "blur(6px)",
        duration: 0.9,
        ease: "power4.out",
      });

      gsap.from(rightColRef.current, {
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 80%",
        },
        x: 40,
        opacity: 0,
        filter: "blur(6px)",
        duration: 0.9,
        delay: 0.12,
        ease: "power4.out",
      });
    },
    { scope: containerRef }
  );

  const gmailDirectUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
    profile.email
  )}`;

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
      id="kontak"
      className="py-24 md:py-36 scroll-mt-16 relative overflow-hidden"
    >
      {/* Ambient background glow */}
      <div className="absolute bottom-10 left-1/4 w-[500px] h-[300px] bg-primary/4 rounded-full blur-[110px] pointer-events-none -z-10 animate-float-slow" />
      <div className="absolute top-20 right-10 w-[450px] h-[300px] bg-accent/6 rounded-full blur-[120px] pointer-events-none -z-10 animate-float-reverse" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Col 1: Direct Contact Info */}
          <div ref={leftColRef} className="lg:col-span-5 space-y-6">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {t.contact_eyebrow}
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-foreground">
                {t.contact_title}
              </h2>
            </div>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
              {t.contact_subtitle}
            </p>

            <div className="space-y-4 pt-2">
              <div
                onMouseMove={handleCardMouseMove}
                className="spotlight-card group flex items-center gap-4 text-sm text-foreground p-4 rounded-xl border border-border bg-card/60 backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:-translate-y-0.5 shadow-sm hover:shadow-md cursor-pointer"
              >
                <div className="p-3 rounded-lg border border-border bg-muted/40 shrink-0 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <Mail className="h-4 w-4 text-primary transition-transform duration-300 group-hover:scale-110" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-muted-foreground">{t.contact_email_label}</div>
                  <a
                    href={gmailDirectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium hover:underline text-foreground flex items-center gap-1.5 truncate"
                  >
                    <span className="truncate">{profile.email}</span>
                    <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </a>
                </div>
              </div>

              {profile.location && (
                <div
                  onMouseMove={handleCardMouseMove}
                  className="spotlight-card group flex items-center gap-4 text-sm text-foreground p-4 rounded-xl border border-border bg-card/60 backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:-translate-y-0.5 shadow-sm hover:shadow-md"
                >
                  <div className="p-3 rounded-lg border border-border bg-muted/40 shrink-0 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <MapPin className="h-4 w-4 text-primary transition-transform duration-300 group-hover:scale-110" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{t.contact_location_label}</div>
                    <div className="font-medium">{profile.location}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Col 2: Interactive Contact Form Preview */}
          <div ref={rightColRef} className="lg:col-span-7">
            <Card
              onMouseMove={handleCardMouseMove}
              className="spotlight-card border-border bg-card/70 backdrop-blur-sm shadow-xl overflow-hidden transition-all duration-300 hover:border-primary/30"
            >
              <CardHeader className="p-6 md:p-8 border-b border-border/40">
                <CardTitle className="text-xl font-semibold tracking-tight text-foreground">
                  {t.contact_form_title}
                </CardTitle>
                <CardDescription className="text-xs md:text-sm text-muted-foreground">
                  {language === "id"
                    ? `Formulir ini akan mengarahkan pesan langsung ke inbox email ${profile.name}.`
                    : `This form will direct your message straight to ${profile.name}'s email inbox.`}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 md:p-8">
                <form
                  action={`mailto:${profile.email}`}
                  method="GET"
                  className="space-y-5"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sender-name" className="text-xs font-medium">{t.contact_name_label}</Label>
                      <Input
                        id="sender-name"
                        name="name"
                        placeholder={t.contact_name_placeholder}
                        required
                        className="bg-background/80 transition-colors focus-visible:ring-primary/40"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sender-subject" className="text-xs font-medium">{t.contact_subject_label}</Label>
                      <Input
                        id="sender-subject"
                        name="subject"
                        placeholder={t.contact_subject_placeholder}
                        required
                        className="bg-background/80 transition-colors focus-visible:ring-primary/40"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sender-body" className="text-xs font-medium">{t.contact_message_label}</Label>
                    <Textarea
                      id="sender-body"
                      name="body"
                      placeholder={t.contact_message_placeholder}
                      rows={5}
                      required
                      className="bg-background/80 transition-colors focus-visible:ring-primary/40"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <Button type="submit" className="relative group overflow-hidden flex-1 gap-2 font-medium h-11 text-xs transition-all duration-300 hover:shadow-lg hover:shadow-primary/20">
                      <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
                      <Send className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
                      <span>{t.contact_send_btn}</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      asChild
                      className="gap-2 font-medium h-11 text-xs border-border bg-card hover:bg-muted/40 transition-all duration-300 hover:scale-[1.02] hover:border-primary/40"
                    >
                      <a href={gmailDirectUrl} target="_blank" rel="noopener noreferrer">
                        <Mail className="h-4 w-4 text-red-500 transition-transform group-hover:scale-110" />
                        <span>{language === "id" ? "Buka di Gmail" : "Open in Gmail"}</span>
                      </a>
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
