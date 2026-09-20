"use client";

import React, { useEffect, useSyncExternalStore, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Share2,
  Check,
  Tag,
  Mail,
  FileText,
  HardDrive,
  Monitor,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { OSWindow } from "@/components/public/os/os-window";
import { FormattedText } from "@/components/public/formatted-text";
import { ArticleData, ProfileData } from "@/lib/dummy-data";
import { buildContactPrefillUrl } from "@/lib/contact-link";
import { toast } from "sonner";

interface ArticleDetailContentProps {
  article: ArticleData;
  profile: ProfileData;
  relatedArticles?: ArticleData[];
}

export function ArticleDetailContent({
  article,
  profile,
  relatedArticles = [],
}: ArticleDetailContentProps) {
  const { t, language } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [readProgress, setReadProgress] = useState(0);

  // URL halaman dibaca dari external store (window.location). Server snapshot ""
  // menjaga SSR & hydration konsisten (server tidak tahu URL klien) — cakupan
  // sama dengan effect lama, tanpa setState di body effect.
  const pageUrl = useSyncExternalStore(
    (onChange) => {
      window.addEventListener("popstate", onChange);
      return () => window.removeEventListener("popstate", onChange);
    },
    () => window.location.href,
    () => "",
  );

  // Progress baca: dengar scroll pada ancestor scrollable (jendela OS) + fallback window.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = containerRef.current;
    if (!root) return;
    const scroller =
      (root.closest(".vt-scrollbar") as HTMLElement | null) ||
      (root.closest("[class*='overflow-y-auto']") as HTMLElement | null);

    const update = () => {
      if (scroller) {
        const max = scroller.scrollHeight - scroller.clientHeight;
        setReadProgress(max > 0 ? Math.min(100, Math.round((scroller.scrollTop / max) * 100)) : 0);
      } else {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setReadProgress(max > 0 ? Math.min(100, Math.round((window.scrollY / max) * 100)) : 0);
      }
    };
    // Sinkronisasi posisi scroll awal dari external system (ancestor scrollable
    // baru bisa diresolve setelah mount). Listener di bawah sudah benar (setState
    // di event callback); migrasi penuh ke useSyncExternalStore butuh cara
    // menresolve scroller yang stabil saat render — utang terpisah.
    update();
    scroller?.addEventListener("scroll", update, { passive: true });
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      scroller?.removeEventListener("scroll", update);
      window.removeEventListener("scroll", update);
    };
  }, []);

  const isEn = language === "en";
  const title = isEn && article.titleEn ? article.titleEn : article.title;
  const summary = isEn && article.summaryEn ? article.summaryEn : article.summary;
  const content = isEn && article.contentEn ? article.contentEn : article.content;

  // Calculate approximate read time (200 words per minute)
  const wordCount = (content || "").trim().split(/\s+/).filter(Boolean).length;
  const readMinutes = Math.max(1, Math.ceil(wordCount / 200));

  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(".article-detail-section", {
        y: 20,
        opacity: 0,
        filter: "blur(4px)",
        duration: 0.6,
        stagger: 0.1,
      });
    },
    { scope: containerRef }
  );

  const handleShare = async () => {
    if (typeof window !== "undefined") {
      try {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(window.location.href);
          setCopied(true);
          toast.success(t.article_detail_copied || "Tautan berhasil disalin!");
          setTimeout(() => setCopied(false), 2500);
        }
      } catch (err) {
        console.error("Failed to copy url:", err);
      }
    }
  };

  const discussionSubject = isEn ? `Article Discussion: ${title}` : `Diskusi Artikel: ${title}`;
  const discussionBody = isEn
    ? `Hello ${profile.name || "Sigit"},\n\nI just read your article "${title}" and would love to share thoughts/inquire about it.`
    : `Halo ${profile.name || "Sigit"},\n\nSaya baru saja membaca artikel "${title}" dan tertarik untuk berdiskusi/bertanya lebih lanjut.`;
  const contactDiscussionUrl = buildContactPrefillUrl({
    subject: discussionSubject,
    body: discussionBody,
  });

  return (
    <div ref={containerRef} className="py-8 md:py-14 w-full vt-crt-on">
      <div className="max-w-4xl mx-auto px-3 sm:px-6 space-y-6">
        {/* Navigation Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              asChild
              size="sm"
              className="vt-btn vt-btn-chrome h-8 px-3 font-mono text-xs font-bold gap-1.5 cursor-pointer"
            >
              <Link href="/">
                <Monitor className="h-3.5 w-3.5 text-primary" />
                <span className="hidden sm:inline">{t.article_detail_back_desktop}</span>
                <span className="sm:hidden">Desktop</span>
              </Link>
            </Button>

            <Button
              asChild
              size="sm"
              className="vt-btn vt-btn-chrome h-8 px-3 font-mono text-xs font-bold gap-1.5 cursor-pointer"
            >
              <Link href="/#artikel">
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t.article_detail_back_articles}</span>
                <span className="sm:hidden">{isEn ? "Articles" : "Artikel"}</span>
              </Link>
            </Button>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono font-bold text-[var(--vt-ink)] min-w-0">
            <HardDrive className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="hidden sm:inline mobile-safe-path max-w-[220px] sm:max-w-none">C:\Sigit\Articles\{article.slug}.doc</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-bold shrink-0">[READY]</span>
          </div>
        </div>

        {/* Main Article Document Window */}
        <OSWindow
          id={`article-${article.slug}`}
          title={`WordPad_Document.doc :: [${article.slug.toUpperCase()}]`}
          icon={<FileText className="h-4 w-4 text-primary" />}
          statusText={`Words: ${wordCount} | Read Time: ~${readMinutes} min | Status: PUBLISHED`}
        >
          <div className="article-detail-section space-y-6">
            {/* Reading progress */}
            <div
              className="sticky top-0 z-10 -mx-1 h-1.5 rounded bg-muted/60 border border-border/60 overflow-hidden"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={readProgress}
              aria-label={isEn ? "Reading progress" : "Progress baca"}
              title={`${readProgress}%`}
            >
              <div
                className="h-full bg-primary transition-[width] duration-150"
                style={{ width: `${readProgress}%` }}
              />
            </div>
            {/* Header / Meta */}
            <div className="space-y-4 pb-4 border-b border-border/70">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {article.featured && (
                    <span className="bg-amber-400 text-black text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase">
                      FEATURED
                    </span>
                  )}
                  <span className="text-xs font-mono text-muted-foreground inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-primary" />
                    {new Date(article.createdAt).toLocaleDateString(t.date_locale || "id-ID", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground inline-flex items-center gap-1">
                    <Clock className="h-3 w-3 text-primary" />
                    {readMinutes} {t.article_detail_read_time_suffix || "mnt baca"}
                  </span>
                </div>

                <Button
                  onClick={handleShare}
                  size="sm"
                  variant="outline"
                  className="h-7 px-2.5 text-xs font-mono font-bold gap-1.5 cursor-pointer bg-background hover:bg-muted"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        {isEn ? "Copied!" : "Tersalin!"}
                      </span>
                    </>
                  ) : (
                    <>
                      <Share2 className="h-3.5 w-3.5 text-primary" />
                      <span>{t.article_detail_share}</span>
                    </>
                  )}
                </Button>
                {pageUrl && (
                  <>
                    <a
                      href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(pageUrl)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Share ke X"
                      title="Share ke X"
                      className="h-7 px-2.5 inline-flex items-center text-xs font-mono font-bold gap-1.5 rounded-md border border-input bg-background hover:bg-muted"
                    >
                      <span aria-hidden="true">𝕏</span>
                    </a>
                    <a
                      href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Share ke LinkedIn"
                      title="Share ke LinkedIn"
                      className="h-7 px-2.5 inline-flex items-center text-xs font-mono font-bold gap-1.5 rounded-md border border-input bg-background hover:bg-muted"
                    >
                      <span aria-hidden="true">in</span>
                    </a>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(`${title} ${pageUrl}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Share ke WhatsApp"
                      title="Share ke WhatsApp"
                      className="h-7 px-2.5 inline-flex items-center text-xs font-mono font-bold gap-1.5 rounded-md border border-input bg-background hover:bg-muted"
                    >
                      <span aria-hidden="true">WA</span>
                    </a>
                  </>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold font-pixel tracking-tight text-foreground leading-tight">
                {title}
              </h1>

              <p className="text-xs sm:text-sm font-mono text-[var(--vt-ink)] leading-relaxed bg-[var(--vt-card)] p-3 rounded border border-[var(--vt-edge-lo-2)] mobile-safe-text">
                {summary}
              </p>

              {/* Tags */}
              {article.tags && article.tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <Tag className="h-3 w-3 text-muted-foreground mr-1" />
                  {article.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[11px] font-mono px-2 py-0.5 rounded bg-muted/60 border border-border text-foreground font-semibold"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Cover Image */}
            {article.imageUrl && (
              <div className="relative aspect-[16/9] md:aspect-[21/9] w-full rounded border-2 border-border overflow-hidden bg-black/60 shadow-inner">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={article.imageUrl}
                  alt={title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 text-[10px] font-mono text-emerald-400 border border-emerald-500/40 rounded">
                  DOC_ATTACHMENT: COVER_IMG
                </div>
              </div>
            )}

            {/* In-Depth Article Content Body */}
            <article className="prose prose-sm dark:prose-invert max-w-none pt-2 font-mono">
              <FormattedText text={content} />
            </article>

            {/* Author Footer Card */}
            <div className="p-4 rounded bg-muted/40 border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-8">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full border-2 border-primary bg-primary/10 flex items-center justify-center font-pixel font-bold text-primary shrink-0">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono font-bold text-muted-foreground block">
                    {t.article_detail_author_label}
                  </span>
                  <span className="text-sm font-bold font-pixel text-foreground">
                    {profile.name || "Sigit Adi Irianto"}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground block">
                    {profile.headline || "Full Stack & Web Specialist"}
                  </span>
                </div>
              </div>

              <Button
                asChild
                size="sm"
                className="vt-btn-pink h-8 px-4 text-xs font-mono font-bold uppercase gap-1.5"
              >
                <a href={contactDiscussionUrl}>
                  <Mail className="h-3.5 w-3.5" />
                  <span>{t.article_detail_discuss_cta}</span>
                </a>
              </Button>
            </div>

            {/* Related Articles (if any) */}
            {relatedArticles.length > 0 && (
              <div className="pt-6 space-y-4">
                <h4 className="text-sm font-mono font-bold text-foreground flex items-center gap-2 border-b border-border/60 pb-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span>{t.article_detail_related_title}</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {relatedArticles.slice(0, 2).map((rel) => {
                    const relTitle = isEn && rel.titleEn ? rel.titleEn : rel.title;
                    const relSummary = isEn && rel.summaryEn ? rel.summaryEn : rel.summary;
                    return (
                      <Link
                        key={rel.id}
                        href={`/artikel/${rel.slug}`}
                        className="group block p-3 rounded bg-muted/30 border border-border hover:border-primary transition-all"
                      >
                        <span className="text-xs font-mono font-bold text-primary group-hover:underline block truncate">
                          {relTitle}
                        </span>
                        <p className="text-[11px] font-mono text-muted-foreground line-clamp-2 mt-1">
                          {relSummary}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </OSWindow>
      </div>
    </div>
  );
}
