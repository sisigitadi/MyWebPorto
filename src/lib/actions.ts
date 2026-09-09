"use server";

import fs from "node:fs";
import path from "node:path";
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
  type ProfileData,
} from "@/lib/dummy-data";
import { translateText } from "@/lib/translate";

// ==========================================
// PERSISTENT LOCAL FILE STORE (OFFLINE & BACKUP)
// ==========================================
const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "local-store.json");

interface LocalStoreData {
  profile: ProfileData;
  projects: ProjectData[];
  services: ServiceData[];
  products: ProductData[];
  testimonials: TestimonialData[];
}

function ensureStoreExists(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      const initialData: LocalStoreData = {
        profile: DUMMY_PROFILE,
        projects: DUMMY_PROJECTS,
        services: DUMMY_SERVICES,
        products: DUMMY_PRODUCTS,
        testimonials: DUMMY_TESTIMONIALS,
      };
      fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2), "utf-8");
    }
  } catch (err) {
    console.error("Gagal inisialisasi local store:", err);
  }
}

function getLocalStore(): LocalStoreData | null {
  try {
    ensureStoreExists();
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      return JSON.parse(raw) as LocalStoreData;
    }
  } catch (err) {
    console.error("Gagal membaca local store:", err);
  }
  return null;
}

function updateLocalStore<K extends keyof LocalStoreData>(key: K, data: LocalStoreData[K]): void {
  try {
    ensureStoreExists();
    const store = getLocalStore() || {
      profile: DUMMY_PROFILE,
      projects: DUMMY_PROJECTS,
      services: DUMMY_SERVICES,
      products: DUMMY_PRODUCTS,
      testimonials: DUMMY_TESTIMONIALS,
    };
    store[key] = data;
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), "utf-8");
  } catch (err) {
    console.error("Gagal menyimpan local store:", err);
  }
}

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
export async function getProfile(): Promise<ProfileData> {
  const store = getLocalStore();
  const baseProfile = (store?.profile as ProfileData) || DUMMY_PROFILE;

  if (!isDbConnected) return baseProfile;
  try {
    const res = await db.query.profiles.findFirst({
      where: eq(schema.profiles.id, "owner"),
    });
    if (!res) return baseProfile;
    return {
      ...baseProfile,
      ...res,
      headlineEn: res.headlineEn || baseProfile.headlineEn,
      bioEn: res.bioEn || baseProfile.bioEn,
      avatarUrl: res.avatarUrl || baseProfile.avatarUrl,
      phone: res.phone || baseProfile.phone,
      location: res.location || baseProfile.location,
      availableForHire: res.availableForHire ?? baseProfile.availableForHire,
      skills: (res.skills as string[])?.length ? (res.skills as string[]) : baseProfile.skills,
      stats: (res.stats as typeof DUMMY_PROFILE.stats)?.length
        ? (res.stats as typeof DUMMY_PROFILE.stats)
        : baseProfile.stats,
      socialLinks: (res.socialLinks as typeof DUMMY_PROFILE.socialLinks) || baseProfile.socialLinks,
    };
  } catch (error) {
    console.error("Database query getProfile gagal, menggunakan data lokal:", error);
    return baseProfile;
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

  const payload: ProfileData = {
    ...DUMMY_PROFILE,
    ...parsed.data,
    id: "owner",
    headlineEn: headlineEn || null,
    bioEn: bioEn || null,
  };

  // Simpan secara persisten ke disk lokal dan memori
  Object.assign(DUMMY_PROFILE, payload);
  updateLocalStore("profile", payload);

  if (isDbConnected) {
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
    } catch (error: unknown) {
      console.warn("Sinkronisasi database updateProfile gagal, tersimpan di lokal:", error);
    }
  }

  revalidatePath("/", "layout");
  revalidatePath("/admin", "layout");
  revalidatePath("/admin/profile");
  return { success: true, message: "Profil berhasil disimpan!" };
}

// ==========================================
// PROYEK SERVER ACTIONS
// ==========================================
export async function getProjects(): Promise<ProjectData[]> {
  const store = getLocalStore();
  const baseProjects = (store?.projects as ProjectData[]) || DUMMY_PROJECTS;

  if (!isDbConnected) return baseProjects;
  try {
    const list = await db.query.projects.findMany({
      orderBy: [asc(schema.projects.order), desc(schema.projects.createdAt)],
    });
    if (!list || list.length === 0) return baseProjects;
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
    console.error("Database query getProjects gagal, menggunakan data lokal:", error);
    return baseProjects;
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

  const rawData = data as Record<string, unknown>;
  const customSummary = typeof rawData?.summary === "string" && rawData.summary.trim() ? rawData.summary.trim() : null;
  const customSummaryEn = typeof rawData?.summaryEn === "string" && rawData.summaryEn.trim() ? rawData.summaryEn.trim() : null;

  const summaryId =
    customSummary ||
    projectData.description.slice(0, 120) + (projectData.description.length > 120 ? "..." : "");
  const summaryEn =
    customSummaryEn ||
    (projectData.descriptionEn
      ? projectData.descriptionEn.slice(0, 120) + (projectData.descriptionEn.length > 120 ? "..." : "")
      : null);

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

  // Simpan secara persisten ke berkas lokal
  const store = getLocalStore();
  const currentList = (store?.projects as ProjectData[]) || [...DUMMY_PROJECTS];
  const existingIdx = currentList.findIndex((p) => p.id === targetId || (id && p.id === id));
  if (existingIdx >= 0) {
    currentList[existingIdx] = {
      ...currentList[existingIdx],
      ...dummyItem,
      id: currentList[existingIdx].id,
    };
  } else {
    currentList.unshift(dummyItem);
  }
  updateLocalStore("projects", currentList);

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

  if (isDbConnected) {
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
    } catch (error: unknown) {
      console.warn("Sinkronisasi database saveProject gagal, tersimpan di lokal:", error);
    }
  }

  revalidatePath("/", "layout");
  revalidatePath("/proyek", "layout");
  revalidatePath("/admin/projects");
  return { success: true, message: "Proyek berhasil disimpan!" };
}

export async function deleteProject(id: string) {
  const store = getLocalStore();
  if (store?.projects) {
    const updated = (store.projects as ProjectData[]).filter((p) => p.id !== id);
    updateLocalStore("projects", updated);
  }

  const dummyIdx = DUMMY_PROJECTS.findIndex((p) => p.id === id);
  if (dummyIdx >= 0) {
    DUMMY_PROJECTS.splice(dummyIdx, 1);
  }

  if (isDbConnected) {
    try {
      await db.delete(schema.projects).where(eq(schema.projects.id, id));
    } catch (error: unknown) {
      console.warn("Sinkronisasi database deleteProject gagal:", error);
    }
  }

  revalidatePath("/", "layout");
  revalidatePath("/proyek", "layout");
  revalidatePath("/admin/projects");
  return { success: true, message: "Proyek berhasil dihapus!" };
}

// ==========================================
// LAYANAN SERVER ACTIONS
// ==========================================
export async function getServices(): Promise<ServiceData[]> {
  const store = getLocalStore();
  const baseServices = (store?.services as ServiceData[]) || DUMMY_SERVICES;

  if (!isDbConnected) return baseServices;
  try {
    const list = await db.query.services.findMany({
      orderBy: [asc(schema.services.order)],
    });
    if (!list || list.length === 0) return baseServices;
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
    console.error("Database query getServices gagal, menggunakan data lokal:", error);
    return baseServices;
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

  // Simpan ke disk lokal
  const store = getLocalStore();
  const currentList = (store?.services as ServiceData[]) || [...DUMMY_SERVICES];
  const existingIdx = currentList.findIndex((s) => s.id === targetId || (id && s.id === id));
  if (existingIdx >= 0) {
    currentList[existingIdx] = {
      ...currentList[existingIdx],
      ...dummyItem,
      id: currentList[existingIdx].id,
    };
  } else {
    currentList.push(dummyItem);
  }
  updateLocalStore("services", currentList);

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

  if (isDbConnected) {
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
    } catch (error: unknown) {
      console.warn("Sinkronisasi database saveService gagal, tersimpan di lokal:", error);
    }
  }

  revalidatePath("/", "layout");
  revalidatePath("/admin", "layout");
  revalidatePath("/admin/services");
  return { success: true, message: "Layanan berhasil disimpan!" };
}

export async function deleteService(id: string) {
  const store = getLocalStore();
  if (store?.services) {
    const updated = (store.services as ServiceData[]).filter((s) => s.id !== id);
    updateLocalStore("services", updated);
  }

  const dummyIdx = DUMMY_SERVICES.findIndex((s) => s.id === id);
  if (dummyIdx >= 0) {
    DUMMY_SERVICES.splice(dummyIdx, 1);
  }

  if (isDbConnected) {
    try {
      await db.delete(schema.services).where(eq(schema.services.id, id));
    } catch (error: unknown) {
      console.warn("Sinkronisasi database deleteService gagal:", error);
    }
  }

  revalidatePath("/", "layout");
  revalidatePath("/admin", "layout");
  revalidatePath("/admin/services");
  return { success: true, message: "Layanan berhasil dihapus!" };
}

// ==========================================
// PRODUK SERVER ACTIONS
// ==========================================
export async function getProducts(): Promise<ProductData[]> {
  const store = getLocalStore();
  const baseProducts = (store?.products as ProductData[]) || DUMMY_PRODUCTS;

  if (!isDbConnected) return baseProducts;
  try {
    const list = await db.query.products.findMany({
      orderBy: [asc(schema.products.order)],
    });
    if (!list || list.length === 0) return baseProducts;
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
    console.error("Database query getProducts gagal, menggunakan data lokal:", error);
    return baseProducts;
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

  // Simpan ke disk lokal
  const store = getLocalStore();
  const currentList = (store?.products as ProductData[]) || [...DUMMY_PRODUCTS];
  const existingIdx = currentList.findIndex((p) => p.id === targetId || (id && p.id === id));
  if (existingIdx >= 0) {
    currentList[existingIdx] = {
      ...currentList[existingIdx],
      ...dummyItem,
      id: currentList[existingIdx].id,
    };
  } else {
    currentList.push(dummyItem);
  }
  updateLocalStore("products", currentList);

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

  if (isDbConnected) {
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
    } catch (error: unknown) {
      console.warn("Sinkronisasi database saveProduct gagal, tersimpan di lokal:", error);
    }
  }

  revalidatePath("/", "layout");
  revalidatePath("/admin", "layout");
  revalidatePath("/admin/products");
  return { success: true, message: "Produk berhasil disimpan!" };
}

export async function deleteProduct(id: string) {
  const store = getLocalStore();
  if (store?.products) {
    const updated = (store.products as ProductData[]).filter((p) => p.id !== id);
    updateLocalStore("products", updated);
  }

  const dummyIdx = DUMMY_PRODUCTS.findIndex((p) => p.id === id);
  if (dummyIdx >= 0) {
    DUMMY_PRODUCTS.splice(dummyIdx, 1);
  }

  if (isDbConnected) {
    try {
      await db.delete(schema.products).where(eq(schema.products.id, id));
    } catch (error: unknown) {
      console.warn("Sinkronisasi database deleteProduct gagal:", error);
    }
  }

  revalidatePath("/", "layout");
  revalidatePath("/admin", "layout");
  revalidatePath("/admin/products");
  return { success: true, message: "Produk berhasil dihapus!" };
}

// ==========================================
// TESTIMONI SERVER ACTIONS
// ==========================================
export async function getTestimonials(): Promise<TestimonialData[]> {
  const store = getLocalStore();
  const baseTestimonials = (store?.testimonials as TestimonialData[]) || DUMMY_TESTIMONIALS;

  if (!isDbConnected) return baseTestimonials;
  try {
    const list = await db.query.testimonials.findMany({
      orderBy: [asc(schema.testimonials.order)],
    });
    if (!list || list.length === 0) return baseTestimonials;
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
    console.error("Database query getTestimonials gagal, menggunakan data lokal:", error);
    return baseTestimonials;
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

  // Simpan ke disk lokal
  const store = getLocalStore();
  const currentList = (store?.testimonials as TestimonialData[]) || [...DUMMY_TESTIMONIALS];
  const existingIdx = currentList.findIndex((t) => t.id === targetId || (id && t.id === id));
  if (existingIdx >= 0) {
    currentList[existingIdx] = {
      ...currentList[existingIdx],
      ...dummyItem,
      id: currentList[existingIdx].id,
    };
  } else {
    currentList.push(dummyItem);
  }
  updateLocalStore("testimonials", currentList);

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

  if (isDbConnected) {
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
    } catch (error: unknown) {
      console.warn("Sinkronisasi database saveTestimonial gagal, tersimpan di lokal:", error);
    }
  }

  revalidatePath("/", "layout");
  revalidatePath("/admin", "layout");
  revalidatePath("/admin/testimonials");
  return { success: true, message: "Testimoni berhasil disimpan!" };
}

export async function deleteTestimonial(id: string) {
  const store = getLocalStore();
  if (store?.testimonials) {
    const updated = (store.testimonials as TestimonialData[]).filter((p) => p.id !== id);
    updateLocalStore("testimonials", updated);
  }

  const dummyIdx = DUMMY_TESTIMONIALS.findIndex((p) => p.id === id);
  if (dummyIdx >= 0) {
    DUMMY_TESTIMONIALS.splice(dummyIdx, 1);
  }

  if (isDbConnected) {
    try {
      await db.delete(schema.testimonials).where(eq(schema.testimonials.id, id));
    } catch (error: unknown) {
      console.warn("Sinkronisasi database deleteTestimonial gagal:", error);
    }
  }

  revalidatePath("/", "layout");
  revalidatePath("/admin", "layout");
  revalidatePath("/admin/testimonials");
  return { success: true, message: "Testimoni berhasil dihapus!" };
}
