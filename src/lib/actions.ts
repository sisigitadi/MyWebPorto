"use server";

import fs from "fs";
import path from "path";
import { revalidatePath } from "next/cache";
import { asc, desc, eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { db, isDbConnected } from "@/db";
import * as schema from "@/db/schema";
import {
  ProfileSchema,
  ProjectSchema,
  ServiceSchema,
  ProductSchema,
  TestimonialSchema,
  ArticleSchema,
} from "@/lib/validations";
import {
  DUMMY_PROFILE,
  DUMMY_PROJECTS,
  DUMMY_SERVICES,
  DUMMY_PRODUCTS,
  DUMMY_TESTIMONIALS,
  DUMMY_ARTICLES,
  type ProjectData,
  type ServiceData,
  type ProductData,
  type TestimonialData,
  type ArticleData,
  type ProfileData,
} from "@/lib/dummy-data";
import { translateText, isExternalTranslateEnabled } from "@/lib/translate";
import { getProductSlug, slugifyProduct } from "@/lib/product-link";
import { sanitizeError } from "@/lib/error-utils";
import { logAudit } from "@/lib/audit";

/**
 * Verifikasi apakah request mutasi berasal dari Admin yang terotentikasi.
 * Mencegah Broken Access Control (OWASP A01) pada Server Actions.
 */
export async function verifyAdmin(): Promise<void> {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (publishableKey && !publishableKey.includes("xxxx")) {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Akses ditolak: Anda harus login sebagai admin untuk melakukan tindakan ini.");
    }
    const adminClerkId = process.env.ADMIN_CLERK_ID;
    if (adminClerkId && adminClerkId !== "user_xxxxxxxxxxxxxxxxx" && userId !== adminClerkId) {
      throw new Error("Akses ditolak: Akun Anda bukan administrator website ini.");
    }
  }
}

// ==========================================
// PERSISTENT LOCAL FILE STORE (OFFLINE & BACKUP)
// ==========================================
// Di Vercel serverless, direktori root bersifat read-only sehingga gunakan /tmp
const isVercel = Boolean(process.env.VERCEL);
const DATA_DIR = isVercel
  ? path.join("/tmp", "my-web-porto-data")
  : path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "local-store.json");

interface LocalStoreData {
  profile: ProfileData;
  projects: ProjectData[];
  services: ServiceData[];
  products: ProductData[];
  testimonials: TestimonialData[];
  articles: ArticleData[];
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
        articles: DUMMY_ARTICLES,
      };
      fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2), "utf-8");
    }
  } catch (err) {
    console.warn("Inisialisasi local store dilewati (lingkungan read-only):", err);
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
    console.warn("Gagal membaca local store:", err);
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
      articles: DUMMY_ARTICLES,
    };
    store[key] = data;
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), "utf-8");
  } catch (err) {
    console.warn("Gagal menulis ke local store:", err);
  }
}

// ==========================================
// SLUG UNIQUENESS GUARD
// ==========================================
// Slug adalah kunci URL publik (/proyek/[slug], /artikel/[slug], /toko/[slug]).
// Dua entri dengan slug sama membuat salah satunya tidak bisa diakses sama sekali,
// dan di mode database memicu unique-constraint violation yang membingungkan.
type SlugEntity = "projects" | "articles" | "products";

interface SlugCandidate {
  id: string;
  slug?: string | null;
  title?: string;
}

function localSlugCandidates(entity: SlugEntity): SlugCandidate[] {
  const store = getLocalStore();
  if (entity === "projects") return (store?.projects as ProjectData[]) || DUMMY_PROJECTS;
  if (entity === "articles") return (store?.articles as ArticleData[]) || DUMMY_ARTICLES;
  return (store?.products as ProductData[]) || DUMMY_PRODUCTS;
}

async function dbSlugCandidates(entity: SlugEntity): Promise<SlugCandidate[]> {
  if (entity === "projects") {
    return db.select({ id: schema.projects.id, slug: schema.projects.slug }).from(schema.projects);
  }
  if (entity === "articles") {
    return db.select({ id: schema.articles.id, slug: schema.articles.slug }).from(schema.articles);
  }
  return db
    .select({ id: schema.products.id, slug: schema.products.slug, title: schema.products.title })
    .from(schema.products);
}

/**
 * Cek bentrok slug melawan local store DAN database (bila tersambung), karena
 * keduanya bisa menjadi sumber data yang dilihat admin. Produk dibandingkan
 * lewat slug efektifnya, sebab URL toko memakai slug turunan judul saat slug
 * eksplisit kosong.
 */
async function findSlugConflict(
  entity: SlugEntity,
  candidateSlug: string,
  ownId?: string
): Promise<"local store" | "database" | null> {
  const normalize = (value?: string | null) => (value || "").trim().toLowerCase();
  const slugOf = (item: SlugCandidate) =>
    entity === "products"
      ? normalize(getProductSlug({ id: item.id, title: item.title || "", slug: item.slug }))
      : normalize(item.slug);

  const wanted = normalize(candidateSlug);
  if (!wanted) return null;

  const conflictLocally = localSlugCandidates(entity).some(
    (item) => item.id !== ownId && slugOf(item) === wanted
  );
  if (conflictLocally) return "local store";

  if (!isDbConnected) return null;

  try {
    const rows = await dbSlugCandidates(entity);
    const conflictInDb = rows.some((item) => item.id !== ownId && slugOf(item) === wanted);
    return conflictInDb ? "database" : null;
  } catch (err) {
    // Tabel mungkin belum dimigrasi — jangan blokir penyimpanan, biarkan alur
    // sinkronisasi database yang melaporkan masalahnya.
    console.warn(`Pengecekan keunikan slug ${entity} di database dilewati:`, err);
    return null;
  }
}

function slugConflictMessage(entity: SlugEntity, slug: string, source: string): string {
  const path = entity === "projects" ? "proyek" : entity === "articles" ? "artikel" : "toko";
  return `Slug "${slug}" sudah dipakai entri lain (terdeteksi di ${source}). Pilih slug lain agar URL /${path}/${slug} tidak saling menimpa.`;
}

// ==========================================
// TRANSLATE HELPER ACTION
// ==========================================
export async function translateFieldAction(
  text: string,
  from: string = "id",
  to: string = "en"
) {
  try {
    await verifyAdmin();
  } catch (authErr: unknown) {
    return {
      success: false,
      text,
      error: sanitizeError(authErr),
    };
  }

  if (!isExternalTranslateEnabled()) {
    return {
      success: false,
      text,
      error:
        "Terjemahan otomatis dinonaktifkan (ENABLE_EXTERNAL_TRANSLATE=false). Isi kolom English secara manual.",
    };
  }

  if (!text || !text.trim()) return { success: true, text: "" };
  try {
    const translated = await translateText(text, from, to);
    return { success: true, text: translated };
  } catch (err) {
    console.error("Auto-translate gagal:", err);
    return {
      success: false,
      text,
      error: "Gagal menerjemahkan teks. Periksa log server untuk detail teknis.",
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
    if (!res) {
      try {
        const cleanDefault = {
          id: "owner",
          name: "Sigit",
          headline: "Web Developer & Systems Architect",
          headlineEn: "Web Developer & Systems Architect",
          bio: "Membangun sistem web, antarmuka interaktif berperforma tinggi, dan solusi digital yang cepat, aman, dan memukau.",
          bioEn: "Building high-performance web systems, interactive interfaces, and robust digital solutions.",
          avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=600&auto=format&fit=crop",
          email: "x@sigitadi.id",
          phone: "6281234567890",
          location: "Indonesia",
          availableForHire: true,
          skills: [
            "Next.js 15",
            "React 19",
            "TypeScript",
            "Tailwind CSS",
            "Drizzle ORM",
            "PostgreSQL",
            "GSAP Animation",
            "System Architecture",
          ],
          stats: [
            { label: "Tahun Pengalaman", labelEn: "Years Experience", value: "4+" },
            { label: "Proyek Selesai", labelEn: "Projects Done", value: "25+" },
            { label: "Kepuasan Klien", labelEn: "Client Rating", value: "100%" },
          ],
          socialLinks: {
            github: "https://github.com/sisigitadi",
            linkedin: "https://www.linkedin.com/in/sigitadi/",
            portfolio: "https://porto.sigitadi.id/",
          },
        };
        await db.insert(schema.profiles).values(cleanDefault).onConflictDoNothing();
      } catch (seedErr) {
        console.warn("Auto-seed profil awal dilewati (tabel mungkin belum ada):", seedErr);
      }
      return baseProfile;
    }
    // DB adalah source of truth untuk socialLinks — jangan merge dengan dummy/base
    // agar field yang sengaja dihapus (instagram/whatsapp) tidak muncul kembali
    const rawSocialLinks = res.socialLinks as typeof DUMMY_PROFILE.socialLinks | null | undefined;
    let cleanSocialLinks: typeof DUMMY_PROFILE.socialLinks = {};
    if (rawSocialLinks && typeof rawSocialLinks === "object") {
      cleanSocialLinks = { ...rawSocialLinks };
      (Object.keys(cleanSocialLinks) as Array<keyof typeof cleanSocialLinks>).forEach((k) => {
        if (!cleanSocialLinks[k]) delete cleanSocialLinks[k];
      });
    }

    return {
      ...baseProfile,
      ...res,
      // Gunakan nullish check agar string kosong "" (sengaja dihapus) tidak fallback ke dummy
      headlineEn: res.headlineEn?.trim() ? res.headlineEn : baseProfile.headlineEn,
      bioEn: res.bioEn?.trim() ? res.bioEn : baseProfile.bioEn,
      avatarUrl: res.avatarUrl?.trim() ? res.avatarUrl : baseProfile.avatarUrl,
      phone: res.phone ?? baseProfile.phone,
      location: res.location ?? baseProfile.location,
      availableForHire: res.availableForHire ?? baseProfile.availableForHire,
      skills: (res.skills as string[])?.length ? (res.skills as string[]) : baseProfile.skills,
      stats: (res.stats as typeof DUMMY_PROFILE.stats)?.length
        ? (res.stats as typeof DUMMY_PROFILE.stats)
        : baseProfile.stats,
      socialLinks: cleanSocialLinks,
    };
  } catch (error) {
    console.warn("Database query getProfile gagal, menggunakan data lokal:", error);
    return baseProfile;
  }
}

export async function updateProfile(data: unknown) {
  try {
    await verifyAdmin();
  } catch (authErr: unknown) {
    return {
      success: false,
      error: sanitizeError(authErr),
    };
  }

  const parsed = ProfileSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Validasi profil gagal" };
  }

  // Field English dipakai apa adanya. Tidak ada terjemahan otomatis saat simpan:
  // penerjemahan mengirim teks ke layanan pihak ketiga (lihat src/lib/translate.ts)
  // dan hanya dijalankan bila admin menekan tombol "Terjemahkan (ID → EN)".
  const headlineEn = parsed.data.headlineEn?.trim() || null;
  const bioEn = parsed.data.bioEn?.trim() || null;

  // Bersihkan socialLinks: hapus field yang kosong/null agar tidak tersimpan di DB
  const cleanSocialLinks = { ...parsed.data.socialLinks };
  (Object.keys(cleanSocialLinks) as Array<keyof typeof cleanSocialLinks>).forEach((k) => {
    if (!cleanSocialLinks[k]) delete cleanSocialLinks[k];
  });

  const payload: ProfileData = {
    ...DUMMY_PROFILE,
    ...parsed.data,
    id: "owner",
    headlineEn: headlineEn || null,
    bioEn: bioEn || null,
    socialLinks: cleanSocialLinks,
  };

  // Simpan secara persisten ke disk lokal dan memori
  updateLocalStore("profile", payload);

  if (isDbConnected) {
    try {
      await db
        .insert(schema.profiles)
        .values({
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
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("Sinkronisasi database updateProfile gagal:", errMsg);
      if (errMsg.includes("does not exist") || errMsg.includes("relation")) {
        return {
          success: false,
          error: "Tabel 'profiles' belum dibuat di Neon PostgreSQL. Harap jalankan 'npm run db:push' di terminal Anda terlebih dahulu.",
        };
      }
      return {
        success: false,
        error: "Gagal menyimpan profil ke database. Periksa log server untuk detail teknis.",
      };
    }
  }

  void logAudit({ action: "save", entity: "profile", entityId: "owner", detail: payload.name });
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
    if (!list || list.length === 0) {
      try {
        for (let i = 0; i < DUMMY_PROJECTS.length; i++) {
          const p = DUMMY_PROJECTS[i];
          await db
            .insert(schema.projects)
            .values({
              id: p.id,
              slug: p.slug,
              title: p.title,
              titleEn: p.titleEn || null,
              summary: p.summary,
              summaryEn: p.summaryEn || null,
              description: p.description,
              descriptionEn: p.descriptionEn || null,
              imageUrl: p.thumbnailUrl,
              demoUrl: p.demoUrl || null,
              repoUrl: p.repoUrl || null,
              techStacks: p.techStack,
              featured: p.featured,
              published: p.published,
              order: i + 1,
            })
            .onConflictDoNothing();
        }
      } catch (seedErr) {
        console.warn("Auto-seed projects dilewati:", seedErr);
      }
      return baseProjects;
    }
    return list.map((p) => {
      const summaryId =
        (p.summary && p.summary.trim()) ||
        p.description.slice(0, 120) + (p.description.length > 120 ? "..." : "");
      const summaryEn =
        (p.summaryEn && p.summaryEn.trim()) ||
        (p.descriptionEn
          ? p.descriptionEn.slice(0, 120) + (p.descriptionEn.length > 120 ? "..." : "")
          : null);

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
        published: p.published ?? true,
        createdAt: p.createdAt ? p.createdAt.toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      };
    });
  } catch (error) {
    console.warn("Database query getProjects gagal, menggunakan data lokal:", error);
    return baseProjects;
  }
}

export async function saveProject(data: unknown) {
  try {
    await verifyAdmin();
  } catch (authErr: unknown) {
    return {
      success: false,
      error: sanitizeError(authErr),
    };
  }

  const parsed = ProjectSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Validasi proyek gagal" };
  }

  // Jaga keunikan slug sebelum menulis apa pun ke local store maupun database.
  const projectSlugConflict = await findSlugConflict("projects", parsed.data.slug, parsed.data.id);
  if (projectSlugConflict) {
    return {
      success: false,
      error: slugConflictMessage("projects", parsed.data.slug, projectSlugConflict),
    };
  }

  // Field English dipakai apa adanya (tanpa terjemahan otomatis). Penerjemahan
  // hanya terjadi bila admin menekan tombol "Terjemahkan (ID → EN)".
  const titleEn = parsed.data.titleEn?.trim() || null;
  const descriptionEn = parsed.data.descriptionEn?.trim() || null;

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
              summary: summaryId,
              summaryEn: summaryEn,
              imageUrl: projectData.imageUrl,
              techStacks: projectData.techStacks,
              updatedAt: new Date(),
            })
            .where(eq(schema.projects.id, id));
        } else {
          await db.insert(schema.projects).values({
            id,
            ...projectData,
            summary: summaryId,
            summaryEn: summaryEn,
            imageUrl: projectData.imageUrl,
            techStacks: projectData.techStacks,
          });
        }
      } else {
        await db.insert(schema.projects).values({
          ...projectData,
          summary: summaryId,
          summaryEn: summaryEn,
          imageUrl: projectData.imageUrl,
          techStacks: projectData.techStacks,
        });
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("Sinkronisasi database saveProject gagal:", errMsg);
      if (errMsg.includes("does not exist") || errMsg.includes("relation")) {
        return {
          success: false,
          error: "Tabel 'projects' belum ada di Neon PostgreSQL. Harap jalankan 'npm run db:push' di terminal Anda.",
        };
      }
      return {
        success: false,
        error: "Gagal menyimpan proyek ke database. Periksa log server untuk detail teknis.",
      };
    }
  }

  void logAudit({ action: "save", entity: "projects", entityId: targetId, detail: dummyItem.title });
  revalidatePath("/", "layout");
  revalidatePath("/proyek", "layout");
  revalidatePath("/admin/projects");
  return { success: true, message: "Proyek berhasil disimpan!" };
}

export async function deleteProject(id: string) {
  try {
    await verifyAdmin();
  } catch (authErr: unknown) {
    return {
      success: false,
      error: sanitizeError(authErr),
    };
  }

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
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("Sinkronisasi database deleteProject gagal:", errMsg);
      return {
        success: false,
        error: "Gagal menghapus proyek dari database. Periksa log server untuk detail teknis.",
      };
    }
  }

  void logAudit({ action: "delete", entity: "projects", entityId: id });
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
    if (!list || list.length === 0) {
      try {
        for (const s of DUMMY_SERVICES) {
          await db
            .insert(schema.services)
            .values({
              id: s.id,
              title: s.title,
              titleEn: s.titleEn || null,
              description: s.description,
              descriptionEn: s.descriptionEn || null,
              order: s.order,
              published: s.published,
            })
            .onConflictDoNothing();
        }
      } catch (seedErr) {
        console.warn("Auto-seed services dilewati:", seedErr);
      }
      return baseServices;
    }
    return list.map((s) => ({
      id: s.id,
      order: s.order,
      title: s.title,
      titleEn: s.titleEn || null,
      description: s.description,
      descriptionEn: s.descriptionEn || null,
      published: s.published ?? true,
    }));
  } catch (error) {
    console.warn("Database query getServices gagal, menggunakan data lokal:", error);
    return baseServices;
  }
}

export async function saveService(data: unknown) {
  try {
    await verifyAdmin();
  } catch (authErr: unknown) {
    return {
      success: false,
      error: sanitizeError(authErr),
    };
  }

  const parsed = ServiceSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Validasi layanan gagal" };
  }

  // Field English dipakai apa adanya (tanpa terjemahan otomatis). Penerjemahan
  // hanya terjadi bila admin menekan tombol "Terjemahkan (ID → EN)".
  const titleEn = parsed.data.titleEn?.trim() || null;
  const descriptionEn = parsed.data.descriptionEn?.trim() || null;

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
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("Sinkronisasi database saveService gagal:", errMsg);
      if (errMsg.includes("does not exist") || errMsg.includes("relation")) {
        return {
          success: false,
          error: "Tabel 'services' belum ada di Neon PostgreSQL. Harap jalankan 'npm run db:push' di terminal Anda.",
        };
      }
      return {
        success: false,
        error: "Gagal menyimpan layanan ke database. Periksa log server untuk detail teknis.",
      };
    }
  }

  void logAudit({ action: "save", entity: "services", entityId: targetId, detail: serviceData.title });
  revalidatePath("/");
  revalidatePath("/", "layout");
  revalidatePath("/admin");
  revalidatePath("/admin", "layout");
  revalidatePath("/admin/services");
  return { success: true, message: "Layanan berhasil disimpan!" };
}

export async function deleteService(id: string) {
  try {
    await verifyAdmin();
  } catch (authErr: unknown) {
    return {
      success: false,
      error: sanitizeError(authErr),
    };
  }

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
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("Sinkronisasi database deleteService gagal:", errMsg);
      return {
        success: false,
        error: "Gagal menghapus layanan dari database. Periksa log server untuk detail teknis.",
      };
    }
  }

  void logAudit({ action: "delete", entity: "services", entityId: id });
  revalidatePath("/");
  revalidatePath("/", "layout");
  revalidatePath("/admin");
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
    if (!list || list.length === 0) {
      try {
        for (let i = 0; i < DUMMY_PRODUCTS.length; i++) {
          const pr = DUMMY_PRODUCTS[i];
          await db
            .insert(schema.products)
            .values({
              id: pr.id,
              slug: pr.slug || null,
              title: pr.title,
              titleEn: pr.titleEn || null,
              description: pr.description,
              descriptionEn: pr.descriptionEn || null,
              imageUrl: pr.thumbnailUrl,
              priceLabel: pr.priceFormatted,
              ctaUrl: pr.ctaUrl || null,
              published: pr.published,
              order: i + 1,
            })
            .onConflictDoNothing();
        }
      } catch (seedErr) {
        console.warn("Auto-seed products dilewati:", seedErr);
      }
      return baseProducts;
    }
    return list.map((p) => ({
      id: p.id,
      slug: p.slug || null,
      title: p.title,
      titleEn: p.titleEn || null,
      description: p.description,
      descriptionEn: p.descriptionEn || null,
      priceFormatted: p.priceLabel || "Gratis / Diskusi",
      thumbnailUrl: p.imageUrl?.trim() || "https://images.unsplash.com/photo-1517842645767-c639042777db?q=80&w=600&auto=format&fit=crop",
      ctaUrl: p.ctaUrl || "#kontak",
      published: p.published ?? true,
    }));
  } catch (error) {
    console.warn("Database query getProducts gagal, menggunakan data lokal:", error);
    return baseProducts;
  }
}

export async function saveProduct(data: unknown) {
  try {
    await verifyAdmin();
  } catch (authErr: unknown) {
    return {
      success: false,
      error: sanitizeError(authErr),
    };
  }

  const parsed = ProductSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Validasi produk gagal" };
  }

  // Produk boleh dibuat tanpa slug eksplisit; URL publik memakai slug turunan
  // judul, jadi yang dijaga keunikannya adalah slug efektif itu.
  const effectiveProductSlug = parsed.data.slug?.trim()
    ? slugifyProduct(parsed.data.slug)
    : slugifyProduct(parsed.data.title);
  const productSlugConflict = await findSlugConflict("products", effectiveProductSlug, parsed.data.id);
  if (productSlugConflict) {
    return {
      success: false,
      error: slugConflictMessage("products", effectiveProductSlug, productSlugConflict),
    };
  }

  // Field English dipakai apa adanya (tanpa terjemahan otomatis). Penerjemahan
  // hanya terjadi bila admin menekan tombol "Terjemahkan (ID → EN)".
  const titleEn = parsed.data.titleEn?.trim() || null;
  const descriptionEn = parsed.data.descriptionEn?.trim() || null;

  const { id, ...rest } = parsed.data;
  const productData = {
    ...rest,
    titleEn: titleEn || null,
    descriptionEn: descriptionEn || null,
  };

  const ctaUrl = parsed.data.ctaUrl?.trim() || null;
  const targetId = id || `prod-${Date.now()}`;
  const dummyItem: ProductData = {
    id: targetId,
    slug: productData.slug || null,
    title: productData.title,
    titleEn: productData.titleEn,
    description: productData.description,
    descriptionEn: productData.descriptionEn,
    priceFormatted: productData.priceLabel || "Gratis / Diskusi",
    thumbnailUrl: productData.imageUrl?.trim() || "https://images.unsplash.com/photo-1517842645767-c639042777db?q=80&w=600&auto=format&fit=crop",
    ctaUrl: ctaUrl || "#kontak",
    published: productData.published ?? true,
  };

  // Simpan ke disk lokal
  const store = getLocalStore();
  const currentList = (store?.products as ProductData[]) || [...DUMMY_PRODUCTS];
  const existingIdx = currentList.findIndex((p) => p.id === targetId || (id && p.id === id));
  const previousProduct = existingIdx >= 0 ? currentList[existingIdx] : null;
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
      const dbProductData = {
        ...productData,
        ctaUrl,
      };

      if (id) {
        const existing = await db.query.products.findFirst({
          where: eq(schema.products.id, id),
        });

        if (existing) {
          await db
            .update(schema.products)
            .set({ ...dbProductData, updatedAt: new Date() })
            .where(eq(schema.products.id, id));
        } else {
          await db.insert(schema.products).values({
            id,
            ...dbProductData,
          });
        }
      } else {
        await db.insert(schema.products).values(dbProductData);
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("Sinkronisasi database saveProduct gagal:", errMsg);
      if (errMsg.includes("does not exist") || errMsg.includes("relation")) {
        return {
          success: false,
          error: "Tabel 'products' belum ada di Neon PostgreSQL. Harap jalankan 'npm run db:push' di terminal Anda.",
        };
      }
      return {
        success: false,
        error: "Gagal menyimpan produk ke database. Periksa log server untuk detail teknis.",
      };
    }
  }

  void logAudit({ action: "save", entity: "products", entityId: targetId, detail: dummyItem.title });
  revalidatePath("/", "layout");
  revalidatePath("/toko", "layout");
  revalidatePath("/toko/[slug]", "page");
  if (previousProduct) revalidatePath(`/toko/${getProductSlug(previousProduct)}`);
  revalidatePath(`/toko/${getProductSlug(dummyItem)}`);
  revalidatePath("/admin", "layout");
  revalidatePath("/admin/products");
  return { success: true, message: "Produk berhasil disimpan!" };
}

export async function deleteProduct(id: string) {
  try {
    await verifyAdmin();
  } catch (authErr: unknown) {
    return {
      success: false,
      error: sanitizeError(authErr),
    };
  }

  const store = getLocalStore();
  const deletedProduct = (store?.products as ProductData[] | undefined)?.find((p) => p.id === id);
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
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("Sinkronisasi database deleteProduct gagal:", errMsg);
      return {
        success: false,
        error: "Gagal menghapus produk dari database. Periksa log server untuk detail teknis.",
      };
    }
  }

  void logAudit({ action: "delete", entity: "products", entityId: id, detail: deletedProduct?.title });
  revalidatePath("/", "layout");
  revalidatePath("/toko", "layout");
  revalidatePath("/toko/[slug]", "page");
  if (deletedProduct) revalidatePath(`/toko/${getProductSlug(deletedProduct)}`);
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
    if (!list || list.length === 0) {
      try {
        for (let i = 0; i < DUMMY_TESTIMONIALS.length; i++) {
          const t = DUMMY_TESTIMONIALS[i];
          await db
            .insert(schema.testimonials)
            .values({
              id: t.id,
              clientName: t.clientName,
              clientRole: t.clientRole,
              clientRoleEn: t.clientRoleEn || null,
              content: t.content,
              contentEn: t.contentEn || null,
              avatarUrl: t.avatarUrl || null,
              rating: t.rating ?? 5,
              published: t.published,
              order: i + 1,
            })
            .onConflictDoNothing();
        }
      } catch (seedErr) {
        console.warn("Auto-seed testimonials dilewati:", seedErr);
      }
      return baseTestimonials;
    }
    return list.map((t) => ({
      id: t.id,
      clientName: t.clientName,
      clientRole: t.clientRole || "Klien",
      clientRoleEn: t.clientRoleEn || null,
      content: t.content,
      contentEn: t.contentEn || null,
      avatarUrl: t.avatarUrl?.trim() || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=300&auto=format&fit=crop",
      rating: t.rating ?? 5,
      published: t.published ?? true,
    }));
  } catch (error) {
    console.warn("Database query getTestimonials gagal, menggunakan data lokal:", error);
    return baseTestimonials;
  }
}

export async function saveTestimonial(data: unknown) {
  try {
    await verifyAdmin();
  } catch (authErr: unknown) {
    return {
      success: false,
      error: sanitizeError(authErr),
    };
  }

  const parsed = TestimonialSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Validasi testimoni gagal" };
  }

  // Field English dipakai apa adanya (tanpa terjemahan otomatis). Penerjemahan
  // hanya terjadi bila admin menekan tombol "Terjemahkan (ID → EN)".
  const contentEn = parsed.data.contentEn?.trim() || null;
  const clientRoleEn = parsed.data.clientRoleEn?.trim() || null;

  const { id, ...rest } = parsed.data;
  const rating = parsed.data.rating ?? 5;
  const testimonialData = {
    ...rest,
    rating,
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
    rating,
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
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("Sinkronisasi database saveTestimonial gagal:", errMsg);
      if (errMsg.includes("does not exist") || errMsg.includes("relation")) {
        return {
          success: false,
          error: "Tabel 'testimonials' belum ada di Neon PostgreSQL. Harap jalankan 'npm run db:push' di terminal Anda.",
        };
      }
      return {
        success: false,
        error: "Gagal menyimpan testimoni ke database. Periksa log server untuk detail teknis.",
      };
    }
  }

  void logAudit({ action: "save", entity: "testimonials", entityId: targetId, detail: testimonialData.clientName });
  revalidatePath("/", "layout");
  revalidatePath("/admin", "layout");
  revalidatePath("/admin/testimonials");
  return { success: true, message: "Testimoni berhasil disimpan!" };
}

export async function deleteTestimonial(id: string) {
  try {
    await verifyAdmin();
  } catch (authErr: unknown) {
    return {
      success: false,
      error: sanitizeError(authErr),
    };
  }

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
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("Sinkronisasi database deleteTestimonial gagal:", errMsg);
      return {
        success: false,
        error: "Gagal menghapus testimoni dari database. Periksa log server untuk detail teknis.",
      };
    }
  }

  void logAudit({ action: "delete", entity: "testimonials", entityId: id });
  revalidatePath("/", "layout");
  revalidatePath("/admin", "layout");
  revalidatePath("/admin/testimonials");
  return { success: true, message: "Testimoni berhasil dihapus!" };
}

// ==========================================
// ARTIKEL SERVER ACTIONS
// ==========================================
export async function getArticles(): Promise<ArticleData[]> {
  const store = getLocalStore();
  const baseArticles = (store?.articles as ArticleData[]) || DUMMY_ARTICLES;

  if (!isDbConnected) return baseArticles;
  try {
    const list = await db.query.articles.findMany({
      orderBy: [asc(schema.articles.order), desc(schema.articles.createdAt)],
    });
    const existingIds = new Set((list || []).map((article) => article.id));
    const missingDefaults = DUMMY_ARTICLES.filter((article) => !existingIds.has(article.id));

    if (missingDefaults.length > 0) {
      try {
        for (const a of missingDefaults) {
          await db
            .insert(schema.articles)
            .values({
              id: a.id,
              slug: a.slug,
              title: a.title,
              titleEn: a.titleEn || null,
              summary: a.summary || null,
              summaryEn: a.summaryEn || null,
              content: a.content,
              contentEn: a.contentEn || null,
              imageUrl: a.imageUrl || null,
              tags: a.tags,
              featured: a.featured,
              published: a.published,
              order: a.order,
            })
            .onConflictDoNothing();
        }

        const seededList = await db.query.articles.findMany({
          orderBy: [asc(schema.articles.order), desc(schema.articles.createdAt)],
        });
        list.splice(0, list.length, ...seededList);
      } catch (seedErr) {
        console.warn("Auto-seed artikel baru dilewati:", seedErr);
      }
    }

    if (!list || list.length === 0) return baseArticles;

    return list.map((a) => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      titleEn: a.titleEn || null,
      summary: a.summary || null,
      summaryEn: a.summaryEn || null,
      content: a.content,
      contentEn: a.contentEn || null,
      imageUrl: a.imageUrl || null,
      tags: (Array.isArray(a.tags) ? a.tags : []) as string[],
      featured: a.featured,
      published: a.published,
      order: a.order,
      createdAt: a.createdAt ? a.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: a.updatedAt ? a.updatedAt.toISOString() : undefined,
    }));
  } catch (error) {
    console.warn("Neon DB query getArticles gagal, beralih ke local-store/dummy:", error);
    return baseArticles;
  }
}

export async function getArticleBySlug(slug: string): Promise<ArticleData | null> {
  if (!slug) return null;
  const articles = await getArticles();
  const found = articles.find((a) => a.slug === slug);
  return found || null;
}

export async function saveArticle(data: unknown) {
  try {
    await verifyAdmin();
  } catch (authErr: unknown) {
    return {
      success: false,
      error: sanitizeError(authErr),
    };
  }

  const parseResult = ArticleSchema.safeParse(data);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues.map((e) => e.message).join(", "),
    };
  }

  // Jaga keunikan slug sebelum menulis apa pun ke local store maupun database.
  const articleSlugConflict = await findSlugConflict(
    "articles",
    parseResult.data.slug,
    parseResult.data.id
  );
  if (articleSlugConflict) {
    return {
      success: false,
      error: slugConflictMessage("articles", parseResult.data.slug, articleSlugConflict),
    };
  }

  const {
    id,
    slug,
    title,
    titleEn,
    summary,
    summaryEn,
    content,
    contentEn,
    imageUrl,
    tags,
    featured,
    published,
    order,
  } = parseResult.data;

  // Field English dipakai apa adanya. Sebelumnya di sini ada pemanggilan otomatis
  // ke penyedia terjemahan pihak ketiga — dihapus, karena menyimpan artikel tidak
  // boleh berarti mengirim seluruh isinya ke layanan eksternal tanpa persetujuan.
  const resolvedTitleEn = titleEn?.trim() || null;
  const resolvedSummaryEn = summaryEn?.trim() || null;
  const resolvedContentEn = contentEn?.trim() || null;

  const articleId = id || crypto.randomUUID();
  const now = new Date().toISOString();

  const articleRecord: ArticleData = {
    id: articleId,
    slug: slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-"),
    title,
    titleEn: resolvedTitleEn || null,
    summary: summary || null,
    summaryEn: resolvedSummaryEn || null,
    content,
    contentEn: resolvedContentEn || null,
    imageUrl: imageUrl || null,
    tags: tags || [],
    featured: Boolean(featured),
    published: Boolean(published),
    order: Number(order) || 0,
    createdAt: now,
    updatedAt: now,
  };

  // 1. Simpan ke local store
  const store = getLocalStore();
  const currentArticles = (store?.articles as ArticleData[]) || [...DUMMY_ARTICLES];
  const existingIdx = currentArticles.findIndex((a) => a.id === articleId);

  if (existingIdx >= 0) {
    articleRecord.createdAt = currentArticles[existingIdx].createdAt || now;
    currentArticles[existingIdx] = articleRecord;
  } else {
    currentArticles.push(articleRecord);
  }
  updateLocalStore("articles", currentArticles);

  // 2. Simpan ke Neon PostgreSQL jika terhubung
  if (isDbConnected) {
    try {
      await db
        .insert(schema.articles)
        .values({
          id: articleRecord.id,
          slug: articleRecord.slug,
          title: articleRecord.title,
          titleEn: articleRecord.titleEn,
          summary: articleRecord.summary,
          summaryEn: articleRecord.summaryEn,
          content: articleRecord.content,
          contentEn: articleRecord.contentEn,
          imageUrl: articleRecord.imageUrl,
          tags: articleRecord.tags,
          featured: articleRecord.featured,
          published: articleRecord.published,
          order: articleRecord.order,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: schema.articles.id,
          set: {
            slug: articleRecord.slug,
            title: articleRecord.title,
            titleEn: articleRecord.titleEn,
            summary: articleRecord.summary,
            summaryEn: articleRecord.summaryEn,
            content: articleRecord.content,
            contentEn: articleRecord.contentEn,
            imageUrl: articleRecord.imageUrl,
            tags: articleRecord.tags,
            featured: articleRecord.featured,
            published: articleRecord.published,
            order: articleRecord.order,
            updatedAt: new Date(),
          },
        });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("Sinkronisasi database saveArticle gagal:", errMsg);
      if (errMsg.includes("does not exist") || errMsg.includes("relation")) {
        return {
          success: false,
          error: "Tabel 'articles' belum ada di Neon PostgreSQL. Harap jalankan 'npm run db:push' di terminal Anda.",
        };
      }
      return {
        success: false,
        error: "Gagal menyimpan artikel ke database. Periksa log server untuk detail teknis.",
      };
    }
  }

  void logAudit({ action: "save", entity: "articles", entityId: articleId, detail: title });
  revalidatePath("/", "layout");
  revalidatePath("/admin", "layout");
  revalidatePath("/admin/articles");
  revalidatePath(`/artikel/${articleRecord.slug}`);
  return { success: true, message: "Artikel berhasil disimpan!", article: articleRecord };
}

export async function deleteArticle(id: string) {
  try {
    await verifyAdmin();
  } catch (authErr: unknown) {
    return {
      success: false,
      error: sanitizeError(authErr),
    };
  }

  const store = getLocalStore();
  if (store?.articles) {
    const updated = (store.articles as ArticleData[]).filter((a) => a.id !== id);
    updateLocalStore("articles", updated);
  }

  const dummyIdx = DUMMY_ARTICLES.findIndex((a) => a.id === id);
  if (dummyIdx >= 0) {
    DUMMY_ARTICLES.splice(dummyIdx, 1);
  }

  if (isDbConnected) {
    try {
      await db.delete(schema.articles).where(eq(schema.articles.id, id));
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("Sinkronisasi database deleteArticle gagal:", errMsg);
      return {
        success: false,
        error: "Gagal menghapus artikel dari database. Periksa log server untuk detail teknis.",
      };
    }
  }

  void logAudit({ action: "delete", entity: "articles", entityId: id });
  revalidatePath("/", "layout");
  revalidatePath("/admin", "layout");
  revalidatePath("/admin/articles");
  return { success: true, message: "Artikel berhasil dihapus!" };
}
