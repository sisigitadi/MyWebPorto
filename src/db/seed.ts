import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import {
  DUMMY_PROFILE,
  DUMMY_SERVICES,
  DUMMY_PROJECTS,
  DUMMY_PRODUCTS,
  DUMMY_TESTIMONIALS,
} from "../lib/dummy-data";

async function seed() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.warn("⚠️ DATABASE_URL tidak ditemukan. Lewati eksekusi live database, seed script siap dijalankan saat env diisi.");
    return;
  }

  const sql = neon(dbUrl);
  const db = drizzle(sql, { schema });

  console.log("🌱 Menjalankan seed data ke database...");

  // 1. Seed Profile
  await db
    .insert(schema.profiles)
    .values({
      id: "owner",
      name: DUMMY_PROFILE.name,
      headline: DUMMY_PROFILE.headline,
      bio: DUMMY_PROFILE.bio,
      avatarUrl: DUMMY_PROFILE.avatarUrl,
      email: DUMMY_PROFILE.email,
      phone: DUMMY_PROFILE.phone,
      location: DUMMY_PROFILE.location,
      availableForHire: DUMMY_PROFILE.availableForHire,
      skills: DUMMY_PROFILE.skills,
      stats: DUMMY_PROFILE.stats,
      socialLinks: DUMMY_PROFILE.socialLinks,
    })
    .onConflictDoUpdate({
      target: schema.profiles.id,
      set: {
        name: DUMMY_PROFILE.name,
        headline: DUMMY_PROFILE.headline,
        bio: DUMMY_PROFILE.bio,
        avatarUrl: DUMMY_PROFILE.avatarUrl,
        email: DUMMY_PROFILE.email,
        phone: DUMMY_PROFILE.phone,
        location: DUMMY_PROFILE.location,
        availableForHire: DUMMY_PROFILE.availableForHire,
        skills: DUMMY_PROFILE.skills,
        stats: DUMMY_PROFILE.stats,
        socialLinks: DUMMY_PROFILE.socialLinks,
        updatedAt: new Date(),
      },
    });

  // 2. Seed Services
  for (const s of DUMMY_SERVICES) {
    await db
      .insert(schema.services)
      .values({
        id: s.id,
        title: s.title,
        description: s.description,
        order: s.order,
        published: s.published,
      })
      .onConflictDoNothing();
  }

  // 3. Seed Projects
  for (let i = 0; i < DUMMY_PROJECTS.length; i++) {
    const p = DUMMY_PROJECTS[i];
    await db
      .insert(schema.projects)
      .values({
        id: p.id,
        slug: p.slug,
        title: p.title,
        description: p.description,
        imageUrl: p.thumbnailUrl,
        demoUrl: p.demoUrl,
        repoUrl: p.repoUrl,
        techStacks: p.techStack,
        featured: p.featured,
        published: p.published,
        order: i + 1,
      })
      .onConflictDoNothing();
  }

  // 4. Seed Products
  for (let i = 0; i < DUMMY_PRODUCTS.length; i++) {
    const pr = DUMMY_PRODUCTS[i];
    await db
      .insert(schema.products)
      .values({
        id: pr.id,
        title: pr.title,
        description: pr.description,
        imageUrl: pr.thumbnailUrl,
        priceLabel: pr.priceFormatted,
        published: pr.published,
        order: i + 1,
      })
      .onConflictDoNothing();
  }

  // 5. Seed Testimonials
  for (let i = 0; i < DUMMY_TESTIMONIALS.length; i++) {
    const t = DUMMY_TESTIMONIALS[i];
    await db
      .insert(schema.testimonials)
      .values({
        id: t.id,
        clientName: t.clientName,
        clientRole: t.clientRole,
        content: t.content,
        avatarUrl: t.avatarUrl,
        published: t.published,
        order: i + 1,
      })
      .onConflictDoNothing();
  }

  console.log("✅ Seed database berhasil diselesaikan!");
}

seed().catch((err) => {
  console.error("❌ Terjadi error saat seed database:", err);
  process.exit(1);
});
