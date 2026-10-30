"use client";

import React, { useRef, useState, useMemo } from "react";
import Link from "next/link";
import {
  FileText,
  Calendar,
  Clock,
  ArrowRight,
  Tag,
  Search,
  BookOpen,
  LayoutGrid,
  List as ListIcon,
  FolderOpen,
} from "lucide-react";
import { ArticleData } from "@/lib/dummy-data";
import { useTranslation } from "@/lib/i18n";
import { OSWindow } from "@/components/public/os/os-window";
import { ShareButton } from "@/components/public/share-button";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

const INITIAL_LIMIT = 6;

interface ArticlesSectionProps {
  articles: ArticleData[];
}

interface ArticleCategoryFilter {
  id: string;
  labelId: string;
  labelEn: string;
  match: (tags: string[], title: string, summary: string) => boolean;
}

const ARTICLE_CATEGORIES: ArticleCategoryFilter[] = [
  {
    id: "ALL",
    labelId: "Semua",
    labelEn: "All",
    match: () => true,
  },
  {
    id: "WEB_STACK",
    labelId: "Web",
    labelEn: "Web",
    match: (tags, title, summary) => {
      const kws = ["next.js", "react", "typescript", "architecture", "retro ui", "gsap", "frontend", "web"];
      const text = `${tags.join(" ")} ${title} ${summary}`.toLowerCase();
      return kws.some((kw) => text.includes(kw));
    },
  },
  {
    id: "AI_AUTOMATION",
    labelId: "AI",
    labelEn: "AI",
    match: (tags, title, summary) => {
      const kws = ["ai", "chatgpt", "gemini", "automation", "video production", "content strategy"];
      const text = `${tags.join(" ")} ${title} ${summary}`.toLowerCase();
      return kws.some((kw) => text.includes(kw));
    },
  },
  {
    id: "SECURITY",
    labelId: "Security",
    labelEn: "Security",
    match: (tags, title, summary) => {
      const kws = ["cybersecurity", "security", "siem", "wazuh", "hardening", "serangan", "mitigasi"];
      const text = `${tags.join(" ")} ${title} ${summary}`.toLowerCase();
      return kws.some((kw) => text.includes(kw));
    },
  },
  {
    id: "BACKEND_DATA",
    labelId: "Cloud",
    labelEn: "Cloud",
    match: (tags, title, summary) => {
      const kws = ["backend", "drizzle", "postgresql", "serverless", "cloud", "database", "api"];
      const text = `${tags.join(" ")} ${title} ${summary}`.toLowerCase();
      return kws.some((kw) => text.includes(kw));
    },
  },
];

export function ArticlesSection({ articles: propArticles }: ArticlesSectionProps) {
  const { t, language } = useTranslation();
  const sectionRef = useRef<HTMLElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("ALL");
  const [visibleCount, setVisibleCount] = useState<number>(INITIAL_LIMIT);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Tanpa fallback dummy: tanpa artikel, tampil empty state jujur
  const publishedArticles = ((propArticles && Array.isArray(propArticles)) ? propArticles : []).filter(
    (a) => a.published !== false
  );
  const articles = publishedArticles;

  // Filtered list berbasis 5 domain kategori yang ringkas & terelaborasi
  const filteredArticles = useMemo(() => {
    const activeCategory = ARTICLE_CATEGORIES.find((c) => c.id === selectedTag) || ARTICLE_CATEGORIES[0];

    return articles.filter((article) => {
      const q = searchQuery.toLowerCase();
      const title = (language === "en" && article.titleEn ? article.titleEn : article.title).toLowerCase();
      const summary = (language === "en" && article.summaryEn ? article.summaryEn : (article.summary || "")).toLowerCase();
      const matchQuery = !q || title.includes(q) || summary.includes(q);

      const matchCategory = activeCategory.match(article.tags, title, summary);

      return matchQuery && matchCategory;
    });
  }, [articles, searchQuery, selectedTag, language]);

  const displayedArticles = useMemo(() => {
    return filteredArticles.slice(0, visibleCount);
  }, [filteredArticles, visibleCount]);

  useGSAP(
    () => {
      if (viewMode === "grid") {
        gsap.from(".sigit-article-card", {
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 80%",
            toggleActions: "play none none none",
          },
          opacity: 0,
          y: 35,
          stagger: 0.08,
          duration: 0.65,
          ease: "power3.out",
          clearProps: "all",
        });
      }
    },
    { scope: sectionRef, dependencies: [viewMode, visibleCount] }
  );

  return (
    <section
      ref={sectionRef}
      id="artikel"
      className="relative py-12 md:py-20 scroll-mt-14"
    >
      <div className="max-w-7xl mx-auto px-2 sm:px-4 mobile-safe-copy">
        {/* Section Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 font-pixel text-xs text-[var(--vt-amber)]">
              <span className="h-2 w-2 rounded-full bg-[var(--vt-amber)] animate-pulse" />
              <span>{t.articles_badge}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-display tracking-tight text-[var(--vt-ink)]">
              {t.articles_title}
            </h2>
            <p className="text-xs sm:text-sm font-mono text-[var(--vt-ink)] font-medium mt-1 max-w-2xl">
              {t.articles_subtitle}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <ShareButton
              title={language === "en" ? "Tech Articles & Architecture Insights: Sigit Adi Irianto" : "Artikel & Wawasan Teknologi: Sigit Adi Irianto"}
              url="/artikel"
              summary={
                language === "en"
                  ? "In-depth technical articles, software architecture guides, Next.js tips, AI systems integration, and modern engineering insights by Sigit Adi Irianto."
                  : "Kumpulan artikel mendalam, panduan arsitektur software engineering, tips Next.js, integrasi sistem AI, dan wawasan rekayasa teknologi modern."
              }
              badge={language === "en" ? "ARTICLES" : "ARTIKEL"}
              thumbnailUrl="/artikel/opengraph-image"
              buttonText={language === "en" ? "Share Articles" : "Bagikan Artikel"}
              className="vt-btn vt-btn-chrome text-xs font-mono font-bold"
            />
          </div>
        </div>

        {/* Retro Filter Bar & Toolbar */}
        <div className="mb-6 p-3 bg-[var(--vt-chrome)] border-2 border-t-[var(--vt-edge-hi-2)] border-l-[var(--vt-edge-hi-2)] border-r-[var(--vt-edge-lo)] border-b-[var(--vt-edge-lo)] shadow-[inset_1px_1px_0_var(--vt-edge-hi),inset_-1px_-1px_0_var(--vt-edge-lo)] flex flex-col md:flex-row gap-3 items-center justify-between min-w-0">
          {/* Category Filter Pills (Ringkas, Informatif & Sesuai Konteks) */}
          <div className="flex flex-wrap gap-1.5 w-full md:w-auto items-center min-w-0">
            <Tag className="h-3.5 w-3.5 text-muted-foreground mr-0.5 shrink-0" />
            {ARTICLE_CATEGORIES.map((cat) => {
              const isActive = selectedTag === cat.id;
              const label = language === "en" ? cat.labelEn : cat.labelId;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedTag(cat.id);
                    setVisibleCount(INITIAL_LIMIT);
                  }}
                  className={`px-2 py-0.5 text-[11px] font-mono transition-all uppercase cursor-pointer ${
                    isActive
                      ? "bg-[var(--vt-amber)] text-black font-bold border-2 border-t-[#000] border-l-[#000] border-r-[#fff] border-b-[#fff] shadow-[inset_1px_1px_0_rgba(0,0,0,0.5)]"
                      : "bg-[var(--vt-card)] text-[var(--vt-ink)] border-2 border-t-[var(--vt-edge-hi)] border-l-[var(--vt-edge-hi)] border-r-[var(--vt-edge-lo)] border-b-[var(--vt-edge-lo)] hover:bg-[var(--vt-edge-hi-2)]"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-end min-w-0">
            {/* Search Box */}
            <div className="relative w-full md:w-60 min-w-0">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[var(--vt-ink-mute)] pointer-events-none" />
              <input
                type="text"
                placeholder={language === "en" ? "Search..." : "Cari..."}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setVisibleCount(INITIAL_LIMIT);
                }}
                className="w-full pl-8 pr-3 py-1 bg-[var(--vt-paper)] border-2 border-t-[var(--vt-edge-lo)] border-l-[var(--vt-edge-lo)] border-r-[var(--vt-edge-hi-2)] border-b-[var(--vt-edge-hi-2)] text-xs font-mono text-[var(--vt-ink)] placeholder:text-[var(--vt-ink-mute)] focus:outline-none focus:ring-1 focus:ring-[var(--vt-amber)] min-w-0"
              />
            </div>

            {/* View Mode Toggle: Grid vs Compact List */}
            <div className="flex items-center border-2 border-t-[var(--vt-edge-lo)] border-l-[var(--vt-edge-lo)] border-r-[var(--vt-edge-hi-2)] border-b-[var(--vt-edge-hi-2)] bg-[var(--vt-paper)] p-0.5 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-1.5 transition-colors cursor-pointer ${
                  viewMode === "grid"
                    ? "bg-[var(--vt-amber)] text-black font-bold"
                    : "text-[var(--vt-ink-mute)] hover:text-[var(--vt-ink)]"
                }`}
                title={language === "en" ? "Grid View" : "Tampilan Grid 16:9"}
                aria-label="Grid View"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`p-1.5 transition-colors cursor-pointer ${
                  viewMode === "list"
                    ? "bg-[var(--vt-amber)] text-black font-bold"
                    : "text-[var(--vt-ink-mute)] hover:text-[var(--vt-ink)]"
                }`}
                title={language === "en" ? "Compact Explorer List View" : "Tampilan Berkas Padat (Explorer)"}
                aria-label="List View"
              >
                <ListIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Empty State */}
        {filteredArticles.length === 0 ? (
          <div className="p-8 text-center bg-[var(--vt-chrome)] border-2 border-[var(--vt-edge-lo-2)] shadow-[inset_1px_1px_0_var(--vt-edge-hi)] font-mono">
            <BookOpen className="h-8 w-8 mx-auto text-[var(--vt-ink-mute)] mb-2" />
            <p className="text-xs text-[var(--vt-ink)] font-bold">
              {t.articles_empty}
            </p>
            <p className="text-[11px] text-[var(--vt-ink-mute)] mt-1">
              {language === "en" ? "Try resetting the tag filter or search keyword." : "Coba pilih filter ALL atau ubah kata kunci pencarian."}
            </p>
          </div>
        ) : viewMode === "list" ? (
          /* =======================================================
             COMPACT EXPLORER LIST VIEW — Hemat ruang vertikal (~300px)
             ======================================================= */
          <OSWindow
            title="ARTIKEL_DIRECTORY.DIR"
            icon={<FolderOpen className="h-3.5 w-3.5 text-[var(--vt-amber)]" />}
            statusText={`Total records: ${filteredArticles.length} files | Showing: ${displayedArticles.length} records`}
            className="w-full shadow-md"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="bg-[var(--vt-chrome)] border-b-2 border-[var(--vt-edge-lo-2)] text-[10px] text-[var(--vt-ink-mute)] uppercase tracking-wider">
                    <th className="py-2 px-3 font-bold">Dokumen / Judul</th>
                    <th className="py-2 px-3 font-bold hidden md:table-cell">Topik &amp; Tag</th>
                    <th className="py-2 px-3 font-bold hidden sm:table-cell">Tanggal</th>
                    <th className="py-2 px-3 font-bold hidden lg:table-cell">Waktu</th>
                    <th className="py-2 px-3 font-bold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--vt-edge-hi-2)] bg-[var(--vt-paper)] text-[var(--vt-ink)]">
                  {displayedArticles.map((article) => {
                    const title = language === "en" && article.titleEn ? article.titleEn : article.title;
                    const readTimeMin = Math.max(1, Math.ceil((article.content || "").split(/\s+/).length / 180));
                    return (
                      <tr
                        key={article.id}
                        className="hover:bg-[var(--vt-chrome)] transition-colors group"
                      >
                        <td className="py-2.5 px-3">
                          <Link
                            href={`/artikel/${article.slug}`}
                            className="flex items-start gap-2 group-hover:text-[var(--vt-blue)] transition-colors"
                          >
                            <FileText className="h-4 w-4 shrink-0 text-[var(--vt-amber)] mt-0.5" />
                            <div className="min-w-0">
                              <span className="font-bold font-display line-clamp-1 text-xs sm:text-sm">
                                {title}
                              </span>
                              <span className="text-[10px] text-[var(--vt-ink-mute)] block sm:hidden">
                                {new Date(article.createdAt).toLocaleDateString(language === "en" ? "en-US" : "id-ID", { month: "short", day: "numeric", year: "numeric" })}
                              </span>
                            </div>
                          </Link>
                        </td>
                        <td className="py-2.5 px-3 hidden md:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {article.tags.slice(0, 2).map((tg, i) => (
                              <span key={i} className="text-[9px] px-1 bg-[var(--vt-card)] border border-[var(--vt-edge-lo-2)] rounded-2xs">
                                #{tg}
                              </span>
                            ))}
                            {article.tags.length > 2 && (
                              <span className="text-[9px] opacity-70">+{article.tags.length - 2}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap text-[11px] text-[var(--vt-ink-mute)] hidden sm:table-cell">
                          {new Date(article.createdAt).toLocaleDateString(
                            language === "en" ? "en-US" : "id-ID",
                            { month: "short", day: "numeric", year: "numeric" }
                          )}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap text-[11px] text-[var(--vt-ink-mute)] hidden lg:table-cell">
                          {readTimeMin} {t.articles_read_time}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <Link
                            href={`/artikel/${article.slug}`}
                            className="vt-btn vt-btn-chrome px-2.5 py-1 text-[11px] font-bold inline-flex items-center gap-1 group-hover:border-[var(--vt-blue)]"
                          >
                            <span>BACA</span>
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </OSWindow>
        ) : (
          /* =======================================================
             GRID VIEW (Visual Card) — Dibatasi visibleCount
             ======================================================= */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedArticles.map((article, index) => {
              const title =
                language === "en" && article.titleEn
                  ? article.titleEn
                  : article.title;
              const summary =
                language === "en" && article.summaryEn
                  ? article.summaryEn
                  : (article.summary || article.content.slice(0, 150) + "...");
              const readTimeMin = Math.max(
                1,
                Math.ceil((article.content || "").split(/\s+/).length / 180)
              );

              return (
                <div
                  key={article.id}
                  className="sigit-article-card flex flex-col h-full min-w-0"
                >
                  <OSWindow
                    title={`ARTIKEL_${String(index + 1).padStart(2, "0")}.DOC`}
                    icon={<FileText className="h-3.5 w-3.5 text-[var(--vt-amber)]" />}
                    className="h-full flex flex-col"
                  >
                    <div className="p-4 flex-1 flex flex-col justify-between bg-[var(--vt-paper)] text-[var(--vt-ink)] min-w-0">
                      <div>
                        {/* Cover Image if available */}
                        {article.imageUrl && (
                          <div className="relative mb-3 overflow-hidden rounded-sm border border-[var(--vt-edge-lo-2)] shadow-inner aspect-[16/9] bg-black">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={article.imageUrl ? (article.imageUrl.includes("images.unsplash.com") ? `${article.imageUrl.split("?")[0]}?w=600&q=75&auto=format&fit=crop` : article.imageUrl) : ""}
                              alt={title}
                              loading="lazy"
                              decoding="async"
                              width={480}
                              height={270}
                              className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                            />
                            {article.featured && (
                              <span className="absolute top-2 left-2 bg-[var(--vt-amber)] text-black text-[9px] font-pixel font-bold px-1.5 py-0.5 border border-black shadow">
                                {language === "en" ? "FEATURED" : "UNGGULAN"}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Metadata row */}
                        <div className="flex items-center gap-3 text-[10px] font-mono text-[var(--vt-ink-mute)] mb-2 border-b border-[var(--vt-edge-hi-2)] pb-1.5">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(article.createdAt).toLocaleDateString(
                              language === "en" ? "en-US" : "id-ID",
                              { month: "short", day: "numeric", year: "numeric" }
                            )}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {readTimeMin} {t.articles_read_time}
                          </span>
                        </div>

                        {/* Title */}
                        <Link
                          href={`/artikel/${article.slug}`}
                          className="group block min-w-0"
                        >
                          <h3 className="font-bold text-base font-display text-[var(--vt-ink)] leading-snug group-hover:text-[var(--vt-blue)] transition-colors line-clamp-2 mb-2 mobile-safe-text">
                            {title}
                          </h3>
                        </Link>

                        {/* Summary */}
                        <p className="text-xs font-mono text-[var(--vt-ink-soft)] leading-relaxed line-clamp-3 mb-4 mobile-safe-text">
                          {summary}
                        </p>
                      </div>

                      <div>
                        {/* Tags */}
                        <div className="flex flex-wrap gap-1 mb-4">
                          {article.tags.map((tg, i) => (
                            <span
                              key={i}
                              className="text-[9px] font-mono px-1.5 py-0.2 bg-[var(--vt-card)] border border-[var(--vt-edge-lo-2)] text-[var(--vt-ink)]"
                            >
                              #{tg}
                            </span>
                          ))}
                        </div>

                        {/* Read Full Article Button */}
                        <div className="flex items-center">
                          <Link
                            href={`/artikel/${article.slug}`}
                            aria-label={`${t.articles_read_more}: ${title}`}
                            className="w-full flex items-center justify-between px-3 py-1.5 bg-[var(--vt-card)] border-2 border-t-[var(--vt-edge-hi)] border-l-[var(--vt-edge-hi)] border-r-[var(--vt-edge-lo)] border-b-[var(--vt-edge-lo)] hover:bg-[var(--vt-edge-hi-2)] active:border-t-[var(--vt-edge-lo)] active:border-l-[var(--vt-edge-lo)] active:border-r-[var(--vt-edge-hi-2)] active:border-b-[var(--vt-edge-hi-2)] font-mono text-xs font-bold text-[var(--vt-ink)] group transition-all cursor-pointer"
                          >
                            <span className="flex items-center gap-1.5">
                              <FileText className="h-3.5 w-3.5 text-[var(--vt-amber)]" />
                              <span>{t.articles_read_more}</span>
                            </span>
                            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform text-[var(--vt-ink)]" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </OSWindow>
                </div>
              );
            })}
          </div>
        )}

        {/* =======================================================
           LOAD MORE & CATALOG EXPLORER BANNER
           ======================================================= */}
        {filteredArticles.length > 0 && (
          <div className="mt-8 pt-4 border-t-2 border-[var(--vt-edge-hi-2)] flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs">
            <span className="text-[var(--vt-ink-mute)] text-[11px]">
              {language === "en"
                ? `Showing ${displayedArticles.length} of ${filteredArticles.length} articles`
                : `Menampilkan ${displayedArticles.length} dari ${filteredArticles.length} artikel`}
            </span>

            <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-end">
              {filteredArticles.length > visibleCount && (
                <button
                  type="button"
                  onClick={() => setVisibleCount((prev) => prev + 6)}
                  className="vt-btn vt-btn-chrome px-3.5 py-1.5 text-xs font-bold text-[var(--vt-ink)] flex items-center gap-1.5 cursor-pointer hover:border-[var(--vt-amber)] shadow-xs"
                >
                  <span className="text-[var(--vt-amber)] font-extrabold">+</span>
                  <span>
                    {language === "en"
                      ? `Load ${Math.min(6, filteredArticles.length - visibleCount)} More (${filteredArticles.length - visibleCount} remaining)`
                      : `Muat ${Math.min(6, filteredArticles.length - visibleCount)} Artikel Lagi (Sisa ${filteredArticles.length - visibleCount})`}
                  </span>
                </button>
              )}

              <Link
                href="/artikel"
                className="vt-btn vt-btn-pink px-4 py-1.5 text-xs font-bold font-mono inline-flex items-center gap-1.5 shadow-sm hover:scale-[1.02] transition-transform"
              >
                <span>{language === "en" ? "Explore Full Catalog" : "Buka Folder Artikel Lengkap"}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
