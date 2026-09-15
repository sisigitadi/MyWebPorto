import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/** Profil tunggal pemilik website */
export const profiles = pgTable(
  "profiles",
  {
    id: text("id").primaryKey().$defaultFn(() => "owner"),
    name: text("name").notNull(),
    headline: text("headline").notNull(),
    headlineEn: text("headline_en"),
    bio: text("bio").notNull(),
    bioEn: text("bio_en"),
    avatarUrl: text("avatar_url"),
    email: text("email").notNull(),
    phone: text("phone"),
    location: text("location"),
    cvUrl: text("cv_url"),
    // Pembayaran manual toko (QRIS + info transfer), dikelola dari /admin/profile
    paymentQrUrl: text("payment_qr_url"),
    paymentBankInfo: text("payment_bank_info"),
    availableForHire: boolean("available_for_hire").notNull().default(true),
    skills: jsonb("skills")
      .$type<string[]>()
      .notNull()
      .default([]),
    stats: jsonb("stats")
      .$type<{ label: string; labelEn?: string | null; value: string }[]>()
      .notNull()
      .default([]),
    socialLinks: jsonb("social_links")
      .$type<{
        github?: string;
        linkedin?: string;
        instagram?: string;
        twitter?: string;
        portfolio?: string;
        telegram?: string;
        tiktok?: string;
        youtube?: string;
        facebook?: string;
        discord?: string;
        slack?: string;
        reddit?: string;
        medium?: string;
      }>()
      .notNull()
      .default({}),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("profiles_id_idx").on(table.id)]
);

/** Proyek / portofolio */
export const projects = pgTable(
  "projects",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    titleEn: text("title_en"),
    summary: text("summary"),
    summaryEn: text("summary_en"),
    description: text("description").notNull(),
    descriptionEn: text("description_en"),
    imageUrl: text("image_url").notNull(),
    demoUrl: text("demo_url"),
    repoUrl: text("repo_url"),
    techStacks: jsonb("tech_stacks")
      .$type<string[]>()
      .notNull()
      .default([]),
    featured: boolean("featured").notNull().default(false),
    published: boolean("published").notNull().default(true),
    order: integer("order").notNull().default(0),
    // Penjadwalan tayang: null = langsung tayang (bila published). Masa depan = tersembunyi publik.
    publishAt: timestamp("publish_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("projects_slug_idx").on(table.slug),
    index("projects_published_idx").on(table.published),
  ]
);

/** Layanan / keahlian yang ditawarkan */
export const services = pgTable(
  "services",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    title: text("title").notNull(),
    titleEn: text("title_en"),
    description: text("description").notNull(),
    descriptionEn: text("description_en"),
    published: boolean("published").notNull().default(true),
    order: integer("order").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("services_published_idx").on(table.published)]
);

/** Produk yang ditampilkan sebagai katalog */
export const products = pgTable(
  "products",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    slug: text("slug").unique(),
    title: text("title").notNull(),
    titleEn: text("title_en"),
    description: text("description").notNull(),
    descriptionEn: text("description_en"),
    imageUrl: text("image_url").notNull(),
    priceLabel: text("price_label"),
    // Harga coret (label) + nominal Rupiah untuk keranjang (null = tanya/hubungi)
    comparePriceLabel: text("compare_price_label"),
    priceAmount: integer("price_amount"),
    // Etalase toko: badge, kategori, stok (null = digital/tanpa batas), galeri
    badge: text("badge"),
    category: text("category"),
    stock: integer("stock"),
    gallery: jsonb("gallery").$type<string[]>().notNull().default([]),
    ctaUrl: text("cta_url"),
    purchaseType: text("purchase_type").notNull().default("whatsapp"),
    customWhatsapp: text("custom_whatsapp"),
    customButtonLabel: text("custom_button_label"),
    published: boolean("published").notNull().default(true),
    order: integer("order").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("products_published_idx").on(table.published)]
);

/** Testimoni klien */
export const testimonials = pgTable(
  "testimonials",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    clientName: text("client_name").notNull(),
    clientRole: text("client_role"),
    clientRoleEn: text("client_role_en"),
    content: text("content").notNull(),
    contentEn: text("content_en"),
    avatarUrl: text("avatar_url"),
    rating: integer("rating").notNull().default(5),
    published: boolean("published").notNull().default(true),
    order: integer("order").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("testimonials_published_idx").on(table.published)]
);

export const articles = pgTable(
  "articles",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    titleEn: text("title_en"),
    summary: text("summary"),
    summaryEn: text("summary_en"),
    content: text("content").notNull(),
    contentEn: text("content_en"),
    imageUrl: text("image_url"),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    featured: boolean("featured").notNull().default(false),
    published: boolean("published").notNull().default(true),
    order: integer("order").notNull().default(0),
    // Penjadwalan tayang: null = langsung tayang (bila published). Masa depan = tersembunyi publik.
    publishAt: timestamp("publish_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("articles_slug_idx").on(table.slug),
    index("articles_published_idx").on(table.published),
  ]
);

/**
 * Audit log admin — siapa mengubah apa dan kapan.
 * Ditulis best-effort (tidak pernah menggagalkan mutasi) via src/lib/audit.ts.
 * Retensi dibatasi di level aplikasi (default 500 baris terbaru).
 */
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    actor: text("actor"),
    detail: text("detail"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("audit_logs_created_idx").on(table.createdAt)]
);

/**
 * Pengaturan aplikasi key/value — konfigurasi yang diisi dari UI admin tanpa
 * redeploy. Saat ini menampung konfigurasi Cloud AI Sigit_Bot (provider, key,
 * model, base URL) di baris tunggal dengan key "cloud_ai".
 *
 * Keamanan: value boleh berisi rahasia (API key). Module pengakses
 * (src/lib/settings.ts) wajib mem-mask saat mengembalikan ke client, dan
 * penulisan hanya boleh terjadi lewat server action yang memanggil verifyAdmin.
 */
export const settings = pgTable(
  "settings",
  {
    key: text("key").primaryKey(),
    value: jsonb("value").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("settings_updated_at_idx").on(table.updatedAt)]
);

export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export type Service = typeof services.$inferSelect;
export type NewService = typeof services.$inferInsert;

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;

export type Testimonial = typeof testimonials.$inferSelect;
export type NewTestimonial = typeof testimonials.$inferInsert;

export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
