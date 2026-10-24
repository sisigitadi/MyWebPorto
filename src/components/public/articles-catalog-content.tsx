"use client";

import { useState } from "react";
import Link from "next/link";
import { Calendar, Clock, ArrowRight, Folder, Monitor, Globe, Copy, Check, FileText } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { ArticleData } from "@/lib/dummy-data";
import { OSWindow } from "@/components/public/os/os-window";
import { ShareButton } from "@/components/public/share-button";
import { toast } from "sonner";

interface ArticlesCatalogContentProps {
  articles: ArticleData[];
}

export function ArticlesCatalogContent({ articles }: ArticlesCatalogContentProps) {
  const { t, language } = useTranslation();
  const [copied, setCopied] = useState(false);
  const isEn = language === "en";
  const pageAddress = "https://sigitadi.id/artikel";

  const handleCopyAddress = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(pageAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success(isEn ? "URL address copied to clipboard!" : "Alamat URL berhasil disalin!");
    }
  };

  return (
    <div className="py-8 md:py-14 relative overflow-hidden h-full w-full overflow-y-auto vt-scrollbar vt-crt-on">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 space-y-6">
        <OSWindow
          id="articles-catalog"
          title="SigitOS_Explorer :: https://sigitadi.id/artikel"
          icon={<Folder className="h-4 w-4 text-amber-300" />}
          statusText={`Total records: ${articles.length} documents found | Directory status: READ_ONLY`}
        >
          {/* Explorer Navigation Bar - Single Row Compact */}
          <div className="mb-6 p-2 rounded bg-muted/40 border border-border flex items-center justify-between gap-1.5 sm:gap-2 text-xs font-mono">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <Link
                href="/"
                className="vt-btn vt-btn-chrome px-2 sm:px-3 py-1 text-xs font-bold text-foreground inline-flex items-center gap-1 shrink-0"
              >
                <Monitor className="h-3.5 w-3.5 text-primary" />
                <span className="hidden md:inline">{t.articles_back}</span>
                <span className="hidden sm:inline md:hidden">{isEn ? "Desktop OS" : "Desktop OS"}</span>
                <span className="sm:hidden">Desktop</span>
              </Link>
              <div className="hidden lg:flex items-center gap-2 min-w-0 max-w-sm">
                <span className="text-[var(--vt-ink)] font-bold">Address:</span>
                <div
                  onClick={handleCopyAddress}
                  title={isEn ? "Click to copy address URL" : "Klik untuk menyalin alamat URL"}
                  className="px-2 py-1 bg-background border border-border/80 rounded flex items-center gap-1.5 text-primary font-bold cursor-pointer hover:border-primary/50 transition-colors group select-all min-w-0"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleCopyAddress();
                    }
                  }}
                  aria-label={isEn ? "Copy address URL https://sigitadi.id/artikel" : "Salin alamat URL https://sigitadi.id/artikel"}
                >
                  <Globe className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="truncate">{pageAddress}</span>
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 ml-1" />
                  ) : (
                    <Copy className="h-3 w-3 text-muted-foreground group-hover:text-primary shrink-0 ml-1 transition-colors" />
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <ShareButton
                title={isEn ? "Tech Articles & Architecture Insights - Sigit Adi Irianto" : "Artikel & Wawasan Teknologi - Sigit Adi Irianto"}
                url="/artikel"
                summary={
                  isEn
                    ? "In-depth technical articles, software architecture guides, Next.js tips, AI systems integration, and modern engineering insights by Sigit Adi Irianto."
                    : "Kumpulan artikel mendalam, panduan arsitektur software engineering, tips Next.js, integrasi sistem AI, dan wawasan rekayasa teknologi modern."
                }
                badge={isEn ? "ARTICLES" : "ARTIKEL"}
                buttonText={isEn ? "Share" : "Bagikan"}
                className="vt-btn vt-btn-chrome text-xs font-mono font-bold px-2 sm:px-3 py-1"
              />
              <span className="text-[11px] text-muted-foreground font-bold hidden sm:inline">
                FORMAT: ARTICLE_INDEX_V2.5
              </span>
            </div>
          </div>

          {/* Header Banner */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2 font-pixel text-xs text-[#7a5f00] dark:text-[var(--vt-amber)]">
              <span className="h-2 w-2 rounded-full bg-[var(--vt-amber)] animate-pulse" />
              <span>{t.articles_badge}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-display tracking-tight text-[var(--vt-ink)]">
              {t.articles_title}
            </h1>
            <p className="text-xs sm:text-sm font-mono text-[var(--vt-ink)] font-medium mt-1 max-w-2xl">
              {t.articles_subtitle}
            </p>
          </div>

          {/* Empty State */}
          {articles.length === 0 ? (
            <div className="py-16 text-center space-y-3 font-mono">
              <FileText className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="text-sm font-bold text-[var(--vt-ink)]">{t.articles_empty}</p>
              <p className="text-xs text-muted-foreground">
                {isEn ? "Check back later for new publications." : "Nantikan publikasi baru di lain waktu."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((article, index) => {
                const title = isEn && article.titleEn ? article.titleEn : article.title;
                const summary = isEn && article.summaryEn ? article.summaryEn : article.summary;
                const summaryFallback = (article.content || "").trim().slice(0, 150);
                const readTimeMin = Math.max(
                  1,
                  Math.ceil((article.content || "").split(/\s+/).filter(Boolean).length / 180)
                );

                return (
                  <div
                    key={article.id}
                    className="flex flex-col h-full bg-card rounded border border-border overflow-hidden group hover:border-primary/50 transition-colors shadow-sm"
                  >
                    {/* Retro Sunken Thumbnail */}
                    {article.imageUrl && (
                      <div className="relative aspect-[16/9] w-full overflow-hidden bg-black/40 border-b border-border">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={article.imageUrl}
                          alt={title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        {article.featured && (
                          <span className="absolute top-2 left-2 bg-[var(--vt-amber)] text-black text-[9px] font-pixel font-bold px-1.5 py-0.5 border border-black shadow">
                            FEATURED
                          </span>
                        )}
                      </div>
                    )}

                    <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        {/* Meta row */}
                        <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground border-b border-border/60 pb-1.5">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(article.createdAt).toLocaleDateString(t.date_locale || "id-ID", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {readTimeMin} {t.articles_read_time}
                          </span>
                        </div>

                        {/* Title */}
                        <Link href={`/artikel/${article.slug}`}>
                          <h2 className="text-base font-bold font-display text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                            {title}
                          </h2>
                        </Link>

                        {/* Summary */}
                        <p className="text-xs font-mono text-[var(--vt-ink)] font-medium leading-relaxed line-clamp-3">
                          {summary || summaryFallback + "..."}
                        </p>

                        {/* Tags */}
                        {article.tags && article.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {article.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-[var(--vt-ink)] border border-border"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Open Action */}
                      <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs font-mono font-bold">
                        <span className="text-[11px] text-muted-foreground">
                          Doc #{String(index + 1).padStart(2, "0")}
                        </span>
                        <Link
                          href={`/artikel/${article.slug}`}
                          className="vt-btn vt-btn-pink px-3 py-1 text-[11px] font-bold inline-flex items-center gap-1 text-white shadow-sm"
                        >
                          <span style={{ color: "#1a1512" }}>{t.articles_read_more}</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </OSWindow>
      </div>
    </div>
  );
}
