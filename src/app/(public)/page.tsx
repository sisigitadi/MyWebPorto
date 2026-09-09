import {
  getProfile,
  getServices,
  getProjects,
  getProducts,
  getTestimonials,
} from "@/lib/actions";
import { HeroSection } from "@/components/public/hero-section";
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
      {/* 1. Hero & Profil Utama */}
      <HeroSection profile={profile} />

      {/* 2. Layanan & Keahlian */}
      <ServicesSection services={services} profile={profile} />

      {/* 3. Proyek Unggulan Terpilih */}
      <FeaturedProjectsSection projects={projects} />

      {/* 4. Katalog Produk Digital */}
      <ProductsSection products={products} />

      {/* 5. Testimoni Klien */}
      <TestimonialsSection testimonials={testimonials} />

      {/* 6. Kontak & Diskusi */}
      <ContactSection profile={profile} />
    </div>
  );
}
