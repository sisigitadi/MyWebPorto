"use client";

import Link from "next/link";
import { Mail, ArrowUp, HardDrive, Terminal } from "lucide-react";
import { ProfileData } from "@/lib/dummy-data";
import { useTranslation } from "@/lib/i18n";
import { buildSocialLinks } from "@/components/public/social-icons";

export function FooterContent({ profile }: { profile: ProfileData }) {
  const { t, language } = useTranslation();
  const currentYear = new Date().getFullYear();
  const socialLinks = buildSocialLinks(profile);

  return (
    <footer className="border-t-2 border-border bg-card text-foreground transition-colors font-mono">
      {/* OS Status Strip */}
      <div className="bg-muted/70 border-b border-border/80 px-4 py-1.5 flex flex-wrap items-center justify-between text-xs text-[var(--vt-ink)] font-bold select-none">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-primary font-bold">
            <HardDrive className="h-3.5 w-3.5" />
            <span>SIGIT_OS v3.2.0</span>
          </span>
          <span className="hidden sm:inline opacity-60">|</span>
          <span className="hidden sm:inline">RAM: 64MB OK</span>
          <span className="hidden sm:inline opacity-60">|</span>
          <span className="hidden sm:inline">VRAM: 8MB PCI</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-emerald-700 dark:text-emerald-400 font-bold">KERNEL: ACTIVE</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 md:py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Col 1: Bio / Brand */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-none bg-primary animate-pulse" />
              <span className="font-pixel text-sm sm:text-base tracking-wider text-foreground font-bold">
                SIGIT<span className="text-primary">.DEV</span>
              </span>
            </div>
            <p className="text-xs text-[var(--vt-ink)] font-medium max-w-sm leading-relaxed font-mono">
              {language === "id"
                ? `Personal branding & portofolio digital karya ${profile.name || "Sigit"} — ${profile.headline || "Web Developer & Systems Architect"}. Dibangun dengan standar performa dan keindahan estetika retro 90s.`
                : `Personal branding & digital portfolio of ${profile.name || "Sigit"} — ${profile.headline || "Web Developer & Systems Architect"}. Crafted with speed and retro 90s desktop aesthetics.`}
            </p>
            <div className="pt-2 flex items-center gap-2 flex-wrap">
              {socialLinks.map((link) => (
                <a
                  key={link.key}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="vt-btn p-1.5 text-foreground hover:text-primary transition-colors"
                  aria-label={link.label}
                  title={link.label}
                >
                  {link.icon}
                </a>
              ))}
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
            <ul className="space-y-1.5 text-xs font-mono font-medium">
              <li>
                <Link href="/" className="text-[var(--vt-ink)] hover:text-primary transition-colors">
                  &gt; {t.nav_home}
                </Link>
              </li>
              <li>
                <Link href="/proyek" className="text-[var(--vt-ink)] hover:text-primary transition-colors">
                  &gt; {t.nav_projects}
                </Link>
              </li>
              <li>
                <Link href="/#layanan" className="text-[var(--vt-ink)] hover:text-primary transition-colors">
                  &gt; {t.nav_services}
                </Link>
              </li>
              <li>
                <Link href="/#produk" className="text-[var(--vt-ink)] hover:text-primary transition-colors">
                  &gt; {t.nav_products}
                </Link>
              </li>
              <li>
                <Link href="/#testimoni" className="text-[var(--vt-ink)] hover:text-primary transition-colors">
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
            <ul className="space-y-1.5 text-xs font-mono font-medium">
              <li>
                <Link href="/admin" className="text-[var(--vt-ink)] hover:text-primary transition-colors inline-flex items-center gap-1 font-bold">
                  <Terminal className="h-3.5 w-3.5 text-emerald-500" />
                  <span>{t.nav_admin_panel}</span>
                </Link>
              </li>
              <li>
                <a
                  href="#top"
                  className="text-[var(--vt-ink)] hover:text-primary transition-colors inline-flex items-center gap-1 pt-2 text-xs font-bold"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                  <span>{t.footer_back_to_top}</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-border/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono font-bold text-[var(--vt-ink)]">
          <p>© {currentYear} Sigit. {t.footer_rights}</p>
          <p className="text-[var(--vt-ink)] opacity-85">
            {language === "id" ? "SigitOS Retro Engine • Next.js 15 & Tailwind" : "SigitOS Retro Engine • Next.js 15 & Tailwind"}
          </p>
        </div>
      </div>
    </footer>
  );
}
