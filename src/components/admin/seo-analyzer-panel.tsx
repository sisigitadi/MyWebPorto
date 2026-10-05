"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, Lightbulb, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { SeoAnalysis, SeoSeverity } from "@/lib/seo-keywords";

const SEVERITY_STYLE: Record<
  SeoSeverity,
  { label: string; icon: typeof AlertTriangle; className: string }
> = {
  critical: {
    label: "Kritis",
    icon: AlertTriangle,
    className: "border-destructive text-destructive",
  },
  warning: {
    label: "Perhatian",
    icon: AlertTriangle,
    className: "border-amber-500 text-amber-600",
  },
  opportunity: {
    label: "Peluang",
    icon: Lightbulb,
    className: "border-sky-500 text-sky-600",
  },
};

const SEVERITY_ORDER: SeoSeverity[] = ["critical", "warning", "opportunity"];

interface Props {
  analysis: SeoAnalysis;
  /**
   * Nama field meta di composer, atau null bila tipe konten ini memang tidak
   * punya meta description (produk, layanan, testimoni, profil). Panel
   * menyembunyikan bagian yang tidak berlaku supaya tidak menawarkan tombol
   * "Terapkan" untuk field yang tidak ada.
   */
  metaField: "summary" | null;
  onApplyTitle: (value: string) => void;
  onApplySlug: (value: string) => void;
  onApplyMeta: (value: string) => void;
}

/**
 * Panel hasil analisis SEO. Sengaja read-only terhadap konten: semua
 * perubahan lewat tombol "Terapkan" supaya admin selalu memutuskan sendiri
 * apa yang diganti (analisis adalah saran, bukan perintah).
 */
export function SeoAnalyzerPanel({
  analysis,
  metaField,
  onApplyTitle,
  onApplySlug,
  onApplyMeta,
}: Props) {
  const { metrics, findings, suggestions, relatedContent } = analysis;
  const counts = {
    critical: findings.filter((f) => f.severity === "critical").length,
    warning: findings.filter((f) => f.severity === "warning").length,
    opportunity: findings.filter((f) => f.severity === "opportunity").length,
  };

  return (
    <div className="space-y-3 border-2 rounded-md p-3" style={{ borderColor: "var(--border)" }}>
      <div className="flex flex-wrap items-center gap-2">
        <TrendingUp className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold">Analisis SEO + GEO</p>
        <Badge variant="outline" title="Sisa masalah teknis, bukan prediksi peringkat">
          Skor {analysis.score}/100
        </Badge>
        <Badge
          variant="outline"
          title="Kesiapan untuk mesin answer (ChatGPT, Gemini, Perplexity)"
          className={analysis.geoScore >= 80 ? "border-emerald-600 text-emerald-600" : ""}
        >
          GEO {analysis.geoScore}/100
        </Badge>
        {counts.critical > 0 ? (
          <Badge variant="outline" className={SEVERITY_STYLE.critical.className}>
            {counts.critical} kritis
          </Badge>
        ) : (
          <Badge variant="outline" className="border-emerald-600 text-emerald-600">
            <CheckCircle2 className="h-3 w-3" /> tidak ada masalah kritis
          </Badge>
        )}
        {counts.warning > 0 ? (
          <Badge variant="outline" className={SEVERITY_STYLE.warning.className}>
            {counts.warning} perhatian
          </Badge>
        ) : null}
        {counts.opportunity > 0 ? (
          <Badge variant="outline" className={SEVERITY_STYLE.opportunity.className}>
            {counts.opportunity} peluang
          </Badge>
        ) : null}
      </div>

      {/* Metrik ringkas */}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] sm:grid-cols-4">
        <div>
          <dt className="text-muted-foreground">Kata kunci utama</dt>
          <dd className="font-mono font-bold">
            {analysis.primaryKeyword || "belum terdeteksi"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Jumlah kata</dt>
          <dd className="font-mono">{metrics.wordCount}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Sub-judul H2</dt>
          <dd className="font-mono">{metrics.h2Count}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Internal link</dt>
          <dd className="font-mono">{metrics.internalLinkCount}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Kata pembuka (GEO)</dt>
          <dd className="font-mono">{metrics.answerFirstWords}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Sub-judul tanya</dt>
          <dd className="font-mono">{metrics.questionHeadings}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Fakta berangka</dt>
          <dd className="font-mono">{metrics.quotableFacts}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Item daftar</dt>
          <dd className="font-mono">{metrics.listItems}</dd>
        </div>
      </dl>

      {/* Temuan */}
      {findings.length > 0 ? (
        <ul className="space-y-1.5">
          {SEVERITY_ORDER.flatMap((severity) =>
            findings
              .filter((f) => f.severity === severity)
              .map((finding) => {
                const style = SEVERITY_STYLE[severity];
                const Icon = style.icon;
                return (
                  <li key={finding.id} className="flex items-start gap-2 text-xs">
                    <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${style.className}`} />
                    <span>
                      <span className="font-semibold">{finding.label}:</span>{" "}
                      {finding.message}
                    </span>
                  </li>
                );
              })
          )}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">
          Semua pemeriksaan lolos: panjang judul/slug/deskripsi pas, ada sub-judul,
          internal link tersedia, dan struktur GEO (ringkasan pembuka, sub-judul tanya,
          fakta berangka) terpenuhi.
        </p>
      )}

      {/* Saran siap pakai */}
      <div className="space-y-2 border-t pt-2">
        <p className="text-xs font-semibold">Saran siap pakai</p>

        {suggestions.titles.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {suggestions.titles.map((title) => (
              <Button
                key={title}
                type="button"
                size="sm"
                variant="outline"
                className="h-auto py-1 text-[11px]"
                onClick={() => onApplyTitle(title)}
              >
                Judul: {title}
              </Button>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="text-muted-foreground">Slug:</span>
          <code className="font-mono">
            {analysis.scope.slug ? suggestions.slug || "—" : "—"}
          </code>
          {analysis.scope.slug && suggestions.slug ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-6 px-2 text-[11px]"
              onClick={() => onApplySlug(suggestions.slug)}
            >
              Terapkan slug
            </Button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-start gap-2 text-[11px]">
          <span className="text-muted-foreground">Meta description:</span>
          <p className="flex-1 min-w-48 font-mono">
            {metaField ? suggestions.meta || "—" : "—"}
          </p>
          {metaField && suggestions.meta ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-6 px-2 text-[11px]"
              onClick={() => onApplyMeta(suggestions.meta)}
            >
              Terapkan {metaField}
            </Button>
          ) : null}
        </div>
      </div>

      {/* Internal link */}
      {relatedContent.length > 0 ? (
        <div className="space-y-1 border-t pt-2">
          <p className="text-xs font-semibold">Saran internal link</p>
          <ul className="space-y-0.5">
            {relatedContent.map((item) => (
              <li key={item.href} className="text-[11px]">
                <Link href={item.href} className="underline underline-offset-2">
                  {item.title}
                </Link>
                <span className="text-muted-foreground">
                  {" "}
                  — frasa sama: {item.sharedTerms.join(", ")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="text-[10px] text-muted-foreground">
        Skor keyword dihitung dari frekuensi frasa di dalam konten ini, bukan dari data
        volume pencarian. Putuskan sendiri mana yang relevan sebelum menerapkan. Ambang
        yang dipakai di sini sama persis dengan yang dikirim ke bantuan AI, dan sudah
        disesuaikan dengan tipe konten: panjang isi, sub-judul, internal link, dan GEO
        hanya dinilai bila memang relevan untuk tipe ini.
      </p>
    </div>
  );
}