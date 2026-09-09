import {
  getProfile,
  getServices,
  getProjects,
  getProducts,
  getTestimonials,
} from "@/lib/actions";
import { HeroSection } from "@/components/public/hero-section";
import { OSMarquee } from "@/components/public/os/os-marquee";
import { ServicesSection } from "@/components/public/services-section";
import { FeaturedProjectsSection } from "@/components/public/featured-projects-section";
import { ProductsSection } from "@/components/public/products-section";
import { TestimonialsSection } from "@/components/public/testimonials-section";
import { ContactSection } from "@/components/public/contact-section";
import { JsonLdSchema } from "@/components/public/json-ld";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  const [profile, services, projects, products, testimonials] = await Promise.all([
    getProfile(),
    getServices(),
    getProjects(),
    getProducts(),
    getTestimonials(),
  ]);

  return (
    <div className="flex flex-col min-h-screen">
      <JsonLdSchema profile={profile} />
      {/* 1. Hero & Profil Utama (Sigit_Profile.exe + Monitor_CRT.sys) */}
      <HeroSection profile={profile} />

      {/* 2. Dual-Track Retro Pixel Marquee Ticker */}
      <OSMarquee />

      {/* 3. Layanan & Keahlian (Module Windows) */}
      <ServicesSection services={services} profile={profile} />

      {/* 4. Proyek Unggulan Terpilih (Project Explorer) */}
      <FeaturedProjectsSection projects={projects} />

      {/* 5. Katalog Produk Digital (Software Vault) */}
      <ProductsSection products={products} />

      {/* 6. Testimoni Klien (Feedback Logs) */}
      <TestimonialsSection testimonials={testimonials} />

      {/* 7. Kontak & Diskusi (Sigit_Mailer.exe) */}
      <ContactSection profile={profile} />
    </div>
  );
}
