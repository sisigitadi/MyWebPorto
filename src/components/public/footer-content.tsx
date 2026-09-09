"use client";

import Link from "next/link";
import { Mail, ArrowUp, HardDrive, Terminal } from "lucide-react";
import { ProfileData } from "@/lib/dummy-data";
import { useTranslation } from "@/lib/i18n";

function GithubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

function LinkedinIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function InstagramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function TwitterIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
    </svg>
  );
}

export function FooterContent({ profile }: { profile: ProfileData }) {
  const { t, language } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t-2 border-border bg-card text-foreground transition-colors font-mono">
      {/* OS Status Strip */}
      <div className="bg-muted/70 border-b border-border/80 px-4 py-1.5 flex flex-wrap items-center justify-between text-[11px] text-muted-foreground select-none">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-primary font-bold">
            <HardDrive className="h-3 w-3" />
            <span>SIGIT_OS v3.2.0</span>
          </span>
          <span className="hidden sm:inline text-muted-foreground/60">|</span>
          <span className="hidden sm:inline">RAM: 64MB OK</span>
          <span className="hidden sm:inline text-muted-foreground/60">|</span>
          <span className="hidden sm:inline">VRAM: 8MB PCI</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-emerald-500 font-bold">KERNEL: ACTIVE</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 md:py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Col 1: Bio / Brand */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-none bg-primary animate-pulse" />
              <span className="font-pixel text-sm sm:text-base tracking-wider text-foreground">
                SIGIT<span className="text-primary">.DEV</span>
              </span>
            </div>
            <p className="text-xs text-muted-foreground max-w-sm leading-relaxed font-mono">
              {language === "id"
                ? `Personal branding & portofolio digital karya ${profile.name || "Sigit"} — ${profile.headline || "Web Developer & Systems Architect"}. Dibangun dengan standar performa dan keindahan estetika retro 90s.`
                : `Personal branding & digital portfolio of ${profile.name || "Sigit"} — ${profile.headline || "Web Developer & Systems Architect"}. Crafted with speed and retro 90s desktop aesthetics.`}
            </p>
            <div className="pt-2 flex items-center gap-2">
              {profile.socialLinks?.github && (
                <a
                  href={profile.socialLinks.github}
                  target="_blank"
                  rel="noreferrer"
                  className="vt-btn p-1.5 text-foreground hover:text-primary transition-colors"
                  aria-label="GitHub"
                >
                  <GithubIcon className="h-3.5 w-3.5" />
                </a>
              )}
              {profile.socialLinks?.linkedin && (
                <a
                  href={profile.socialLinks.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  className="vt-btn p-1.5 text-foreground hover:text-primary transition-colors"
                  aria-label="LinkedIn"
                >
                  <LinkedinIcon className="h-3.5 w-3.5" />
                </a>
              )}
              {profile.socialLinks?.instagram && (
                <a
                  href={profile.socialLinks.instagram}
                  target="_blank"
                  rel="noreferrer"
                  className="vt-btn p-1.5 text-foreground hover:text-primary transition-colors"
                  aria-label="Instagram"
                >
                  <InstagramIcon className="h-3.5 w-3.5" />
                </a>
              )}
              {profile.socialLinks?.twitter && (
                <a
                  href={profile.socialLinks.twitter}
                  target="_blank"
                  rel="noreferrer"
                  className="vt-btn p-1.5 text-foreground hover:text-primary transition-colors"
                  aria-label="Twitter"
                >
                  <TwitterIcon className="h-3.5 w-3.5" />
                </a>
              )}
              {profile.email && (
                <a
                  href={`mailto:${profile.email}`}
                  className="vt-btn p-1.5 text-foreground hover:text-primary transition-colors"
                  aria-label="Email"
                >
                  <Mail className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>

          {/* Col 2: Navigasi Cepat */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary font-mono">
              {"//"} {t.footer_navigation}
            </h4>
            <ul className="space-y-1.5 text-xs font-mono">
              <li>
                <Link href="/" className="text-muted-foreground hover:text-primary transition-colors">
                  &gt; {t.nav_home}
                </Link>
              </li>
              <li>
                <Link href="/proyek" className="text-muted-foreground hover:text-primary transition-colors">
                  &gt; {t.nav_projects}
                </Link>
              </li>
              <li>
                <Link href="/#layanan" className="text-muted-foreground hover:text-primary transition-colors">
                  &gt; {t.nav_services}
                </Link>
              </li>
              <li>
                <Link href="/#produk" className="text-muted-foreground hover:text-primary transition-colors">
                  &gt; {t.nav_products}
                </Link>
              </li>
              <li>
                <Link href="/#testimoni" className="text-muted-foreground hover:text-primary transition-colors">
                  &gt; {t.nav_testimonials}
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: System & Admin */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary font-mono">
              {"//"} {t.footer_legal}
            </h4>
            <ul className="space-y-1.5 text-xs font-mono">
              <li>
                <Link href="/admin" className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1">
                  <Terminal className="h-3 w-3 text-emerald-500" />
                  <span>{t.nav_admin_panel}</span>
                </Link>
              </li>
              <li>
                <a
                  href="#top"
                  className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1 pt-2 text-xs"
                >
                  <ArrowUp className="h-3 w-3" />
                  <span>{t.footer_back_to_top}</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-border/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-mono text-muted-foreground">
          <p>© {currentYear} Sigit. {t.footer_rights}</p>
          <p className="text-muted-foreground">
            {language === "id" ? "SigitOS Retro Engine • Next.js 15 & Tailwind" : "SigitOS Retro Engine • Next.js 15 & Tailwind"}
          </p>
        </div>
      </div>
    </footer>
  );
}
