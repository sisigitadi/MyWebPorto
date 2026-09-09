"use server";

import { revalidatePath } from "next/cache";
import { asc, desc, eq } from "drizzle-orm";
import { db, isDbConnected } from "@/db";
import * as schema from "@/db/schema";
import {
  ProfileSchema,
  ProjectSchema,
  ServiceSchema,
  ProductSchema,
  TestimonialSchema,
} from "@/lib/validations";
import {
  DUMMY_PROFILE,
  DUMMY_PROJECTS,
  DUMMY_SERVICES,
  DUMMY_PRODUCTS,
  DUMMY_TESTIMONIALS,
  type ProjectData,
  type ServiceData,
  type ProductData,
  type TestimonialData,
} from "@/lib/dummy-data";
import { translateText } from "@/lib/translate";

// ==========================================
// TRANSLATE HELPER ACTION
// ==========================================
export async function translateFieldAction(
  text: string,
  from: string = "id",
  to: string = "en"
) {
  if (!text || !text.trim()) return { success: true, text: "" };
  try {
    const translated = await translateText(text, from, to);
    return { success: true, text: translated };
  } catch (err) {
    return {
      success: false,
      text,
      error: err instanceof Error ? err.message : "Gagal menerjemahkan teks",
    };
  }
}

// ==========================================
// PROFIL SERVER ACTIONS
// ==========================================
export async function getProfile() {
  if (!isDbConnected) return DUMMY_PROFILE;
  try {
    const res = await db.query.profiles.findFirst({
      where: eq(schema.profiles.id, "owner"),
    });
    if (!res) return DUMMY_PROFILE;
    return {
      ...DUMMY_PROFILE,
      ...res,
      headlineEn: res.headlineEn || DUMMY_PROFILE.headlineEn,
      bioEn: res.bioEn || DUMMY_PROFILE.bioEn,
      avatarUrl: res.avatarUrl || DUMMY_PROFILE.avatarUrl,
      phone: res.phone || DUMMY_PROFILE.phone,
      location: res.location || DUMMY_PROFILE.location,
      availableForHire: res.availableForHire ?? DUMMY_PROFILE.availableForHire,
      skills: (res.skills as string[])?.length ? (res.skills as string[]) : DUMMY_PROFILE.skills,
      stats: (res.stats as typeof DUMMY_PROFILE.stats)?.length
        ? (res.stats as typeof DUMMY_PROFILE.stats)
        : DUMMY_PROFILE.stats,
      socialLinks: (res.socialLinks as typeof DUMMY_PROFILE.socialLinks) || DUMMY_PROFILE.socialLinks,
    };
  } catch (error) {
    console.error("Error getProfile:", error);
    return DUMMY_PROFILE;
  }
}

export async function updateProfile(data: unknown) {
  const parsed = ProfileSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Validasi profil gagal" };
  }

  // Auto-translate EN jika dibiarkan kosong
  let headlineEn = parsed.data.headlineEn?.trim();
  if (!headlineEn && parsed.data.headline) {
    headlineEn = await translateText(parsed.data.headline, "id", "en");
  }

  let bioEn = parsed.data.bioEn?.trim();
  if (!bioEn && parsed.data.bio) {
    bioEn = await translateText(parsed.data.bio, "id", "en");
  }

  const payload = {
    ...parsed.data,
    headlineEn: headlineEn || null,
    bioEn: bioEn || null,
  };

  // Selalu perbarui memory fallback (dummy data) agar perubahan langsung terlihat
  Object.assign(DUMMY_PROFILE, payload);

  if (!isDbConnected) {
    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/admin/profile");
    return {
      success: true,
      message: "Profil diperbarui (mode offline preview).",
    };
  }

  try {
    await db
      .insert(schema.profiles)
      .values({
        id: "owner",
        ...payload,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: schema.profiles.id,
        set: {
          ...payload,
          updatedAt: new Date(),
        },
      });

    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/admin/profile");
    return { success: true, message: "Profil berhasil disimpan ke database!" };
  } catch (error: unknown) {
    console.error("Error updateProfile:", error);
    return { success: false, error: error instanceof Error ? error.message : "Gagal memperbarui profil" };
  }
}

// ==========================================
// PROYEK SERVER ACTIONS
// ==========================================
export async function getProjects() {
  if (!isDbConnected) return DUMMY_PROJECTS;
  try {
    const list = await db.query.projects.findMany({
      orderBy: [asc(schema.projects.order), desc(schema.projects.createdAt)],
    });
    if (!list || list.length === 0) return DUMMY_PROJECTS;
    return list.map((p) => {
      const summaryId = p.description.slice(0, 120) + (p.description.length > 120 ? "..." : "");
      const summaryEn = p.descriptionEn
        ? p.descriptionEn.slice(0, 120) + (p.descriptionEn.length > 120 ? "..." : "")
        : null;

      return {
        id: p.id,
        title: p.title,
        titleEn: p.titleEn || null,
        slug: p.slug,
        summary: summaryId,
        summaryEn: summaryEn,
        description: p.description,
        descriptionEn: p.descriptionEn || null,
        thumbnailUrl: p.imageUrl?.trim() || "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?q=80&w=800&auto=format&fit=crop",
        techStack: (p.techStacks as string[]) || [],
        demoUrl: p.demoUrl || undefined,
        repoUrl: p.repoUrl || undefined,
        featured: p.featured,
        published: p.published,
        createdAt: p.createdAt.toISOString().split("T")[0],
      };
    });
  } catch (error) {
    console.error("Error getProjects:", error);
    return DUMMY_PROJECTS;
  }
}

export async function saveProject(data: unknown) {
  const parsed = ProjectSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Validasi proyek gagal" };
  }

  // Auto-translate EN jika kosong
  let titleEn = parsed.data.titleEn?.trim();
  if (!titleEn && parsed.data.title) {
    titleEn = await translateText(parsed.data.title, "id", "en");
  }

  let descriptionEn = parsed.data.descriptionEn?.trim();
  if (!descriptionEn && parsed.data.description) {
    descriptionEn = await translateText(parsed.data.description, "id", "en");
  }

  const { id, ...rest } = parsed.data;
  const projectData = {
    ...rest,
    titleEn: titleEn || null,
    descriptionEn: descriptionEn || null,
  };

  // Selalu sinkronkan data ke memori DUMMY_PROJECTS
  const summaryId = projectData.description.slice(0, 120) + (projectData.description.length > 120 ? "..." : "");
  const summaryEn = projectData.descriptionEn
    ? projectData.descriptionEn.slice(0, 120) + (projectData.descriptionEn.length > 120 ? "..." : "")
    : null;

  const targetId = id || `proj-${Date.now()}`;
  const dummyItem: ProjectData = {
    id: targetId,
    title: projectData.title,
    titleEn: projectData.titleEn,
    slug: projectData.slug,
    summary: summaryId,
    summaryEn: summaryEn,
    description: projectData.description,
    descriptionEn: projectData.descriptionEn,
    thumbnailUrl: projectData.imageUrl?.trim() || "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?q=80&w=800&auto=format&fit=crop",
    techStack: projectData.techStacks || [],
    demoUrl: projectData.demoUrl || null,
    repoUrl: projectData.repoUrl || null,
    featured: projectData.featured ?? false,
    published: projectData.published ?? true,
    createdAt: new Date().toISOString().split("T")[0],
  };

  const existingDummyIdx = DUMMY_PROJECTS.findIndex((p) => p.id === id);
  if (existingDummyIdx >= 0) {
    DUMMY_PROJECTS[existingDummyIdx] = {
      ...DUMMY_PROJECTS[existingDummyIdx],
      ...dummyItem,
      id: DUMMY_PROJECTS[existingDummyIdx].id,
    };
  } else {
    DUMMY_PROJECTS.unshift(dummyItem);
  }

  if (!isDbConnected) {
    revalidatePath("/");
    revalidatePath("/proyek");
    revalidatePath("/admin/projects");
    return { success: true, message: "Proyek berhasil disimpan (mode offline preview)." };
  }

  try {
    if (id) {
      const existing = await db.query.projects.findFirst({
        where: eq(schema.projects.id, id),
      });

      if (existing) {
        await db
          .update(schema.projects)
          .set({
            ...projectData,
            imageUrl: projectData.imageUrl,
            techStacks: projectData.techStacks,
            updatedAt: new Date(),
          })
          .where(eq(schema.projects.id, id));
      } else {
        // Jika row belum ada di DB (misal dari dummy data), lakukan insert dengan ID ini
        await db.insert(schema.projects).values({
          id,
          ...projectData,
          imageUrl: projectData.imageUrl,
          techStacks: projectData.techStacks,
        });
      }
    } else {
      await db.insert(schema.projects).values({
        ...projectData,
        imageUrl: projectData.imageUrl,
        techStacks: projectData.techStacks,
      });
    }

    revalidatePath("/");
    revalidatePath("/proyek");
    revalidatePath("/admin/projects");
    return { success: true, message: "Proyek berhasil disimpan!" };
  } catch (error: unknown) {
    console.error("Error saveProject:", error);
    return { success: false, error: error instanceof Error ? error.message : "Gagal menyimpan proyek" };
  }
}

export async function deleteProject(id: string) {
  const dummyIdx = DUMMY_PROJECTS.findIndex((p) => p.id === id);
  if (dummyIdx >= 0) {
    DUMMY_PROJECTS.splice(dummyIdx, 1);
  }

  if (!isDbConnected) {
    revalidatePath("/");
    revalidatePath("/proyek");
    revalidatePath("/admin/projects");
    return { success: true, message: "Proyek berhasil dihapus (mode offline preview)." };
  }
  try {
    await db.delete(schema.projects).where(eq(schema.projects.id, id));
    revalidatePath("/");
    revalidatePath("/proyek");
    revalidatePath("/admin/projects");
    return { success: true, message: "Proyek berhasil dihapus!" };
  } catch (error: unknown) {
    console.error("Error deleteProject:", error);
    return { success: false, error: error instanceof Error ? error.message : "Gagal menghapus proyek" };
  }
}

// ==========================================
// LAYANAN SERVER ACTIONS
// ==========================================
export async function getServices() {
  if (!isDbConnected) return DUMMY_SERVICES;
  try {
    const list = await db.query.services.findMany({
      orderBy: [asc(schema.services.order)],
    });
    if (!list || list.length === 0) return DUMMY_SERVICES;
    return list.map((s) => ({
      id: s.id,
      order: s.order,
      title: s.title,
      titleEn: s.titleEn || null,
      description: s.description,
      descriptionEn: s.descriptionEn || null,
      published: s.published,
    }));
  } catch (error) {
    console.error("Error getServices:", error);
    return DUMMY_SERVICES;
  }
}

export async function saveService(data: unknown) {
  const parsed = ServiceSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Validasi layanan gagal" };
  }

  // Auto-translate EN jika kosong
  let titleEn = parsed.data.titleEn?.trim();
  if (!titleEn && parsed.data.title) {
    titleEn = await translateText(parsed.data.title, "id", "en");
  }

  let descriptionEn = parsed.data.descriptionEn?.trim();
  if (!descriptionEn && parsed.data.description) {
    descriptionEn = await translateText(parsed.data.description, "id", "en");
  }

  const { id, ...rest } = parsed.data;
  const serviceData = {
    ...rest,
    titleEn: titleEn || null,
    descriptionEn: descriptionEn || null,
  };

  const targetId = id || `serv-${Date.now()}`;
  const dummyItem: ServiceData = {
    id: targetId,
    order: serviceData.order ?? 1,
    title: serviceData.title,
    titleEn: serviceData.titleEn,
    description: serviceData.description,
    descriptionEn: serviceData.descriptionEn,
    published: serviceData.published ?? true,
  };

  const existingDummyIdx = DUMMY_SERVICES.findIndex((s) => s.id === id);
  if (existingDummyIdx >= 0) {
    DUMMY_SERVICES[existingDummyIdx] = {
      ...DUMMY_SERVICES[existingDummyIdx],
      ...dummyItem,
      id: DUMMY_SERVICES[existingDummyIdx].id,
    };
  } else {
    DUMMY_SERVICES.push(dummyItem);
  }

  if (!isDbConnected) {
    revalidatePath("/");
    revalidatePath("/admin/services");
    return { success: true, message: "Layanan berhasil disimpan (mode offline)." };
  }

  try {
    if (id) {
      const existing = await db.query.services.findFirst({
        where: eq(schema.services.id, id),
      });

      if (existing) {
        await db
          .update(schema.services)
          .set({ ...serviceData, updatedAt: new Date() })
          .where(eq(schema.services.id, id));
      } else {
        await db.insert(schema.services).values({
          id,
          ...serviceData,
        });
      }
    } else {
      await db.insert(schema.services).values(serviceData);
    }

    revalidatePath("/");
    revalidatePath("/admin/services");
    return { success: true, message: "Layanan berhasil disimpan!" };
  } catch (error: unknown) {
    console.error("Error saveService:", error);
    return { success: false, error: error instanceof Error ? error.message : "Gagal menyimpan layanan" };
  }
}

export async function deleteService(id: string) {
  const dummyIdx = DUMMY_SERVICES.findIndex((s) => s.id === id);
  if (dummyIdx >= 0) {
    DUMMY_SERVICES.splice(dummyIdx, 1);
  }

  if (!isDbConnected) {
    revalidatePath("/");
    revalidatePath("/admin/services");
    return { success: true, message: "Layanan dihapus (mode offline)." };
  }
  try {
    await db.delete(schema.services).where(eq(schema.services.id, id));
    revalidatePath("/");
    revalidatePath("/admin/services");
    return { success: true, message: "Layanan berhasil dihapus!" };
  } catch (error: unknown) {
    console.error("Error deleteService:", error);
    return { success: false, error: error instanceof Error ? error.message : "Gagal menghapus layanan" };
  }
}

// ==========================================
// PRODUK SERVER ACTIONS
// ==========================================
export async function getProducts() {
  if (!isDbConnected) return DUMMY_PRODUCTS;
  try {
    const list = await db.query.products.findMany({
      orderBy: [asc(schema.products.order)],
    });
    if (!list || list.length === 0) return DUMMY_PRODUCTS;
    return list.map((p) => ({
      id: p.id,
      title: p.title,
      titleEn: p.titleEn || null,
      description: p.description,
      descriptionEn: p.descriptionEn || null,
      priceFormatted: p.priceLabel || "Gratis / Diskusi",
      thumbnailUrl: p.imageUrl?.trim() || "https://images.unsplash.com/photo-1517842645767-c639042777db?q=80&w=600&auto=format&fit=crop",
      ctaUrl: "#kontak",
      published: p.published,
    }));
  } catch (error) {
    console.error("Error getProducts:", error);
    return DUMMY_PRODUCTS;
  }
}

export async function saveProduct(data: unknown) {
  const parsed = ProductSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Validasi produk gagal" };
  }

  // Auto-translate EN jika kosong
  let titleEn = parsed.data.titleEn?.trim();
  if (!titleEn && parsed.data.title) {
    titleEn = await translateText(parsed.data.title, "id", "en");
  }

  let descriptionEn = parsed.data.descriptionEn?.trim();
  if (!descriptionEn && parsed.data.description) {
    descriptionEn = await translateText(parsed.data.description, "id", "en");
  }

  const { id, ...rest } = parsed.data;
  const productData = {
    ...rest,
    titleEn: titleEn || null,
    descriptionEn: descriptionEn || null,
  };

  const targetId = id || `prod-${Date.now()}`;
  const dummyItem: ProductData = {
    id: targetId,
    title: productData.title,
    titleEn: productData.titleEn,
    description: productData.description,
    descriptionEn: productData.descriptionEn,
    priceFormatted: productData.priceLabel || "Gratis / Diskusi",
    thumbnailUrl: productData.imageUrl?.trim() || "https://images.unsplash.com/photo-1517842645767-c639042777db?q=80&w=600&auto=format&fit=crop",
    ctaUrl: "#kontak",
    published: productData.published ?? true,
  };

  const existingDummyIdx = DUMMY_PRODUCTS.findIndex((p) => p.id === id);
  if (existingDummyIdx >= 0) {
    DUMMY_PRODUCTS[existingDummyIdx] = {
      ...DUMMY_PRODUCTS[existingDummyIdx],
      ...dummyItem,
      id: DUMMY_PRODUCTS[existingDummyIdx].id,
    };
  } else {
    DUMMY_PRODUCTS.push(dummyItem);
  }

  if (!isDbConnected) {
    revalidatePath("/");
    revalidatePath("/admin/products");
    return { success: true, message: "Produk berhasil disimpan (mode offline)." };
  }

  try {
    if (id) {
      const existing = await db.query.products.findFirst({
        where: eq(schema.products.id, id),
      });

      if (existing) {
        await db
          .update(schema.products)
          .set({ ...productData, updatedAt: new Date() })
          .where(eq(schema.products.id, id));
      } else {
        await db.insert(schema.products).values({
          id,
          ...productData,
        });
      }
    } else {
      await db.insert(schema.products).values(productData);
    }

    revalidatePath("/");
    revalidatePath("/admin/products");
    return { success: true, message: "Produk berhasil disimpan!" };
  } catch (error: unknown) {
    console.error("Error saveProduct:", error);
    return { success: false, error: error instanceof Error ? error.message : "Gagal menyimpan produk" };
  }
}

export async function deleteProduct(id: string) {
  const dummyIdx = DUMMY_PRODUCTS.findIndex((p) => p.id === id);
  if (dummyIdx >= 0) {
    DUMMY_PRODUCTS.splice(dummyIdx, 1);
  }

  if (!isDbConnected) {
    revalidatePath("/");
    revalidatePath("/admin/products");
    return { success: true, message: "Produk dihapus (mode offline)." };
  }
  try {
    await db.delete(schema.products).where(eq(schema.products.id, id));
    revalidatePath("/");
    revalidatePath("/admin/products");
    return { success: true, message: "Produk berhasil dihapus!" };
  } catch (error: unknown) {
    console.error("Error deleteProduct:", error);
    return { success: false, error: error instanceof Error ? error.message : "Gagal menghapus produk" };
  }
}

// ==========================================
// TESTIMONI SERVER ACTIONS
// ==========================================
export async function getTestimonials() {
  if (!isDbConnected) return DUMMY_TESTIMONIALS;
  try {
    const list = await db.query.testimonials.findMany({
      orderBy: [asc(schema.testimonials.order)],
    });
    if (!list || list.length === 0) return DUMMY_TESTIMONIALS;
    return list.map((t) => ({
      id: t.id,
      clientName: t.clientName,
      clientRole: t.clientRole || "Klien",
      clientRoleEn: t.clientRoleEn || null,
      content: t.content,
      contentEn: t.contentEn || null,
      avatarUrl: t.avatarUrl?.trim() || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=300&auto=format&fit=crop",
      rating: 5,
      published: t.published,
    }));
  } catch (error) {
    console.error("Error getTestimonials:", error);
    return DUMMY_TESTIMONIALS;
  }
}

export async function saveTestimonial(data: unknown) {
  const parsed = TestimonialSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Validasi testimoni gagal" };
  }

  // Auto-translate EN jika kosong
  let contentEn = parsed.data.contentEn?.trim();
  if (!contentEn && parsed.data.content) {
    contentEn = await translateText(parsed.data.content, "id", "en");
  }

  let clientRoleEn = parsed.data.clientRoleEn?.trim();
  if (!clientRoleEn && parsed.data.clientRole) {
    clientRoleEn = await translateText(parsed.data.clientRole, "id", "en");
  }

  const { id, ...rest } = parsed.data;
  const testimonialData = {
    ...rest,
    contentEn: contentEn || null,
    clientRoleEn: clientRoleEn || null,
  };

  const targetId = id || `testi-${Date.now()}`;
  const dummyItem: TestimonialData = {
    id: targetId,
    clientName: testimonialData.clientName,
    clientRole: testimonialData.clientRole || "Klien",
    clientRoleEn: testimonialData.clientRoleEn || null,
    content: testimonialData.content,
    contentEn: testimonialData.contentEn || null,
    avatarUrl: testimonialData.avatarUrl?.trim() || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=300&auto=format&fit=crop",
    rating: 5,
    published: testimonialData.published ?? true,
  };

  const existingDummyIdx = DUMMY_TESTIMONIALS.findIndex((t) => t.id === id);
  if (existingDummyIdx >= 0) {
    DUMMY_TESTIMONIALS[existingDummyIdx] = {
      ...DUMMY_TESTIMONIALS[existingDummyIdx],
      ...dummyItem,
      id: DUMMY_TESTIMONIALS[existingDummyIdx].id,
    };
  } else {
    DUMMY_TESTIMONIALS.push(dummyItem);
  }

  if (!isDbConnected) {
    revalidatePath("/");
    revalidatePath("/admin/testimonials");
    return { success: true, message: "Testimoni berhasil disimpan (mode offline)." };
  }

  try {
    if (id) {
      const existing = await db.query.testimonials.findFirst({
        where: eq(schema.testimonials.id, id),
      });

      if (existing) {
        await db
          .update(schema.testimonials)
          .set({ ...testimonialData, updatedAt: new Date() })
          .where(eq(schema.testimonials.id, id));
      } else {
        await db.insert(schema.testimonials).values({
          id,
          ...testimonialData,
        });
      }
    } else {
      await db.insert(schema.testimonials).values(testimonialData);
    }

    revalidatePath("/");
    revalidatePath("/admin/testimonials");
    return { success: true, message: "Testimoni berhasil disimpan!" };
  } catch (error: unknown) {
    console.error("Error saveTestimonial:", error);
    return { success: false, error: error instanceof Error ? error.message : "Gagal menyimpan testimoni" };
  }
}

export async function deleteTestimonial(id: string) {
  const dummyIdx = DUMMY_TESTIMONIALS.findIndex((p) => p.id === id);
  if (dummyIdx >= 0) {
    DUMMY_TESTIMONIALS.splice(dummyIdx, 1);
  }

  if (!isDbConnected) {
    revalidatePath("/");
    revalidatePath("/admin/testimonials");
    return { success: true, message: "Testimoni dihapus (mode offline)." };
  }
  try {
    await db.delete(schema.testimonials).where(eq(schema.testimonials.id, id));
    revalidatePath("/");
    revalidatePath("/admin/testimonials");
    return { success: true, message: "Testimoni berhasil dihapus!" };
  } catch (error: unknown) {
    console.error("Error deleteTestimonial:", error);
    return { success: false, error: error instanceof Error ? error.message : "Gagal menghapus testimoni" };
  }
}
