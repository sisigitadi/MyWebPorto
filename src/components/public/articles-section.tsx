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
} from "lucide-react";
import { ArticleData } from "@/lib/dummy-data";
import { useTranslation } from "@/lib/i18n";
import { OSWindow } from "@/components/public/os/os-window";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

interface ArticlesSectionProps {
  articles: ArticleData[];
}

export function ArticlesSection({ articles: propArticles }: ArticlesSectionProps) {
  const { t, language } = useTranslation();
  const sectionRef = useRef<HTMLElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("ALL");

  // Tanpa fallback dummy: tanpa artikel, tampil empty state jujur
  const publishedArticles = ((propArticles && Array.isArray(propArticles)) ? propArticles : []).filter(
    (a) => a.published !== false
  );
  const articles = publishedArticles;

  // Extract all unique tags
  const allTags = useMemo(() => {
    const set = new Set<string>();
    articles.forEach((a) => {
      a.tags.forEach((tag) => set.add(tag));
    });
    return ["ALL", ...Array.from(set)];
  }, [articles]);

  // Filtered list
  const filteredArticles = useMemo(() => {
    return articles.filter((article) => {
      const q = searchQuery.toLowerCase();
      const title = (language === "en" && article.titleEn ? article.titleEn : article.title).toLowerCase();
      const summary = (language === "en" && article.summaryEn ? article.summaryEn : (article.summary || "")).toLowerCase();
      const matchQuery = title.includes(q) || summary.includes(q);

      const matchTag =
        selectedTag === "ALL" ||
        article.tags.some((tg) => tg.toLowerCase() === selectedTag.toLowerCase());

      return matchQuery && matchTag;
    });
  }, [articles, searchQuery, selectedTag, language]);

  useGSAP(
    () => {
      gsap.from(".sigit-article-card", {
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 80%",
          toggleActions: "play none none none",
        },
        opacity: 0,
        y: 35,
        stagger: 0.1,
        duration: 0.75,
        ease: "power3.out",
        clearProps: "all",
      });
    },
    { scope: sectionRef }
  );

  return (
    <section
      ref={sectionRef}
      id="artikel"
      className="relative py-12 md:py-20 scroll-mt-14"
    >
      <div className="max-w-7xl mx-auto px-2 sm:px-4 mobile-safe-copy">
        {/* Section Header */}
        <div className="mb-8">
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

        {/* Retro Filter Bar */}
        <div className="mb-6 p-3 bg-[var(--vt-chrome)] border-2 border-t-[var(--vt-edge-hi-2)] border-l-[var(--vt-edge-hi-2)] border-r-[var(--vt-edge-lo)] border-b-[var(--vt-edge-lo)] shadow-[inset_1px_1px_0_var(--vt-edge-hi),inset_-1px_-1px_0_var(--vt-edge-lo)] flex flex-col md:flex-row gap-3 items-center justify-between min-w-0">
          {/* Tag Chips */}
          <div className="flex flex-wrap gap-1.5 w-full md:w-auto items-center min-w-0">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[var(--vt-ink)] mr-1 flex items-center gap-1">
              <Tag className="h-3 w-3" /> Filter:
            </span>
            {allTags.map((tag) => {
              const isActive = selectedTag === tag;
              return (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={`px-2 py-0.5 text-[11px] font-mono transition-all uppercase ${
                    isActive
                      ? "bg-[var(--vt-amber)] text-black font-bold border-2 border-t-[#000] border-l-[#000] border-r-[#fff] border-b-[#fff] shadow-[inset_1px_1px_0_rgba(0,0,0,0.5)]"
                      : "bg-[var(--vt-card)] text-[var(--vt-ink)] border-2 border-t-[var(--vt-edge-hi)] border-l-[var(--vt-edge-hi)] border-r-[var(--vt-edge-lo)] border-b-[var(--vt-edge-lo)] hover:bg-[var(--vt-edge-hi-2)]"
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64 min-w-0">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[var(--vt-ink-mute)]" />
            <input
              type="text"
              placeholder={language === "en" ? "Search articles..." : "Cari artikel..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1 bg-[var(--vt-paper)] border-2 border-t-[var(--vt-edge-lo)] border-l-[var(--vt-edge-lo)] border-r-[var(--vt-edge-hi-2)] border-b-[var(--vt-edge-hi-2)] text-xs font-mono text-[var(--vt-ink)] placeholder:text-[var(--vt-ink-mute)] focus:outline-none focus:ring-1 focus:ring-[var(--vt-amber)] min-w-0"
            />
          </div>
        </div>

        {/* Articles Grid */}
        {filteredArticles.length === 0 ? (
          <div className="p-8 text-center bg-[var(--vt-chrome)] border-2 border-[var(--vt-edge-lo-2)] shadow-[inset_1px_1px_0_var(--vt-edge-hi)]">
            <BookOpen className="h-8 w-8 mx-auto text-[var(--vt-ink-mute)] mb-2" />
            <p className="font-mono text-xs text-[var(--vt-ink)]">
              {t.articles_empty}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArticles.map((article, index) => {
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
                              src={article.imageUrl}
                              alt={title}
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
                        <Link
                          href={`/artikel/${article.slug}`}
                          className="w-full flex items-center justify-between px-3 py-1.5 bg-[var(--vt-card)] border-2 border-t-[var(--vt-edge-hi)] border-l-[var(--vt-edge-hi)] border-r-[var(--vt-edge-lo)] border-b-[var(--vt-edge-lo)] hover:bg-[var(--vt-edge-hi-2)] active:border-t-[var(--vt-edge-lo)] active:border-l-[var(--vt-edge-lo)] active:border-r-[var(--vt-edge-hi-2)] active:border-b-[var(--vt-edge-hi-2)] font-mono text-xs font-bold text-[var(--vt-ink)] group transition-all"
                        >
                          <span className="flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5 text-[var(--vt-amber)]" />
                            {t.articles_read_more}
                          </span>
                          <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform text-[var(--vt-ink)]" />
                        </Link>
                      </div>
                    </div>
                  </OSWindow>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
