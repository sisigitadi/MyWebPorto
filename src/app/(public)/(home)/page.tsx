import Link from "next/link";
import {
  getProfile,
  getServices,
  getProjects,
  getProducts,
  getTestimonials,
  getArticles,
} from "@/lib/actions";
import { resolveProfileCards } from "@/lib/profile-cards-config";
import { OSDesktopManager } from "@/components/public/os/os-desktop-manager";
import { JsonLdSchema } from "@/components/public/json-ld";
import { resolveOSApps } from "@/lib/os-apps-config";
import { draftMode } from "next/headers";
import { canonicalBaseUrl } from "@/lib/canonical-host";

// Optimasi Vercel Free: cache 24 jam di CDN Edge; pembaruan konten ditangani
// on-demand oleh revalidatePath di src/lib/actions.ts saat admin mengedit data.
export const revalidate = 86400;

// Kanonik root: URL bersih tanpa query. Varian "?lang=" sengaja tidak
// diiklankan lagi (i18n 100% client-side → HTML-nya identik dengan kanonik;
// Google menandainya "Crawled - currently not indexed"). Lihat
// localeAlternates() di src/lib/seo.ts.
export const metadata = {
  title: {
    absolute: "Sigit Adi Portfolio",
  },
  alternates: {
    canonical: canonicalBaseUrl(),
  },
};

export default async function HomePage() {
  const { isEnabled: isPreview } = await draftMode();
  const [profile, profileCards, services, projects, products, testimonials, articles] = await Promise.all([
    getProfile(),
    resolveProfileCards({ preview: isPreview }),
    getServices(),
    getProjects(),
    getProducts(),
    getTestimonials(),
    getArticles(),
  ]);

  // Konfigurasi app SigitOS (settings.os_apps): app mana yang aktif + urutan.
  // Dijalankan paralel dengan fetch konten di atas; gagal/belum diatur jatuh
  // ke default 8 app (lihat resolveOSApps).
  const { enabled: appsConfig } = await resolveOSApps({ preview: isPreview });

  return (
    <div className="flex-1 flex-col h-full w-full overflow-hidden relative">
      <JsonLdSchema profile={profile} />

      {/* 
        Search Engine Optimization (SEO) & Web Accessibility (A11y) SSR Fallback
        Provides crawlable content and direct internal links for Googlebot, Bingbot, and assistive tech.
      */}
      <div className="sr-only" aria-label="Sitemap Konten & Ringkasan Portofolio">
        <header>
          {/* h1 = heading utama dokumen ini untuk aksesibilitas & crawler */}
          <h1>{profile.name} — {profile.headline}</h1>
          <p>{profile.bio}</p>
          <address>
            <p>Lokasi: {profile.location}</p>
            <p>Email: {profile.email}</p>
            <p>WhatsApp: {profile.phone}</p>
          </address>
        </header>
        <nav aria-label="Navigasi Akses Cepat Portofolio">
          <Link href="/proyek">Katalog Proyek Digital</Link>
          <Link href="/artikel">Artikel & Publikasi Teknik</Link>
          <Link href="/toko">Produk & Template Digital</Link>
        </nav>
      </div>

      {/* True Single-Page Retro Desktop Window Manager */}
      <OSDesktopManager
        profile={profile}
        profileCards={profileCards}
        services={services}
        projects={projects}
        products={products}
        testimonials={testimonials}
        articles={articles}
        appsConfig={appsConfig}
      />
    </div>
  );
}
