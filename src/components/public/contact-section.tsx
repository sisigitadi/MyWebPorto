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
        x: -30,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
      });

      gsap.from(rightColRef.current, {
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 80%",
        },
        x: 30,
        opacity: 0,
        duration: 0.8,
        delay: 0.1,
        ease: "power3.out",
      });
    },
    { scope: containerRef }
  );

  const gmailDirectUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
    profile.email
  )}`;

  return (
    <section
      ref={containerRef}
      id="kontak"
      className="py-24 md:py-36 scroll-mt-16 relative overflow-hidden"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Col 1: Contact details */}
          <div ref={leftColRef} className="lg:col-span-5 space-y-8">
            <div className="space-y-3">
              <span className="text-xs uppercase tracking-[0.2em] font-semibold text-primary block">
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
              <div className="flex items-center gap-4 text-sm text-foreground p-4 rounded-xl border border-border bg-card/50 backdrop-blur-sm">
                <div className="p-3 rounded-lg border border-border bg-muted/40 shrink-0">
                  <Mail className="h-4 w-4 text-primary" />
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
                    <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                  </a>
                </div>
              </div>

              {profile.location && (
                <div className="flex items-center gap-4 text-sm text-foreground p-4 rounded-xl border border-border bg-card/50 backdrop-blur-sm">
                  <div className="p-3 rounded-lg border border-border bg-muted/40 shrink-0">
                    <MapPin className="h-4 w-4 text-primary" />
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
            <Card className="border-border bg-card/70 backdrop-blur-sm shadow-xl overflow-hidden">
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
                        className="bg-background/80"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sender-subject" className="text-xs font-medium">{t.contact_subject_label}</Label>
                      <Input
                        id="sender-subject"
                        name="subject"
                        placeholder={t.contact_subject_placeholder}
                        required
                        className="bg-background/80"
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
                      className="bg-background/80"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <Button type="submit" className="flex-1 gap-2 font-medium h-11 text-xs">
                      <Send className="h-4 w-4" />
                      <span>{t.contact_send_btn}</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      asChild
                      className="gap-2 font-medium h-11 text-xs border-border bg-card hover:bg-muted/40"
                    >
                      <a href={gmailDirectUrl} target="_blank" rel="noopener noreferrer">
                        <Mail className="h-4 w-4 text-red-500" />
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
