"use client";

import Link from "next/link";
import { Mail, ArrowUp } from "lucide-react";
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
    <footer className="border-t border-border bg-background text-muted-foreground transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Col 1: Bio / Brand */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-accent" />
              <span className="font-semibold text-foreground tracking-tight text-base">
                Karya<span className="font-light text-muted-foreground">ProfilKu</span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
              {language === "id"
                ? `Personal branding & portofolio profesional karya ${profile.name} — ${profile.headline || "Web Developer & Content Creator"}.`
                : `Personal branding & professional digital portfolio of ${profile.name} — ${profile.headline || "Web Developer & Content Creator"}.`}
            </p>
            <div className="pt-2 flex items-center gap-3">
              {profile.socialLinks?.github && (
                <a
                  href={profile.socialLinks.github}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-md hover:bg-accent/10 hover:text-foreground transition-colors"
                  aria-label="GitHub"
                >
                  <GithubIcon className="h-4 w-4" />
                </a>
              )}
              {profile.socialLinks?.linkedin && (
                <a
                  href={profile.socialLinks.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-md hover:bg-accent/10 hover:text-foreground transition-colors"
                  aria-label="LinkedIn"
                >
                  <LinkedinIcon className="h-4 w-4" />
                </a>
              )}
              {profile.socialLinks?.instagram && (
                <a
                  href={profile.socialLinks.instagram}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-md hover:bg-accent/10 hover:text-foreground transition-colors"
                  aria-label="Instagram"
                >
                  <InstagramIcon className="h-4 w-4" />
                </a>
              )}
              {profile.socialLinks?.twitter && (
                <a
                  href={profile.socialLinks.twitter}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-md hover:bg-accent/10 hover:text-foreground transition-colors"
                  aria-label="Twitter"
                >
                  <TwitterIcon className="h-4 w-4" />
                </a>
              )}
              {profile.email && (
                <a
                  href={`mailto:${profile.email}`}
                  className="p-2 rounded-md hover:bg-accent/10 hover:text-foreground transition-colors"
                  aria-label="Email"
                >
                  <Mail className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>

          {/* Col 2: Navigasi Cepat */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-foreground">
              {t.footer_navigation}
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="hover:text-foreground transition-colors">
                  {t.nav_home}
                </Link>
              </li>
              <li>
                <Link href="/proyek" className="hover:text-foreground transition-colors">
                  {t.nav_projects}
                </Link>
              </li>
              <li>
                <Link href="/#layanan" className="hover:text-foreground transition-colors">
                  {t.nav_services}
                </Link>
              </li>
              <li>
                <Link href="/#produk" className="hover:text-foreground transition-colors">
                  {t.nav_products}
                </Link>
              </li>
              <li>
                <Link href="/#testimoni" className="hover:text-foreground transition-colors">
                  {t.nav_testimonials}
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Legal & Admin */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-foreground">
              {t.footer_legal}
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/admin" className="hover:text-foreground transition-colors inline-flex items-center gap-1">
                  {t.nav_admin_panel}
                </Link>
              </li>
              <li>
                <a
                  href="#top"
                  className="hover:text-foreground transition-colors inline-flex items-center gap-1 pt-2 text-xs"
                >
                  <ArrowUp className="h-3 w-3" />
                  {t.footer_back_to_top}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {currentYear} KaryaProfilKu. {t.footer_rights}</p>
          <p className="text-muted-foreground/80">
            {language === "id" ? "Dibuat dengan Next.js 15 & Tailwind CSS" : "Built with Next.js 15 & Tailwind CSS"}
          </p>
        </div>
      </div>
    </footer>
  );
}
