"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  CheckCircle2,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  Save,
  Send,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { saveSeoConfigAction } from "@/lib/actions";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { ImageUpload } from "@/components/admin/image-upload";
import type { AdminSeoView } from "@/lib/seo-config";

interface SeoConfigFormProps {
  /** Config efektif yang sudah di-mask di server (token tidak pernah mentah). */
  initial: AdminSeoView;
  /** Profil pemilik — dipakai fallback pratinjau Open Graph. */
  profile: { name: string; headline?: string | null; bio?: string | null };
  /** Base URL absolut situs (NEXT_PUBLIC_APP_URL). */
  baseUrl: string;
  /** URL file verifikasi IndexNow (/{key}.txt) — bukan rahasia, dilayani dinamis. */
  indexNowKeyFileUrl: string;
}

/** Batas penyimpanan vs. batas disarankan (optimasi CTR di feed sosial). */
const OG_TITLE_MAX = 100;
const OG_DESC_MAX = 300;
const OG_TITLE_IDEAL = 60;
const OG_DESC_IDEAL = 155;

function lengthHint(value: number, ideal: number, max: number): string {
  if (value <= ideal) return "text-emerald-600";
  if (value <= max) return "text-amber-600";
  return "text-destructive";
}

/**
 * Form SEO/SEM untuk /admin/seo.
 *
 * Tiga bagian: (1) token verifikasi Google Search Console & Bing Webmaster,
 * (2) key IndexNow + ping manual, (3) override Open Graph + pratinjau kartu
 * sosial. Semua disimpan ke tabel settings (key "seo") lewat server action
 * berauth — tidak ada redeploy.
 *
 * Konvensi sama dengan cloud-ai-config-form: field token kosong saat submit =
 * "pertahankan yang sudah ada" (token di-mask, admin tidak perlu mengetik
 * ulang); field OG kosong = "kembali ke default profil".
 */
export function SeoConfigForm({ initial, profile, baseUrl, indexNowKeyFileUrl }: SeoConfigFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Field token: sengaja dimulai kosong — input hanya untuk nilai BARU.
  const [googleToken, setGoogleToken] = useState("");
  const [bingToken, setBingToken] = useState("");
  const [indexNowKey, setIndexNowKey] = useState("");

  // Field OG: dimulai dari nilai efektif (boleh dikosongkan = default profil).
  const [ogTitle, setOgTitle] = useState(initial.ogTitle);
  const [ogDescription, setOgDescription] = useState(initial.ogDescription);
  const [ogImageUrl, setOgImageUrl] = useState(initial.ogImageUrl);
  const [ogImageAlt, setOgImageAlt] = useState(initial.ogImageAlt);
  const [error, setError] = useState("");

  // Cache-buster pratinjau gambar OG dinamis (dinaikkan setelah simpan).
  const [ogPreviewKey, setOgPreviewKey] = useState(0);

  // Status ping IndexNow manual.
  const [ping, setPing] = useState<{
    loading: boolean;
    result: { submittedCount?: number; status?: number; urls?: string[] } | null;
    error: string;
  }>({ loading: false, result: null, error: "" });

  useUnsavedChanges(
    "seo-config",
    JSON.stringify({ googleToken, bingToken, indexNowKey, ogTitle, ogDescription, ogImageUrl, ogImageAlt })
  );

  const ogTitlePreview =
    ogTitle || `${profile.name} — ${profile.headline || "Web Developer"}`;
  const ogDescPreview = ogDescription || profile.bio || "";
  const ogImagePreview = ogImageUrl || `${baseUrl}/opengraph-image?t=${ogPreviewKey}`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const res = await saveSeoConfigAction({
        googleVerification: googleToken,
        bingVerification: bingToken,
        indexNowKey,
        ogTitle,
        ogDescription,
        ogImageUrl,
        ogImageAlt,
      });
      if (res.ok) {
        // Token input dikosongkan lagi (one-shot); OG tetap.
        setGoogleToken("");
        setBingToken("");
        setIndexNowKey("");
        setOgPreviewKey((k) => k + 1);
        toast.success("Pengaturan SEO/SEM disimpan", {
          description: "Meta verifikasi, IndexNow, dan Open Graph langsung aktif.",
        });
        router.refresh();
      } else {
        setError(res.error);
        toast.error("Gagal menyimpan", { description: res.error });
      }
    });
  }

  async function handlePingIndexNow() {
    setPing({ loading: true, result: null, error: "" });
    try {
      const res = await fetch("/api/indexnow", {
        method: "POST",
        credentials: "same-origin",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPing({ loading: false, result: data, error: "" });
        toast.success("Ping IndexNow terkirim", {
          description: `${data.submittedCount ?? 0} URL disubmit (status ${data.status ?? "?"}).`,
        });
      } else {
        const msg = data.error || data.message || `IndexNow merespons ${res.status}`;
        setPing({ loading: false, result: null, error: msg });
        toast.error("Ping IndexNow gagal", { description: msg });
      }
    } catch {
      setPing({
        loading: false,
        result: null,
        error: "Tidak dapat terhubung ke /api/indexnow.",
      });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ==================================================
          1. Verifikasi search engine (GSC + Bing Webmaster)
         ================================================== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BadgeCheck className="h-4 w-4 text-primary" /> Verifikasi Search Engine
          </CardTitle>
          <CardDescription className="flex items-center flex-wrap gap-1">
            Token bukti kepemilikan untuk Google Search Console &amp; Bing Webmaster —
            dipasang sebagai <code className="font-mono">google-site-verification</code> dan{" "}
            <code className="font-mono">msvalidate.01</code>. Sumber saat ini:
            <Badge variant="secondary" className="ml-0.5">
              {initial.source === "admin" ? "admin" : initial.source === "env" ? "env" : "default"}
            </Badge>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="seo-google">Token Google Search Console</Label>
              {initial.hasGoogle ? (
                <Badge className="bg-emerald-600 text-white border-0 gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Terpasang
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" /> Belum terpasang
                </Badge>
              )}
            </div>
            <Input
              id="seo-google"
              value={googleToken}
              onChange={(e) => setGoogleToken(e.target.value)}
              placeholder={
                initial.googleVerification
                  ? `Terpasang: ${initial.googleVerification}`
                  : "Tempel token dari Google Search Console"
              }
              spellCheck={false}
              className="font-mono text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              Google Search Console → properti → Pengaturan → Verifikasi kepemilikan →{" "}
              <strong>Tag HTML</strong> → salin nilai atribut <code>content</code>. Kosongkan
              field untuk mempertahankan token yang ada.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="seo-bing">Token Bing Webmaster (msvalidate.01)</Label>
              {initial.hasBing ? (
                <Badge className="bg-emerald-600 text-white border-0 gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Terpasang
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" /> Belum terpasang
                </Badge>
              )}
            </div>
            <Input
              id="seo-bing"
              value={bingToken}
              onChange={(e) => setBingToken(e.target.value)}
              placeholder={
                initial.bingVerification
                  ? `Terpasang: ${initial.bingVerification}`
                  : "Tempel token dari Bing Webmaster Tools"
              }
              spellCheck={false}
              className="font-mono text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              Bing Webmaster Tools → situs → Verifikasi &amp; validasi →{" "}
              <strong>Tag meta verifikasi Bing</strong> → salin nilai <code>content</code>.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" asChild className="text-xs h-8 gap-1.5">
              <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" /> Buka Google Search Console
              </a>
            </Button>
            <Button type="button" variant="outline" size="sm" asChild className="text-xs h-8 gap-1.5">
              <a href="https://www.bing.com/webmasters" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" /> Buka Bing Webmaster Tools
              </a>
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground border-l-2 border-border pl-3">
            Metode file statis juga sudah aktif (public/google*.html &amp; public/BingSiteAuth.xml) —
            kedua console menerima meta tag ATAU file, jadi verifikasi tetap valid.
          </p>
        </CardContent>
      </Card>

      {/* ==================================================
          2. IndexNow — pengindeksan instan Bing/Yandex/Seznam
         ================================================== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Send className="h-4 w-4 text-primary" /> IndexNow — Pengindeksan Instan
          </CardTitle>
          <CardDescription>
            Memberi tahu Bing, Yandex, &amp; Seznam setiap URL berubah — biasanya terindeks
            dalam hitungan detik. Ping otomatis sudah dikirim setiap kali proyek/artikel
            disimpan atau dihapus; tombol di bawah untuk ping manual semua URL.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="seo-indexnow">Key IndexNow</Label>
              {initial.hasIndexNowKey ? (
                <Badge className="bg-emerald-600 text-white border-0 gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Aktif {initial.indexNowKey}
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" /> Belum dikonfigurasi
                </Badge>
              )}
            </div>
            <Input
              id="seo-indexnow"
              value={indexNowKey}
              onChange={(e) => setIndexNowKey(e.target.value)}
              placeholder={
                initial.indexNowKey
                  ? `Terpasang: ${initial.indexNowKey}`
                  : "Tempel key IndexNow (16–128 karakter)"
              }
              spellCheck={false}
              className="font-mono text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              Buat key di indexnow.org, tempel di sini, lalu simpan. File verifikasi{" "}
              <code className="break-all">{indexNowKeyFileUrl || "/&lt;key&gt;.txt"}</code>{" "}
              dilayani otomatis — rotasi key langsung efektif tanpa redeploy. Kosongkan
              untuk mempertahankan key yang ada.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePingIndexNow}
              disabled={ping.loading || !initial.hasIndexNowKey}
              className="text-xs h-8 gap-1.5"
            >
              {ping.loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              Ping semua URL sekarang
            </Button>
            {!initial.hasIndexNowKey && (
              <span className="text-[11px] text-muted-foreground">
                Isi key IndexNow dulu untuk mengaktifkan ping.
              </span>
            )}
          </div>

          {ping.result && (
            <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-3 text-xs space-y-1">
              <p className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> Ping terkirim
              </p>
              <p className="text-muted-foreground">
                {ping.result.submittedCount ?? 0} URL disubmit · IndexNow merespons HTTP{" "}
                {ping.result.status ?? "?"}.
              </p>
              {ping.result.urls && ping.result.urls.length > 0 && (
                <p className="font-mono text-[10px] text-muted-foreground truncate">
                  {ping.result.urls.slice(0, 3).join(" · ")}
                  {ping.result.urls.length > 3
                    ? ` +${ping.result.urls.length - 3} lainnya`
                    : ""}
                </p>
              )}
            </div>
          )}
          {ping.error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs">
              <p className="font-semibold text-destructive">{ping.error}</p>
              <p className="text-muted-foreground mt-0.5">
                Endpoint dibatasi 5 panggilan per menit per IP (lihat api/indexnow/route.ts).
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ==================================================
          3. Open Graph — override & pratinjau sosial
         ================================================== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ImageIcon className="h-4 w-4 text-primary" /> Open Graph &amp; Pratinjau Sosial
          </CardTitle>
          <CardDescription>
            Override judul / deskripsi / gambar saat link situs dibagikan. Kosongkan field
            untuk kembali ke default (dari profil pemilik). Ukuran optimal 1200×630.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="og-title">Judul Open Graph</Label>
              <Input
                id="og-title"
                value={ogTitle}
                onChange={(e) => setOgTitle(e.target.value)}
                placeholder={`Default: ${profile.name} — ${profile.headline || "Web Developer"}`}
                maxLength={OG_TITLE_MAX}
              />
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] text-muted-foreground">
                  Disarankan ≤ {OG_TITLE_IDEAL} karakter (lebih panjang terpotong di feed).
                </p>
                <span className={`text-[10px] font-mono shrink-0 ${lengthHint(ogTitle.length, OG_TITLE_IDEAL, OG_TITLE_MAX)}`}>
                  {ogTitle.length}/{OG_TITLE_MAX}
                </span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="og-alt">Alt Text Gambar</Label>
              <Input
                id="og-alt"
                value={ogImageAlt}
                onChange={(e) => setOgImageAlt(e.target.value)}
                placeholder={`Default: ${profile.name} — Portofolio`}
                maxLength={200}
              />
              <p className="text-[11px] text-muted-foreground">
                Aksesibilitas (screen reader) &amp; konteks crawler gambar.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="og-desc">Deskripsi Open Graph</Label>
            <Textarea
              id="og-desc"
              value={ogDescription}
              onChange={(e) => setOgDescription(e.target.value)}
              placeholder="Default: bio profil pemilik"
              rows={3}
              maxLength={OG_DESC_MAX}
            />
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] text-muted-foreground">
                Disarankan ≤ {OG_DESC_IDEAL} karakter agar tidak terpotong.
              </p>
              <span className={`text-[10px] font-mono shrink-0 ${lengthHint(ogDescription.length, OG_DESC_IDEAL, OG_DESC_MAX)}`}>
                {ogDescription.length}/{OG_DESC_MAX}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Gambar Open Graph</Label>
            <ImageUpload
              value={ogImageUrl}
              onChange={setOgImageUrl}
              label="Unggah Gambar OG (1200×630)"
            />
            <p className="text-[11px] text-muted-foreground">
              Kosongkan untuk memakai gambar dinamis yang dibangkitkan dari profil —
              judul &amp; deskripsinya selalu mengikuti field di atas.
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <p className="text-xs font-semibold">Gambar OG aktual (dibangkitkan dinamis)</p>
            <div className="rounded-md overflow-hidden border border-border bg-muted/30 max-w-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ogImagePreview} alt="Pratinjau Open Graph" className="w-full h-auto block" />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Render {ogImageUrl ? "gambar unggahan" : "/opengraph-image"} · diperbarui setelah
              Simpan (browser mungkin meng-cache sebentar).
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <p className="text-xs font-semibold">Pratinjau kartu sosial (Facebook / X / LinkedIn)</p>
            <div className="rounded-md overflow-hidden border border-border max-w-md bg-background">
              <div className="aspect-[1200/630] bg-muted/30 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ogImagePreview} alt="" className="w-full h-full object-cover block" />
              </div>
              <div className="p-3 space-y-1">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground truncate">
                  {baseUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                </p>
                <p className="text-sm font-semibold leading-snug line-clamp-2">{ogTitlePreview}</p>
                {ogDescPreview && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{ogDescPreview}</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-xs text-destructive font-medium">{error}</p>}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Simpan Pengaturan SEO/SEM
        </Button>
        <span className="text-[11px] text-muted-foreground">
          Token verifikasi, key IndexNow, dan meta Open Graph langsung aktif untuk
          seluruh halaman publik — tanpa redeploy.
        </span>
      </div>
    </form>
  );
}
