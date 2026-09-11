"use client";

import React, { useRef, useState } from "react";
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
import { ArticleData, ProfileData } from "@/lib/dummy-data";
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

  const encodedDiscussionSubject = encodeURIComponent(
    isEn ? `Article Discussion: ${title}` : `Diskusi Artikel: ${title}`
  );
  const encodedDiscussionMsg = encodeURIComponent(
    isEn
      ? `Hello ${profile.name || "Sigit"},\n\nI just read your article "${title}" and would love to share thoughts/inquire about it.`
      : `Halo ${profile.name || "Sigit"},\n\nSaya baru saja membaca artikel "${title}" dan tertarik untuk berdiskusi/bertanya lebih lanjut.`
  );
  const emailDiscussionUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
    profile.email || "x@sigitadi.id"
  )}&su=${encodedDiscussionSubject}&body=${encodedDiscussionMsg}`;

  // Helper to render formatted article paragraphs or headers
  const renderFormattedContent = (rawText: string) => {
    if (!rawText) return null;
    const blocks = rawText.split(/\n\n+/);

    return blocks.map((block, idx) => {
      const trimmed = block.trim();
      if (!trimmed) return null;

      // H2 Heading
      if (trimmed.startsWith("## ")) {
        return (
          <h2
            key={idx}
            className="text-xl sm:text-2xl font-pixel font-bold text-foreground mt-8 mb-4 tracking-tight border-b border-border/60 pb-2"
          >
            {trimmed.replace(/^##\s+/, "")}
          </h2>
        );
      }

      // H3 Heading
      if (trimmed.startsWith("### ")) {
        return (
          <h3
            key={idx}
            className="text-base sm:text-lg font-mono font-bold text-foreground mt-6 mb-3 tracking-tight"
          >
            {"> "}
            {trimmed.replace(/^###\s+/, "")}
          </h3>
        );
      }

      // Blockquote
      if (trimmed.startsWith("> ")) {
        return (
          <blockquote
            key={idx}
            className="border-l-4 border-primary bg-muted/40 p-4 rounded-r font-mono text-xs sm:text-sm text-[var(--vt-ink)] italic my-4"
          >
            {trimmed.replace(/^>\s+/, "")}
          </blockquote>
        );
      }

      // Code Block / Terminal snippet
      if (trimmed.startsWith("```") && trimmed.endsWith("```")) {
        const cleanCode = trimmed.replace(/^```[a-z]*\n?/, "").replace(/```$/, "");
        return (
          <pre
            key={idx}
            className="p-4 rounded bg-black/90 text-emerald-400 font-mono text-xs overflow-x-auto border border-border/80 shadow-inner my-4"
          >
            <code>{cleanCode}</code>
          </pre>
        );
      }

      // Regular Paragraph
      return (
        <p
          key={idx}
          className="text-xs sm:text-sm font-mono text-foreground/90 leading-relaxed sm:leading-loose my-3"
        >
          {trimmed}
        </p>
      );
    });
  };

  return (
    <div ref={containerRef} className="py-8 md:py-14 w-full">
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
                <span>{t.article_detail_back_desktop}</span>
              </Link>
            </Button>

            <Button
              asChild
              size="sm"
              className="vt-btn vt-btn-chrome h-8 px-3 font-mono text-xs font-bold gap-1.5 cursor-pointer"
            >
              <Link href="/#artikel">
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>{t.article_detail_back_articles}</span>
              </Link>
            </Button>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono font-bold text-[var(--vt-ink)]">
            <HardDrive className="h-3.5 w-3.5 text-primary" />
            <span className="hidden sm:inline">C:\Sigit\Articles\{article.slug}.doc</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-bold">[READY]</span>
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
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold font-pixel tracking-tight text-foreground leading-tight">
                {title}
              </h1>

              <p className="text-xs sm:text-sm font-mono text-muted-foreground leading-relaxed bg-muted/30 p-3 rounded border border-border/50">
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
              {renderFormattedContent(content)}
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
                    {profile.name || "Sigit Wasis Subekti"}
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
                <a href={emailDiscussionUrl} target="_blank" rel="noopener noreferrer">
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
