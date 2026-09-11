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
    availableForHire: boolean("available_for_hire").notNull().default(true),
    skills: jsonb("skills")
      .$type<string[]>()
      .notNull()
      .default([]),
    stats: jsonb("stats")
      .$type<{ label: string; value: string }[]>()
      .notNull()
      .default([]),
    socialLinks: jsonb("social_links")
      .$type<{
        github?: string;
        linkedin?: string;
        instagram?: string;
        twitter?: string;
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
    title: text("title").notNull(),
    titleEn: text("title_en"),
    description: text("description").notNull(),
    descriptionEn: text("description_en"),
    imageUrl: text("image_url").notNull(),
    priceLabel: text("price_label"),
    ctaUrl: text("cta_url"),
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
