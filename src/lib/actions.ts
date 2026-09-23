"use server";

import fs from "fs";
import path from "path";
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
import { getProductSlug, normalizePurchaseType, slugifyProduct } from "@/lib/product-link";
import { sanitizeError } from "@/lib/error-utils";
import { logAudit } from "@/lib/audit";
import { verifyAdmin } from "./admin-auth";
import { catalogUrl, detailUrl, getIndexNowBaseUrl, submitUrlsToIndexNow } from "@/lib/indexnow";
import { isLivePublished, normalizePublishAt } from "@/lib/publish";
import { isPlaceholderKey } from "@/lib/env";
import { queryAIEngine, type EngineContext } from "@/lib/ai-engine";
import { buildCloudPrompt, buildCloudMessages, submitToGemini } from "@/lib/ai-provider";
import {
  resolveCloudAIConfig,
  saveCloudAIConfig,
  type StoredCloudAIConfig,
  type CloudProvider,
} from "@/lib/cloud-ai-config";
import {
  getSeoConfigForAdmin,
  saveSeoConfig,
  type AdminSeoView,
  type StoredSeoConfig,
} from "@/lib/seo-config";
import { submitToOpenAI } from "@/lib/ai-openai";
import { submitToAnthropic } from "@/lib/ai-anthropic";
import { getApiStyle } from "@/lib/ai-providers";
import { listCloudModels } from "@/lib/ai-models";
import { saveOSApps, resolveOSApps } from "@/lib/os-apps-config";
import type { OSAppConfig } from "@/lib/os-apps-meta";
import { resolveFeatures, saveFeatures, describeFeatures } from "@/lib/features-config";
import type { Features } from "@/lib/features-meta";
import {
  resolveUIStrings,
  saveUIStrings,
  describeUIStrings,
  type UIStrings,
} from "@/lib/ui-strings-config";
import { rateLimit, cleanupRateLimits } from "@/lib/rate-limit";
import { headers, draftMode } from "next/headers";
import {
  getSetting,
  setSetting,
  deleteSetting,
  recordSettingHistory,
  getSettingHistory,
  getSettingHistoryById,
  type SettingHistoryRecord,
} from "@/lib/settings";
import { draftContentWithAI, type DraftPublicContext } from "@/lib/redaksi-draft";
import {
  resolveRedaksiAutomation,
  saveRedaksiAutomation,
  markAutomationRun,
  stageDraft,
  deleteStagedDraft,
  computePublishIntent,
} from "@/lib/redaksi-automation";
import { AUTOMATION_SECTIONS } from "@/lib/redaksi-automation-meta";
import { isRedaksiContentType, type RedaksiContentType } from "@/lib/redaksi-meta";

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
          cvUrl: null,
          paymentQrUrl: null,
          paymentBankInfo: null,
          availableForHire: true,
          availabilityBadge: null,
          availabilityBadgeEn: null,
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
      cvUrl: res.cvUrl ?? baseProfile.cvUrl,
      paymentQrUrl: res.paymentQrUrl ?? baseProfile.paymentQrUrl,
      paymentBankInfo: res.paymentBankInfo ?? baseProfile.paymentBankInfo,
      availableForHire: res.availableForHire ?? baseProfile.availableForHire,
      availabilityBadge: res.availabilityBadge?.trim() ? res.availabilityBadge : null,
      availabilityBadgeEn: res.availabilityBadgeEn?.trim() ? res.availabilityBadgeEn : null,
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
  const availabilityBadge = parsed.data.availabilityBadge?.trim() || null;
  const availabilityBadgeEn = parsed.data.availabilityBadgeEn?.trim() || null;

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
    availabilityBadge,
    availabilityBadgeEn: availabilityBadgeEn || availabilityBadge,
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
export async function getProjects(
  opts: { includeScheduled?: boolean } = {}
): Promise<ProjectData[]> {
  const store = getLocalStore();
  const baseProjects = (store?.projects as ProjectData[]) || DUMMY_PROJECTS;
  const visible = (list: ProjectData[]) =>
    opts.includeScheduled ? list : list.filter((p) => isLivePublished(p));

  if (!isDbConnected) return visible(baseProjects);
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
      return visible(baseProjects);
    }
    return visible(
      list.map((p) => {
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
        publishAt: p.publishAt ? p.publishAt.toISOString() : null,
        createdAt: p.createdAt ? p.createdAt.toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      }
      })
    );
  } catch (error) {
    console.warn("Database query getProjects gagal, menggunakan data lokal:", error);
    return visible(baseProjects);
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
  const publishAtISO = normalizePublishAt(projectData.publishAt);
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
    publishAt: publishAtISO,
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

  const publishAtDate = publishAtISO ? new Date(publishAtISO) : null;
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
              publishAt: publishAtDate,
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
            publishAt: publishAtDate,
            summary: summaryId,
            summaryEn: summaryEn,
            imageUrl: projectData.imageUrl,
            techStacks: projectData.techStacks,
          });
        }
      } else {
        await db.insert(schema.projects).values({
          ...projectData,
          publishAt: publishAtDate,
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
  if (isLivePublished(dummyItem)) {
    void submitUrlsToIndexNow([detailUrl("proyek", dummyItem.slug)]);
  }
  revalidatePath("/", "layout");
  revalidatePath("/proyek", "layout");
  revalidatePath("/proyek/[slug]", "page");
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

  // DB dulu: bila hapus di database gagal, local store tidak ikut terlanjur diubah.
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

  if (store?.projects) {
    const updated = (store.projects as ProjectData[]).filter((p) => p.id !== id);
    updateLocalStore("projects", updated);
  }

  const dummyIdx = DUMMY_PROJECTS.findIndex((p) => p.id === id);
  if (dummyIdx >= 0) {
    DUMMY_PROJECTS.splice(dummyIdx, 1);
  }

  void logAudit({ action: "delete", entity: "projects", entityId: id });
  void submitUrlsToIndexNow([catalogUrl("proyek")]);
  revalidatePath("/", "layout");
  revalidatePath("/proyek", "layout");
  revalidatePath("/proyek/[slug]", "page");
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

  // DB dulu: bila hapus di database gagal, local store tidak ikut terlanjur diubah.
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

  if (store?.services) {
    const updated = (store.services as ServiceData[]).filter((s) => s.id !== id);
    updateLocalStore("services", updated);
  }

  const dummyIdx = DUMMY_SERVICES.findIndex((s) => s.id === id);
  if (dummyIdx >= 0) {
    DUMMY_SERVICES.splice(dummyIdx, 1);
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
              purchaseType: pr.purchaseType ?? "whatsapp",
              customWhatsapp: pr.customWhatsapp || null,
              customButtonLabel: pr.customButtonLabel || null,
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
      comparePriceLabel: p.comparePriceLabel || null,
      priceAmount: typeof p.priceAmount === "number" ? p.priceAmount : null,
      badge: p.badge || null,
      category: p.category || null,
      stock: typeof p.stock === "number" ? p.stock : null,
      gallery: (Array.isArray(p.gallery) ? p.gallery : []).filter((u) => typeof u === "string" && u.trim()),
      thumbnailUrl: p.imageUrl?.trim() || "https://images.unsplash.com/photo-1517842645767-c639042777db?q=80&w=600&auto=format&fit=crop",
      ctaUrl: p.ctaUrl || "#kontak",
      purchaseType: normalizePurchaseType(p.purchaseType),
      customWhatsapp: p.customWhatsapp?.trim() || null,
      customButtonLabel: p.customButtonLabel?.trim() || null,
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

  // Produk boleh dibuat tanpa slug eksplisit: bila kosong, simpan NULL
  // (URL publik jatuh ke id) sehingga tidak menabrak constraint UNIQUE slug.
  const effectiveProductSlug = parsed.data.slug?.trim() ? slugifyProduct(parsed.data.slug) : null;
  if (effectiveProductSlug) {
    const productSlugConflict = await findSlugConflict("products", effectiveProductSlug, parsed.data.id);
    if (productSlugConflict) {
      return {
        success: false,
        error: slugConflictMessage("products", effectiveProductSlug, productSlugConflict),
      };
    }
  }

  // Field English dipakai apa adanya (tanpa terjemahan otomatis). Penerjemahan
  // hanya terjadi bila admin menekan tombol "Terjemahkan (ID → EN)".
  const titleEn = parsed.data.titleEn?.trim() || null;
  const descriptionEn = parsed.data.descriptionEn?.trim() || null;

  const { id, ...rest } = parsed.data;
  const productData = {
    ...rest,
    slug: effectiveProductSlug,
    titleEn: titleEn || null,
    descriptionEn: descriptionEn || null,
  };

  const ctaUrl = parsed.data.ctaUrl?.trim() || null;
  const targetId = id || `prod-${Date.now()}`;
  const galleryUrls = (productData.gallery || []).filter((u) => typeof u === "string" && u.trim()).slice(0, 10);
  const dummyItem: ProductData = {
    id: targetId,
    slug: productData.slug || null,
    title: productData.title,
    titleEn: productData.titleEn,
    description: productData.description,
    descriptionEn: productData.descriptionEn,
    priceFormatted: productData.priceLabel || "Gratis / Diskusi",
    comparePriceLabel: productData.comparePriceLabel?.trim() || null,
    priceAmount: typeof productData.priceAmount === "number" ? productData.priceAmount : null,
    badge: productData.badge?.trim() || null,
    category: productData.category?.trim() || null,
    stock: typeof productData.stock === "number" ? productData.stock : null,
    gallery: galleryUrls,
    thumbnailUrl: productData.imageUrl?.trim() || "https://images.unsplash.com/photo-1517842645767-c639042777db?q=80&w=600&auto=format&fit=crop",
    ctaUrl: ctaUrl || "#kontak",
    purchaseType: productData.purchaseType ?? "whatsapp",
    customWhatsapp: productData.customWhatsapp?.trim() || null,
    customButtonLabel: productData.customButtonLabel?.trim() || null,
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
        gallery: galleryUrls,
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
  // Ping hanya untuk produk publish (slug publik bisa jatuh ke id bila slug kosong).
  if (dummyItem.published) {
    void submitUrlsToIndexNow([detailUrl("toko", getProductSlug(dummyItem))]);
  }
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

  // DB dulu: bila hapus di database gagal, local store tidak ikut terlanjur diubah.
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

  if (store?.products) {
    const updated = (store.products as ProductData[]).filter((p) => p.id !== id);
    updateLocalStore("products", updated);
  }

  const dummyIdx = DUMMY_PRODUCTS.findIndex((p) => p.id === id);
  if (dummyIdx >= 0) {
    DUMMY_PRODUCTS.splice(dummyIdx, 1);
  }

  void logAudit({ action: "delete", entity: "products", entityId: id, detail: deletedProduct?.title });
  // Tidak ada halaman katalog /toko (hanya /toko/[slug]) — ping URL detail
  // yang dihapus agar engine me-recrawl lalu menjatuhkannya, plus homepage
  // yang menampilkan produk di section-nya.
  if (deletedProduct) {
    void submitUrlsToIndexNow([detailUrl("toko", getProductSlug(deletedProduct)), `${getIndexNowBaseUrl()}/`]);
  }
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

  // DB dulu: bila hapus di database gagal, local store tidak ikut terlanjur diubah.
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

  if (store?.testimonials) {
    const updated = (store.testimonials as TestimonialData[]).filter((p) => p.id !== id);
    updateLocalStore("testimonials", updated);
  }

  const dummyIdx = DUMMY_TESTIMONIALS.findIndex((p) => p.id === id);
  if (dummyIdx >= 0) {
    DUMMY_TESTIMONIALS.splice(dummyIdx, 1);
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
export async function getArticles(
  opts: { includeScheduled?: boolean } = {}
): Promise<ArticleData[]> {
  const store = getLocalStore();
  const baseArticles = (store?.articles as ArticleData[]) || DUMMY_ARTICLES;
  const visible = (list: ArticleData[]) =>
    opts.includeScheduled ? list : list.filter((a) => isLivePublished(a));

  if (!isDbConnected) return visible(baseArticles);
  try {
    const list = await db.query.articles.findMany({
      orderBy: [asc(schema.articles.order), desc(schema.articles.createdAt)],
    });
    // Auto-seed hanya saat tabel masih kosong (first-boot). Menyemai ulang
    // artikel dummy yang hilang akan menghidupkan kembali konten yang sudah
    // dihapus admin setiap kali instance server cold-start.
    const missingDefaults = list.length === 0 ? DUMMY_ARTICLES : [];

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

    if (!list || list.length === 0) return visible(baseArticles);

    return visible(
      list.map((a) => ({
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
      publishAt: a.publishAt ? a.publishAt.toISOString() : null,
      order: a.order,
      createdAt: a.createdAt ? a.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: a.updatedAt ? a.updatedAt.toISOString() : undefined,
      }))
    );
  } catch (error) {
    console.warn("Neon DB query getArticles gagal, beralih ke local-store/dummy:", error);
    return visible(baseArticles);
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
  const publishAtISO = normalizePublishAt(parseResult.data.publishAt);

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
    publishAt: publishAtISO,
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
          publishAt: publishAtISO ? new Date(publishAtISO) : null,
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
            publishAt: publishAtISO ? new Date(publishAtISO) : null,
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
  if (isLivePublished(articleRecord)) {
    void submitUrlsToIndexNow([detailUrl("artikel", articleRecord.slug)]);
  }
  revalidatePath("/", "layout");
  revalidatePath("/admin", "layout");
  revalidatePath("/admin/articles");
  revalidatePath("/artikel", "layout");
  revalidatePath("/artikel/[slug]", "page");
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

  // DB dulu: bila hapus di database gagal, local store tidak ikut terlanjur diubah.
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

  if (store?.articles) {
    const updated = (store.articles as ArticleData[]).filter((a) => a.id !== id);
    updateLocalStore("articles", updated);
  }

  const dummyIdx = DUMMY_ARTICLES.findIndex((a) => a.id === id);
  if (dummyIdx >= 0) {
    DUMMY_ARTICLES.splice(dummyIdx, 1);
  }

  void logAudit({ action: "delete", entity: "articles", entityId: id });
  void submitUrlsToIndexNow([catalogUrl("artikel")]);
  revalidatePath("/", "layout");
  revalidatePath("/admin", "layout");
  revalidatePath("/admin/articles");
  revalidatePath("/artikel", "layout");
  revalidatePath("/artikel/[slug]", "page");
  return { success: true, message: "Artikel berhasil dihapus!" };
}

// ==========================================
// SIGIT_BOT HYBRID AI (publik, tanpa login)
// ==========================================
// Lokal dulu (gratis, privat), cloud hanya bila confidence rendah DAN provider
// opt-in aktif. Anti-abuse: rate-limit per IP, input dibatasi, output dibatasi,
// prompt hanya berisi katalog publik. BUKAN verifyAdmin — bot dipakai pengunjung.
const AIBOT_LIMIT = 10;
const AIBOT_WINDOW_MS = 5 * 60_000;
const AIBOT_CONFIDENCE_THRESHOLD = 0.55;

async function aibotIp(): Promise<string> {
  try {
    const h = await headers();
    const fwd = h.get("x-forwarded-for");
    if (fwd) return fwd.split(",")[0].trim();
    return h.get("x-real-ip") || "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Status cloud AI untuk client (agar tahu perlu fallback cloud atau tidak).
 * Sekarang lewat resolveCloudAIConfig: pengaturan admin (tabel settings) bisa
 * menimpa env — jadi status ini mencerminkan config efektif, bukan hanya env.
 */
export async function getCloudAIStatus(): Promise<{ enabled: boolean; model: string }> {
  const cfg = await resolveCloudAIConfig();
  return {
    enabled: cfg.provider !== "off" && !isPlaceholderKey(cfg.apiKey),
    model: cfg.model,
  };
}

/**
 * Dispatcher cloud tunggal — pilih gaya API sesuai provider efektif (lihat
 * registry ai-providers.ts). Dipakai askSigitBot (terminal, non-streaming);
 * route /api/retrobot punya cabang streaming sendiri.
 * Tidak pernah throw: gagal → {success:false} dan pemanggil jatuh ke jawaban
 * lokal TF-IDF.
 */
async function submitToCloud(
  query: string,
  ctx: EngineContext,
  lang: "id" | "en"
): Promise<{ success: boolean; text: string }> {
  // Resolve sekali di sini agar key/model/base URL konsisten untuk panggilan ini
  // (pengaturan admin atau env — lihat cloud-ai-config.ts).
  const cfg = await resolveCloudAIConfig();
  // Persona & gaya jawaban kustom dari pengaturan admin (bila diisi).
  const custom = { systemPrompt: cfg.systemPrompt, answerStyle: cfg.answerStyle };
  const style = getApiStyle(cfg.provider);
  if (style === "anthropic") {
    // Anthropic pakai messages API; system prompt jadi field top-level.
    return submitToAnthropic(buildCloudMessages(query, ctx, lang, custom), { config: cfg });
  }
  if (style === "openai-chat") {
    // OpenAI-compatible memakai format messages; prompt tetap katalog publik.
    return submitToOpenAI(buildCloudMessages(query, ctx, lang, custom), { config: cfg });
  }
  return submitToGemini(buildCloudPrompt(query, ctx, lang, custom), { config: cfg });
}

export async function askSigitBot(
  rawInput: string,
  preferredLang: "id" | "en" = "id"
): Promise<{ text: string; intent: string; confidence: number; source: "local" | "cloud" }> {
  const cleanInput = (rawInput || "").trim().slice(0, 500);
  const lang = preferredLang === "en" ? "en" : "id";
  if (!cleanInput) {
    return {
      text: lang === "en" ? "Please enter a query or command." : "Silakan masukkan pertanyaan atau perintah.",
      intent: "empty",
      confidence: 0,
      source: "local",
    };
  }

  // Gate feature flag (settings.features): app Terminal (os-desktop-manager)
  // dan widget RetroBot di-gate di client; aksi server ini adalah jalur lain
  // yang dipakai os-crt-terminal.tsx — wajib ditolak di server juga.
  const features = await resolveFeatures();
  if (!features.enable_terminal) {
    return {
      text:
        lang === "en"
          ? "The terminal feature is currently disabled."
          : "Fitur terminal sedang dinonaktifkan.",
      intent: "disabled",
      confidence: 1,
      source: "local",
    };
  }

  const ip = await aibotIp();
  const rl = rateLimit(`aibot:${ip}`, AIBOT_LIMIT, AIBOT_WINDOW_MS);
  cleanupRateLimits();
  if (!rl.allowed) {
    return {
      text:
        lang === "en"
          ? "Rate limit reached. Please wait a moment before asking again."
          : "Batas pertanyaan tercapai. Tunggu sebentar sebelum bertanya lagi.",
      intent: "rate_limited",
      confidence: 1,
      source: "local",
    };
  }

  // Konteks live dipakai BOTH jalur lokal (TF-IDF) dan cloud (Gemini) — sebelumnya
  // inferensi lokal memakai KNOWLEDGE_BASE statik di ai-engine.ts, sehingga jawaban
  // bisa drift dari data yang diatur admin (mis. email diganti di admin → bot masih
  // menyebut yang lama). Getter di bawah tidak pernah throw (fallback ke data lokal).
  let ctx: EngineContext;
  try {
    const [profile, services, projects, articles] = await Promise.all([
      getProfile(),
      getServices(),
      getProjects(),
      getArticles(),
    ]);
    ctx = {
      ownerName: profile.name,
      headline: profile.headline,
      headlineEn: profile.headlineEn,
      bio: profile.bio,
      bioEn: profile.bioEn,
      location: profile.location,
      email: profile.email,
      phone: profile.phone,
      availableForHire: profile.availableForHire,
      skills: profile.skills || [],
      socialLinks: profile.socialLinks,
      services: services.filter((s) => s.published !== false).map((s) => s.title),
      projects: projects
        .filter((p) => p.published)
        .slice(0, 8)
        .map((p) => ({ title: p.title, slug: p.slug })),
      articles: articles
        .filter((a) => a.published)
        .slice(0, 8)
        .map((a) => ({ title: a.title, slug: a.slug })),
    };
  } catch (err) {
    console.error("askSigitBot: gagal memuat konteks live:", err instanceof Error ? err.message.slice(0, 200) : err);
    return {
      text:
        lang === "en"
          ? "I couldn't load the portfolio data right now. Please try again in a moment."
          : "Data portfolio sedang tidak dapat dimuat. Silakan coba lagi sebentar.",
      intent: "context_error",
      confidence: 0.3,
      source: "local",
    };
  }

  const local = queryAIEngine(cleanInput, ctx, lang);
  // Config efektif (pengaturan admin > env) — resolve sekali untuk kedua cek.
  const cloudCfg = await resolveCloudAIConfig();
  if (local.confidence >= AIBOT_CONFIDENCE_THRESHOLD || cloudCfg.provider === "off" || isPlaceholderKey(cloudCfg.apiKey)) {
    return { ...local, source: "local" };
  }

  try {
    const cloud = await submitToCloud(cleanInput, ctx, lang);
    if (cloud.success) {
      return { text: cloud.text, intent: local.intent, confidence: local.confidence, source: "cloud" };
    }
  } catch (err) {
    console.error("askSigitBot cloud fallback gagal:", err instanceof Error ? err.message.slice(0, 200) : err);
  }
  return { ...local, source: "local" };
}

/**
 * Simpan konfigurasi Cloud AI dari form /admin/system. Wajib admin terotentikasi.
 * Pembacaan dilakukan langsung oleh server component /admin/system lewat
 * getCloudAIConfigForAdmin() — tidak butuh action wrapper, dan key tidak pernah
 * mentah ke client. apiKey kosong = pertahankan key yang ada (saveCloudAIConfig).
 */
export async function saveCloudAIConfigAction(input: StoredCloudAIConfig): Promise<{ ok: true } | { ok: false; error: string }> {
  await verifyAdmin();
  try {
    await saveCloudAIConfig(input);
    await logAudit({ action: "update", entity: "settings", entityId: "cloud_ai", detail: `provider=${input.provider || "off"}` });
    revalidatePath("/admin/system");
    revalidatePath("/admin/cloud-ai");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: sanitizeError(err),
    };
  }
}

/**
 * Simpan konfigurasi SEO/SEM dari form /admin/seo (token verifikasi Google &
 * Bing, key IndexNow, override Open Graph). Wajib admin terotentikasi.
 *
 * Asimetris seperti action settings lainnya: verifyAdmin() di luar try, lalu
 * validasi nilai dilakukan server-side oleh saveSeoConfig() (token asing
 * ditolak keras dengan pesan Indonesia). Token tidak pernah dikembalikan
 * mentah ke client — pembacaan form lewat getSeoConfigForAdmin() (di-mask).
 * Perubahan mempengaruhi <head> seluruh situs publik + /opengraph-image, jadi
 * revalidatePath memakai scope "layout".
 */
export async function saveSeoConfigAction(
  input: unknown
): Promise<{ ok: true; config: AdminSeoView } | { ok: false; error: string }> {
  await verifyAdmin();
  try {
    await saveSeoConfig(input as StoredSeoConfig);
    const config = await getSeoConfigForAdmin();
    await logAudit({
      action: "update",
      entity: "settings",
      entityId: "seo",
      detail: "Konfigurasi SEO/SEM (GSC, Bing, IndexNow, Open Graph)",
    });
    // Layout-level: meta verifikasi + OG berlaku untuk seluruh halaman publik;
    // /admin/seo butuh refresh tampilan status setelah simpan.
    revalidatePath("/", "layout");
    revalidatePath("/admin/seo");
    return { ok: true, config };
  } catch (err) {
    return { ok: false, error: sanitizeError(err) };
  }
}


/**
 * Ambi daftar model yang tersedia di provider (untuk auto-fill form Cloud AI).
 * Wajib admin terotentikasi. Key dikirim dari form HANYA untuk panggilan ini
 * (tidak disimpan di sini); bila form mengirim key kosong, pakai key yang
 * sudah tersimpan agar admin bisa refresh daftar model tanpa mengetik ulang.
 */
export async function listCloudModelsAction(
  provider: CloudProvider,
  apiKey: string,
  baseUrl: string
): Promise<{ ok: true; models: string[] } | { ok: false; error: string }> {
  await verifyAdmin();
  try {
    let key = (apiKey || "").trim();
    let base = (baseUrl || "").trim();
    // Key kosong di form = "pakai yang tersimpan" (sama seperti saveCloudAIConfig).
    if (!key || !base) {
      const cfg = await resolveCloudAIConfig();
      if (!key) key = cfg.apiKey;
      if (!base) base = cfg.baseUrl;
    }
    const result = await listCloudModels(provider, key, base);
    if (result.error) return { ok: false, error: result.error };
    return { ok: true, models: result.models };
  } catch (err) {
    return { ok: false, error: sanitizeError(err) };
  }
}

/**
 * Simpan urutan & status aktif app SigitOS dari halaman /admin/appearance.
 * Wajib admin terotentikasi. Mengubah apa yang dilihat pengunjung di homepage
 * (taskbar, sidebar ikon, start menu, dan urutan section mobile), jadi selain
 * revalidatePath("/admin/appearance") juga harus revalidatePath("/") —
 * perubahan baru terlihat setelah refresh cache halaman publik.
 */
export async function saveOSAppsAction(input: OSAppConfig[]): Promise<
  { ok: true; apps: OSAppConfig[] } | { ok: false; error: string }
> {
  await verifyAdmin();
  try {
    await saveOSApps(input);
    const resolved = await resolveOSApps();
    const activeCount = resolved.apps.filter((a) => a.enabled).length;
    await logAudit({
      action: "update",
      entity: "settings",
      entityId: "os_apps",
      detail: `${activeCount}/${resolved.apps.length} app aktif`,
    });
    revalidatePath("/");
    revalidatePath("/admin/appearance");
    return { ok: true, apps: resolved.apps };
  } catch (err) {
    return { ok: false, error: sanitizeError(err) };
  }
}

export async function saveUIStringsAction(
  input: unknown
): Promise<{ ok: true; strings: UIStrings } | { ok: false; error: string }> {
  await verifyAdmin();
  try {
    await saveUIStrings(input);
    const resolved = await resolveUIStrings();
    await logAudit({
      action: "update",
      entity: "settings",
      entityId: "ui_strings",
      detail: describeUIStrings(resolved, "id"),
    });
    revalidatePath("/", "layout");
    revalidatePath("/admin/strings");
    return { ok: true, strings: resolved };
  } catch (err) {
    return { ok: false, error: sanitizeError(err) };
  }
}

/**
 * Simpan feature flag global dari form /admin/features. Shape identik dengan
 * saveUIStringsAction/saveOSAppsAction agar form admin seragam.
 *
 * Keamanan asimetris (sama seperti Fase 1/2): verifyAdmin() dulu, lalu seluruh
 * validasi nilai dilakukan server-side oleh saveFeatures() (key harus
 * terdaftar, nilai harus boolean eksplisit — input asing/non-boolean ditolak
 * keras dengan pesan Indonesia). Manipulasi form di client tidak pernah
 * menerobos. Setelah simpan, audit log dicatat dan layout publik
 * di-revalidate (maintenance_mode & gate app mengubah seluruh tree publik).
 */
export async function saveFeaturesAction(
  input: unknown
): Promise<{ ok: true; features: Features } | { ok: false; error: string }> {
  await verifyAdmin();
  try {
    const features = await saveFeatures(input);
    await logAudit({
      action: "update",
      entity: "settings",
      entityId: "features",
      detail: describeFeatures(features, "id"),
    });
    // Layout-level: maintenance_mode & gate app mengubah seluruh tree publik.
    revalidatePath("/", "layout");
    revalidatePath("/admin/features");
    return { ok: true, features };
  } catch (err) {
    return { ok: false, error: sanitizeError(err) };
  }
}

// ==========================================
// GOD MODE FASE 4: DRAFT, LIVE PREVIEW, & ROLLBACK
// ==========================================

export type GodModeKey = "features" | "ui_strings" | "os_apps";

/**
 * Aktifkan Next.js draftMode() untuk admin (memungkinkan pratinjau konfigurasi draft).
 */
export async function enableGodModePreviewAction(): Promise<{ ok: true } | { ok: false; error: string }> {
  await verifyAdmin();
  try {
    const dm = await draftMode();
    dm.enable();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: sanitizeError(err) };
  }
}

/**
 * Nonaktifkan Next.js draftMode() dan kembali ke tampilan normal pengunjung publik.
 */
export async function disableGodModePreviewAction(): Promise<{ ok: true } | { ok: false; error: string }> {
  // Simetris dengan enableGodModePreviewAction: hanya admin yang boleh mengubah
  // status draftMode(). Tanpa ini pengunjung anonim bisa memanggil action ini
  // (Broken Access Control, OWASP A01) — walau dampaknya terbatas ke cookie
  // draft pemanggil, tetap harus konsisten dengan pasangannya.
  await verifyAdmin();
  try {
    const dm = await draftMode();
    dm.disable();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: sanitizeError(err) };
  }
}

/**
 * Simpan konfigurasi sebagai draf tanpa mengubah konfigurasi live publik.
 */
export async function saveGodModeDraftAction(
  key: GodModeKey,
  input: unknown
): Promise<{ ok: true } | { ok: false; error: string }> {
  await verifyAdmin();
  try {
    if (key === "features") {
      await saveFeatures(input);
    } else if (key === "ui_strings") {
      await saveUIStrings(input);
    } else if (key === "os_apps") {
      await saveOSApps(input as OSAppConfig[]);
    } else {
      throw new Error(`Kategori God Mode "${key}" tidak dikenal.`);
    }

    await setSetting(`${key}:draft`, input);

    await logAudit({
      action: "draft",
      entity: "settings",
      entityId: `${key}:draft`,
      detail: `Menyimpan draf konfigurasi ${key}`,
    });

    return { ok: true };
  } catch (err) {
    return { ok: false, error: sanitizeError(err) };
  }
}

/**
 * Publikasikan draf ke live (atau simpan langsung ke live sekaligus membuat snapshot riwayat).
 */
export async function publishGodModeAction(
  key: GodModeKey,
  payloadOverride?: unknown
): Promise<{ ok: true } | { ok: false; error: string }> {
  await verifyAdmin();
  try {
    let payload = payloadOverride;
    if (payload === undefined) {
      payload = await getSetting(`${key}:draft`);
      if (payload === null || payload === undefined) {
        throw new Error(`Tidak ada draf untuk "${key}" yang siap dipublikasikan.`);
      }
    }

    const previousLive = await getSetting(key);
    let label = `Publikasi ${key}`;
    if (key === "features") {
      const saved = await saveFeatures(payload);
      label = describeFeatures(saved, "id");
    } else if (key === "ui_strings") {
      await saveUIStrings(payload);
      const resolved = await resolveUIStrings();
      label = describeUIStrings(resolved, "id");
    } else if (key === "os_apps") {
      await saveOSApps(payload as OSAppConfig[]);
      const resolved = await resolveOSApps();
      const activeCount = resolved.apps.filter((a) => a.enabled).length;
      label = `${activeCount}/${resolved.apps.length} app aktif`;
    }

    if (previousLive !== null && previousLive !== undefined) {
      await recordSettingHistory({
        key,
        value: previousLive,
        label: `Snapshot sebelum ${label}`,
      });
    }

    await deleteSetting(`${key}:draft`);

    await logAudit({
      action: "publish",
      entity: "settings",
      entityId: key,
      detail: label,
    });

    revalidatePath("/", "layout");
    if (key === "os_apps") revalidatePath("/admin/appearance");
    if (key === "ui_strings") revalidatePath("/admin/strings");
    if (key === "features") revalidatePath("/admin/features");

    return { ok: true };
  } catch (err) {
    return { ok: false, error: sanitizeError(err) };
  }
}

/**
 * Buang draf yang belum dipublikasikan.
 */
export async function discardGodModeDraftAction(
  key: GodModeKey
): Promise<{ ok: true } | { ok: false; error: string }> {
  await verifyAdmin();
  try {
    await deleteSetting(`${key}:draft`);
    await logAudit({
      action: "discard_draft",
      entity: "settings",
      entityId: `${key}:draft`,
      detail: `Membuang draf konfigurasi ${key}`,
    });
    if (key === "os_apps") revalidatePath("/admin/appearance");
    if (key === "ui_strings") revalidatePath("/admin/strings");
    if (key === "features") revalidatePath("/admin/features");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: sanitizeError(err) };
  }
}

/**
 * Kembalikan konfigurasi live ke snapshot riwayat tertentu (Rollback 1-klik).
 */
export async function rollbackGodModeAction(
  historyId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  await verifyAdmin();
  try {
    const history = await getSettingHistoryById(historyId);
    if (!history) {
      throw new Error(`Data riwayat dengan ID "${historyId}" tidak ditemukan.`);
    }

    const key = history.key as GodModeKey;
    const previousLive = await getSetting(key);

    if (previousLive !== null && previousLive !== undefined) {
      await recordSettingHistory({
        key,
        value: previousLive,
        label: `Snapshot sebelum rollback ke ${history.label ?? history.id}`,
      });
    }

    if (key === "features") {
      await saveFeatures(history.value);
    } else if (key === "ui_strings") {
      await saveUIStrings(history.value);
    } else if (key === "os_apps") {
      await saveOSApps(history.value as OSAppConfig[]);
    } else {
      await setSetting(key, history.value);
    }

    await logAudit({
      action: "rollback",
      entity: "settings",
      entityId: key,
      detail: `Rollback ke versi ${history.label ?? history.createdAt}`,
    });

    revalidatePath("/", "layout");
    if (key === "os_apps") revalidatePath("/admin/appearance");
    if (key === "ui_strings") revalidatePath("/admin/strings");
    if (key === "features") revalidatePath("/admin/features");

    return { ok: true };
  } catch (err) {
    return { ok: false, error: sanitizeError(err) };
  }
}

/**
 * Ambil daftar snapshot riwayat konfigurasi untuk key tertentu.
 */
export async function getGodModeHistoryAction(
  key: GodModeKey
): Promise<{ ok: true; history: SettingHistoryRecord[] } | { ok: false; error: string }> {
  await verifyAdmin();
  try {
    const history = await getSettingHistory(key, 20);
    return { ok: true, history };
  } catch (err) {
    return { ok: false, error: sanitizeError(err) };
  }
}

/**
 * Ambil status draf saat ini (apakah ada draf tersimpan).
 */
export async function getGodModeDraftStatusAction(
  key: GodModeKey
): Promise<{ ok: true; hasDraft: boolean; draftValue: unknown } | { ok: false; error: string }> {
  await verifyAdmin();
  try {
    const draft = await getSetting(`${key}:draft`);
    return { ok: true, hasDraft: draft !== null && draft !== undefined, draftValue: draft };
  } catch (err) {
    return { ok: false, error: sanitizeError(err) };
  }
}

// ==========================================
// REDAKSI — hub penulisan konten (manual + bantuan AI)
// ==========================================
// Rate limit pembuatan draf AI: admin-only, tapi tetap dibatasi agar key Cloud
// AI tidak terkuras oleh klik berulang / loop bug. Lebih longgar dari bot publik.
const REDAKSI_DRAFT_LIMIT = 20;
const REDAKSI_DRAFT_WINDOW_MS = 5 * 60_000;

/**
 * Buat draf konten via Cloud AI untuk composer Redaksi. verifyAdmin + rate-limit
 * per IP. Hasil sudah divalidasi terhadap schema draf (lihat redaksi-draft.ts);
 * penyimpanan final tetap lewat action save* dengan validasi schema PENUH.
 */
export async function draftContentWithAIAction(
  type: string,
  brief: string,
  lang: "id" | "en" = "id"
): Promise<
  | { ok: true; draft: unknown }
  | { ok: false; error: string }
> {
  await verifyAdmin();
  if (!isRedaksiContentType(type)) {
    return { ok: false, error: "Tipe konten tidak dikenal." };
  }
  const ip = await aibotIp();
  const rl = rateLimit(`redaksi:${ip}`, REDAKSI_DRAFT_LIMIT, REDAKSI_DRAFT_WINDOW_MS);
  cleanupRateLimits();
  if (!rl.allowed) {
    return {
      ok: false,
      error: `Batas pembuatan draf tercapai (${REDAKSI_DRAFT_LIMIT}/5 menit). Tunggu sebentar lalu coba lagi.`,
    };
  }

  try {
    // Konteks profil PUBLIK disuntikkan ke prompt (nama/headline/keahlian).
    const profile = await getProfile();
    const publicCtx: DraftPublicContext = {
      name: profile.name,
      headline: profile.headline,
      skills: profile.skills || [],
    };
    const result = await draftContentWithAI(type, brief, lang, publicCtx);
    if (!result.ok) return { ok: false, error: result.error };
    await logAudit({
      action: "create",
      entity: "redaksi_draft",
      entityId: type,
      detail: `brief=${brief.trim().slice(0, 80)}`,
    });
    return { ok: true, draft: result.draft.data };
  } catch (err) {
    return { ok: false, error: sanitizeError(err) };
  }
}

/**
 * Simpan pengaturan Otomasi Redaksi dari form /admin/redaksi/otomasi.
 */
export async function saveRedaksiAutomationAction(
  input: unknown
): Promise<{ ok: true } | { ok: false; error: string }> {
  await verifyAdmin();
  try {
    const cfg = await saveRedaksiAutomation(input);
    await logAudit({
      action: "update",
      entity: "settings",
      entityId: "redaksi_auto",
      detail: `enabled=${cfg.enabled} autoUpload=${cfg.autoUpload} mode=${cfg.scheduleMode}`,
    });
    revalidatePath("/admin/redaksi/otomasi");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: sanitizeError(err) };
  }
}

/**
 * Hapus satu draf hasil otomasi yang tertahan (staging).
 */
export async function deleteStagedDraftAction(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  await verifyAdmin();
  try {
    await deleteStagedDraft(id);
    await logAudit({ action: "delete", entity: "redaksi_staged", entityId: id });
    revalidatePath("/admin/redaksi");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: sanitizeError(err) };
  }
}

/** Ringkasan satu pekerjaan otomasi (untuk ditampilkan ke admin). */
export interface AutomationJobResult {
  type: string;
  topic: string;
  ok: boolean;
  error?: string;
  stagedId?: string;
}

/**
 * Jalankan otomasi redaksi: untuk tiap section aktif yang punya topik (hingga
 * maxPerRun), buat draf via Cloud AI lalu STAGE-kan (settings.redaksi_staging)
 * dengan niat publish sesuai pengaturan (autoUpload / waktu upload).
 *
 * Mengapa staging, bukan langsung tulis ke tabel konten:
 *  1. "Perlu izin": tidak ada konten AI yang tayang tanpa satu kali review
 *     manusia — pembatasan abuse sekaligus kesalahan halus AI.
 *  2. Integritas schema: proyek/produk mewajibkan imageUrl; AI dilarang
 *     mengarang aset, jadi field itu harus diisi admin saat review.
 *  3. Niat publish (published/publishAt) diterapkan saat admin "Terima & Simpan"
 *     lewat composer Redaksi yang memakai action save* biasa — sehingga
 *     validasi schema PENUH, slug-unik, audit, dan revalidatePath tetap jalan.
 */
export async function runRedaksiAutomationAction(): Promise<
  | { ok: true; summary: { total: number; created: number; failed: number; results: AutomationJobResult[] } }
  | { ok: false; error: string }
> {
  await verifyAdmin();
  const cfg = await resolveRedaksiAutomation();
  if (!cfg.enabled) {
    return { ok: false, error: "Otomasi redaksi sedang dimatikan. Nyalakan master switch di pengaturan." };
  }

  // Kumpulkan pekerjaan dari section aktif yang punya topik.
  const jobs: { type: RedaksiContentType; topic: string }[] = [];
  for (const section of AUTOMATION_SECTIONS) {
    if (!cfg.sections[section]) continue;
    for (const topic of cfg.topics[section] || []) jobs.push({ type: section, topic });
  }
  if (!jobs.length) {
    return {
      ok: false,
      error: "Tidak ada section aktif yang memiliki topik. Isi topik pada section yang dinyalakan.",
    };
  }
  const limited = jobs.slice(0, cfg.maxPerRun);

  let profile: Awaited<ReturnType<typeof getProfile>>;
  try {
    profile = await getProfile();
  } catch (err) {
    return { ok: false, error: sanitizeError(err) };
  }
  const publicCtx: DraftPublicContext = {
    name: profile.name,
    headline: profile.headline,
    skills: profile.skills || [],
  };
  const intent = computePublishIntent(cfg);

  const results: AutomationJobResult[] = [];
  for (const job of limited) {
    try {
      const r = await draftContentWithAI(job.type, job.topic, "id", publicCtx);
      if (!r.ok) {
        results.push({ type: job.type, topic: job.topic, ok: false, error: r.error });
        continue;
      }
      const staged = await stageDraft({
        type: job.type,
        topic: job.topic,
        data: r.draft.data as Record<string, unknown>,
        intendedPublished: intent.intendedPublished,
        intendedPublishAt: intent.intendedPublishAt,
      });
      results.push({ type: job.type, topic: job.topic, ok: true, stagedId: staged.id });
    } catch (err) {
      results.push({ type: job.type, topic: job.topic, ok: false, error: sanitizeError(err) });
    }
  }

  await markAutomationRun();
  const created = results.filter((r) => r.ok).length;
  await logAudit({
    action: "create",
    entity: "redaksi_auto",
    detail: `${created}/${results.length} draf tertahan dibuat`,
  });
  revalidatePath("/admin/redaksi");
  return { ok: true, summary: { total: results.length, created, failed: results.length - created, results } };
}


