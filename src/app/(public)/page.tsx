import Link from "next/link";
import {
  getProfile,
  getServices,
  getProjects,
  getProducts,
  getTestimonials,
  getArticles,
} from "@/lib/actions";
import { OSDesktopManager } from "@/components/public/os/os-desktop-manager";
import { JsonLdSchema } from "@/components/public/json-ld";

export const revalidate = 60;

export default async function HomePage() {
  const [profile, services, projects, products, testimonials, articles] = await Promise.all([
    getProfile(),
    getServices(),
    getProjects(),
    getProducts(),
    getTestimonials(),
    getArticles(),
  ]);

  const publishedProjects = projects.filter((p) => p.published);
  const publishedArticles = articles.filter((a) => a.published);

  return (
    <div className="flex-1 flex flex-col h-full w-full overflow-hidden relative">
      <JsonLdSchema profile={profile} />

      {/* 
        Search Engine Optimization (SEO) & Web Accessibility (A11y) SSR Fallback
        Provides crawlable content and direct internal links for Googlebot, Bingbot, and assistive tech.
      */}
      <div className="sr-only" aria-label="Sitemap Konten & Ringkasan Portofolio">
        <header>
          <h2>{profile.name} — {profile.headline}</h2>
          <p>{profile.bio}</p>
          <address>
            <p>Lokasi: {profile.location}</p>
            <p>Email: {profile.email}</p>
            <p>WhatsApp: {profile.phone}</p>
          </address>
        </header>

        <section aria-labelledby="seo-services-heading">
          <h2 id="seo-services-heading">Layanan Pengembangan Web & AI</h2>
          <ul>
            {services.map((service) => (
              <li key={service.id}>
                <h3>{service.title}</h3>
                <p>{service.description}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="seo-projects-heading">
          <h2 id="seo-projects-heading">Katalog Proyek & Portofolio Karya Digital</h2>
          <nav aria-label="Navigasi Proyek">
            <Link href="/proyek">Lihat Seluruh Katalog Proyek</Link>
            <ul>
              {publishedProjects.map((project) => (
                <li key={project.id}>
                  <h3>
                    <Link href={`/proyek/${project.slug}`}>{project.title}</Link>
                  </h3>
                  <p>{project.summary}</p>
                  <p>Tech Stack: {project.techStack?.join(", ")}</p>
                </li>
              ))}
            </ul>
          </nav>
        </section>

        <section aria-labelledby="seo-articles-heading">
          <h2 id="seo-articles-heading">Artikel & Wawasan Teknologi Software Engineering</h2>
          <nav aria-label="Navigasi Artikel">
            <Link href="/artikel">Lihat Seluruh Artikel & Publikasi</Link>
            <ul>
              {publishedArticles.map((article) => (
                <li key={article.id}>
                  <h3>
                    <Link href={`/artikel/${article.slug}`}>{article.title}</Link>
                  </h3>
                  <p>{article.summary}</p>
                </li>
              ))}
            </ul>
          </nav>
        </section>

        <section aria-labelledby="seo-testimonials-heading">
          <h2 id="seo-testimonials-heading">Testimoni Klien & Rekan Kolaborator</h2>
          <ul>
            {testimonials.map((t) => (
              <li key={t.id}>
                <blockquote>{t.content}</blockquote>
                <cite>{t.clientName} — {t.clientRole}</cite>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* True Single-Page Retro Desktop Window Manager */}
      <OSDesktopManager
        profile={profile}
        services={services}
        projects={projects}
        products={products}
        testimonials={testimonials}
        articles={articles}
      />
    </div>
  );
}
