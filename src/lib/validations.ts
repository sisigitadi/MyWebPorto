import { z } from "zod";

// Helper validator for URL or local relative paths (e.g., /uploads/...)
const imageOrUrlSchema = z
  .string()
  .refine(
    (val) =>
      val === "" ||
      val.startsWith("/") ||
      val.startsWith("http://") ||
      val.startsWith("https://"),
    {
      message: "URL Gambar/Avatar tidak valid (harus URL valid atau path /uploads/...)",
    }
  );

const safeUrlSchema = z
  .string()
  .refine(
    (val) =>
      val === "" ||
      val.startsWith("/") ||
      val.startsWith("#") ||
      val.startsWith("http://") ||
      val.startsWith("https://") ||
      val.startsWith("mailto:"),
    {
      message: "Format URL tidak valid (harus diawali http://, https://, /, #, atau mailto:)",
    }
  );

export const ProfileSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter"),
  headline: z.string().min(2, "Headline minimal 2 karakter"),
  headlineEn: z.string().optional().or(z.literal("")),
  bio: z.string().min(10, "Bio minimal 10 karakter"),
  bioEn: z.string().optional().or(z.literal("")),
  avatarUrl: imageOrUrlSchema.optional().or(z.literal("")),
  email: z.string().email("Email tidak valid"),
  phone: z.string().optional().or(z.literal("")),
  location: z.string().optional().or(z.literal("")),
  cvUrl: safeUrlSchema.optional().or(z.literal("")),
  availableForHire: z.boolean().default(true),
  skills: z.array(z.string()).default([]),
  stats: z
    .array(
      z.object({
        label: z.string(),
        labelEn: z.string().optional().or(z.literal("")),
        value: z.string(),
      })
    )
    .default([]),
  socialLinks: z
    .object({
      github: safeUrlSchema.optional().or(z.literal("")),
      linkedin: safeUrlSchema.optional().or(z.literal("")),
      instagram: safeUrlSchema.optional().or(z.literal("")),
      twitter: safeUrlSchema.optional().or(z.literal("")),
      portfolio: safeUrlSchema.optional().or(z.literal("")),
      telegram: safeUrlSchema.optional().or(z.literal("")),
      tiktok: safeUrlSchema.optional().or(z.literal("")),
      youtube: safeUrlSchema.optional().or(z.literal("")),
      facebook: safeUrlSchema.optional().or(z.literal("")),
      discord: safeUrlSchema.optional().or(z.literal("")),
      slack: safeUrlSchema.optional().or(z.literal("")),
      reddit: safeUrlSchema.optional().or(z.literal("")),
      medium: safeUrlSchema.optional().or(z.literal("")),
    })
    .default({}),
});

export const ProjectSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(2, "Judul proyek minimal 2 karakter"),
  titleEn: z.string().optional().or(z.literal("")),
  slug: z.string().min(2, "Slug minimal 2 karakter"),
  summary: z.string().optional().or(z.literal("")),
  summaryEn: z.string().optional().or(z.literal("")),
  description: z.string().min(10, "Deskripsi minimal 10 karakter"),
  descriptionEn: z.string().optional().or(z.literal("")),
  imageUrl: imageOrUrlSchema.refine((val) => val.length > 0, {
    message: "URL gambar proyek wajib diisi",
  }),
  demoUrl: safeUrlSchema.optional().or(z.literal("")),
  repoUrl: safeUrlSchema.optional().or(z.literal("")),
  techStacks: z.array(z.string()).default([]),
  featured: z.boolean().default(false),
  published: z.boolean().default(true),
  order: z.number().int().default(0),
});

export const ServiceSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(2, "Nama layanan minimal 2 karakter"),
  titleEn: z.string().optional().or(z.literal("")),
  description: z.string().min(5, "Deskripsi minimal 5 karakter"),
  descriptionEn: z.string().optional().or(z.literal("")),
  published: z.boolean().default(true),
  order: z.number().int().default(0),
});

export const ProductSchema = z.object({
  id: z.string().optional(),
  slug: z.string().min(2, "Slug minimal 2 karakter").optional().or(z.literal("")),
  title: z.string().min(2, "Nama produk minimal 2 karakter"),
  titleEn: z.string().optional().or(z.literal("")),
  description: z.string().min(5, "Deskripsi minimal 5 karakter"),
  descriptionEn: z.string().optional().or(z.literal("")),
  imageUrl: imageOrUrlSchema.refine((val) => val.length > 0, {
    message: "URL gambar produk wajib diisi",
  }),
  priceLabel: z.string().optional().or(z.literal("")),
  ctaUrl: safeUrlSchema.optional().or(z.literal("")),
  published: z.boolean().default(true),
  order: z.number().int().default(0),
});

export const TestimonialSchema = z.object({
  id: z.string().optional(),
  clientName: z.string().min(2, "Nama klien minimal 2 karakter"),
  clientRole: z.string().optional().or(z.literal("")),
  clientRoleEn: z.string().optional().or(z.literal("")),
  content: z.string().min(5, "Isi testimoni minimal 5 karakter"),
  contentEn: z.string().optional().or(z.literal("")),
  avatarUrl: imageOrUrlSchema.optional().or(z.literal("")),
  rating: z.coerce.number().int().min(1).max(5).default(5),
  published: z.boolean().default(true),
  order: z.number().int().default(0),
});

export const ArticleSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(2, "Judul artikel minimal 2 karakter"),
  titleEn: z.string().optional().or(z.literal("")),
  slug: z.string().min(2, "Slug minimal 2 karakter"),
  summary: z.string().optional().or(z.literal("")),
  summaryEn: z.string().optional().or(z.literal("")),
  content: z.string().min(10, "Isi artikel minimal 10 karakter"),
  contentEn: z.string().optional().or(z.literal("")),
  imageUrl: imageOrUrlSchema.optional().or(z.literal("")),
  tags: z.array(z.string()).default([]),
  featured: z.boolean().default(false),
  published: z.boolean().default(true),
  order: z.number().int().default(0),
});

export type ProfileFormValues = z.infer<typeof ProfileSchema>;
export type ProjectFormValues = z.infer<typeof ProjectSchema>;
export type ServiceFormValues = z.infer<typeof ServiceSchema>;
export type ProductFormValues = z.infer<typeof ProductSchema>;
export type TestimonialFormValues = z.infer<typeof TestimonialSchema>;
export type ArticleFormValues = z.infer<typeof ArticleSchema>;
