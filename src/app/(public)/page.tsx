import {
  getProfile,
  getServices,
  getProjects,
  getProducts,
  getTestimonials,
} from "@/lib/actions";
import { OSDesktopManager } from "@/components/public/os/os-desktop-manager";
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
    <div className="flex-1 flex flex-col h-full w-full overflow-hidden">
      <JsonLdSchema profile={profile} />
      {/* True Single-Page Retro Desktop Window Manager */}
      <OSDesktopManager
        profile={profile}
        services={services}
        projects={projects}
        products={products}
        testimonials={testimonials}
      />
    </div>
  );
}
