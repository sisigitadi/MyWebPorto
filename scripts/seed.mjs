import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import fs from "fs";
import path from "path";
import postgres from "postgres";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("❌ DATABASE_URL tidak ditemukan di .env.local atau environment variables.");
  process.exit(1);
}

const sql = postgres(dbUrl, { prepare: false });

async function seed() {
  console.log("🌱 Menjalankan seed data ke PostgreSQL (Supabase / Universal)...");

  try {
    // 1. Media Library (bila file ada di disk)
    const mediaFiles = [
      { id: "caa97511-be71-4c45-8972-7a01ffc722dc", file: "profile-avatar.jpg", mime: "image/jpeg", name: "profile-avatar.jpg" },
      { id: "ab382469-a191-4094-8514-eaafb01801f9", file: "1791098437470-5b89105b.png", mime: "image/png", name: "payment-qris.png" },
      { id: "a269091a-0db1-4c1a-ae11-34543cd41224", file: "1789433754543-7f16f6aa.webp", mime: "image/webp", name: "fajar-nugroho-avatar.webp" },
      { id: "3f069a13-121d-485a-9daa-7596533d5412", file: "1789177425748-93e9001a.png", mime: "image/png", name: "halaqah-dashboard-cover.png" },
      { id: "0b15a13f-7953-49ec-b55e-9c95bf9d6767", file: "1791150657181-86612d05.png", mime: "image/png", name: "chatgpt-video-cover.png" },
    ];

    for (const m of mediaFiles) {
      const fullPath = path.join(process.cwd(), "public", "uploads", m.file);
      if (fs.existsSync(fullPath)) {
        const buffer = fs.readFileSync(fullPath);
        await sql`
          INSERT INTO media (id, name, mime, size, data, created_at)
          VALUES (${m.id}, ${m.name}, ${m.mime}, ${buffer.length}, ${buffer}, NOW())
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            mime = EXCLUDED.mime,
            size = EXCLUDED.size,
            data = EXCLUDED.data;
        `;
      }
    }
    console.log("✅ Media library berhasil diperiksa & di-seed.");

    // 2. Baca data/local-store.json bila tersedia
    const storePath = path.join(process.cwd(), "data", "local-store.json");
    let store = null;
    if (fs.existsSync(storePath)) {
      try {
        store = JSON.parse(fs.readFileSync(storePath, "utf-8"));
      } catch (e) {
        console.warn("⚠️ Gagal membaca data/local-store.json, beralih ke fallback dummy:", e);
      }
    }

    // 3. Profil
    const p = store?.profile || {
      id: "owner",
      name: "Sigit",
      headline: "Web Developer & Systems Architect",
      headlineEn: "Web Developer & Systems Architect",
      bio: "Saya membantu UMKM dan kreator digital membangun website yang cepat, profesional, dan mudah digunakan.",
      bioEn: "I help SMBs and digital creators build fast, professional, and intuitive websites.",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=600&auto=format&fit=crop",
      email: "x@sigitadi.id",
      phone: "6281234567890",
      location: "Indonesia",
      availableForHire: true,
      skills: ["Next.js 15", "React", "TypeScript", "Tailwind CSS", "Drizzle ORM", "PostgreSQL", "UI/UX Design", "Content Strategy"],
      stats: [{ label: "Tahun Pengalaman", labelEn: "Years Experience", value: "4+" }, { label: "Proyek Selesai", labelEn: "Projects Done", value: "25+" }, { label: "Kepuasan Klien", labelEn: "Client Rating", value: "100%" }],
      socialLinks: { github: "https://github.com/sisigitadi", linkedin: "https://linkedin.com/in/sigit", instagram: "https://instagram.com/sigit", twitter: "https://twitter.com/sigit" },
    };

    await sql`
      INSERT INTO profiles (
        id, name, headline, headline_en, bio, bio_en, avatar_url, email, phone, location,
        cv_url, payment_qr_url, payment_bank_info, available_for_hire, availability_badge,
        availability_badge_en, skills, stats, social_links, updated_at
      ) VALUES (
        ${p.id || "owner"},
        ${p.name},
        ${p.headline},
        ${p.headlineEn || null},
        ${p.bio},
        ${p.bioEn || null},
        ${p.avatarUrl || null},
        ${p.email},
        ${p.phone || null},
        ${p.location || null},
        ${p.cvUrl || null},
        ${p.paymentQrUrl || null},
        ${p.paymentBankInfo || null},
        ${p.availableForHire ?? true},
        ${p.availabilityBadge || null},
        ${p.availabilityBadgeEn || null},
        ${JSON.stringify(p.skills || [])}::jsonb,
        ${JSON.stringify(p.stats || [])}::jsonb,
        ${JSON.stringify(p.socialLinks || {})}::jsonb,
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        headline = EXCLUDED.headline,
        headline_en = EXCLUDED.headline_en,
        bio = EXCLUDED.bio,
        bio_en = EXCLUDED.bio_en,
        avatar_url = EXCLUDED.avatar_url,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        location = EXCLUDED.location,
        cv_url = EXCLUDED.cv_url,
        payment_qr_url = EXCLUDED.payment_qr_url,
        payment_bank_info = EXCLUDED.payment_bank_info,
        available_for_hire = EXCLUDED.available_for_hire,
        availability_badge = EXCLUDED.availability_badge,
        availability_badge_en = EXCLUDED.availability_badge_en,
        skills = EXCLUDED.skills,
        stats = EXCLUDED.stats,
        social_links = EXCLUDED.social_links,
        updated_at = NOW();
    `;
    console.log("✅ Profil 'owner' berhasil di-seed.");

    // 4. Layanan (Services)
    const services = store?.services || [
      { id: "serv-1", title: "Pembuatan Website Profesional", titleEn: "Professional Website Development", description: "Saya membantu Anda membuat website company profile, landing page, atau aplikasi bisnis yang modern, responsif, dan optimal dalam kecepatan akses.", descriptionEn: "I help you craft modern, responsive, and ultra-fast company profiles, high-converting landing pages, and web applications tailored to your business needs.", order: 1 },
      { id: "serv-2", title: "UI/UX Design & Prototyping", titleEn: "UI/UX Design & Prototyping", description: "Saya merancang antarmuka aplikasi yang bersih, mudah dipakai pengguna awam, dan selaras dengan identitas visual merek Anda menggunakan Figma.", descriptionEn: "I design clean, intuitive interfaces and interactive prototypes that seamlessly align with your visual identity using Figma.", order: 2 },
      { id: "serv-3", title: "Optimasi Kinerja & SEO Web", titleEn: "Performance Optimization & Web SEO", description: "Audit mendalam terhadap performa web, Core Web Vitals, struktur metadata Open Graph, serta optimasi kecepatan muat halaman untuk peringkat Google lebih tinggi.", descriptionEn: "In-depth audits on Core Web Vitals, metadata structuring, and loading speed optimization to ensure higher search rankings and smoother UX.", order: 3 },
    ];

    for (const s of services) {
      await sql`
        INSERT INTO services (id, title, title_en, description, description_en, published, "order", updated_at, created_at)
        VALUES (${s.id}, ${s.title}, ${s.titleEn || null}, ${s.description}, ${s.descriptionEn || null}, ${s.published ?? true}, ${s.order ?? 0}, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          title_en = EXCLUDED.title_en,
          description = EXCLUDED.description,
          description_en = EXCLUDED.description_en,
          published = EXCLUDED.published,
          "order" = EXCLUDED."order",
          updated_at = NOW();
      `;
    }
    console.log(`✅ Layanan berhasil di-seed (${services.length} item).`);

    // 5. Proyek (Projects)
    const projects = store?.projects || [];
    for (const pr of projects) {
      await sql`
        INSERT INTO projects (
          id, slug, title, title_en, summary, summary_en, description, description_en,
          image_url, demo_url, repo_url, tech_stacks, featured, published, "order",
          publish_at, updated_at, created_at
        ) VALUES (
          ${pr.id}, ${pr.slug}, ${pr.title}, ${pr.titleEn || null}, ${pr.summary || null},
          ${pr.summaryEn || null}, ${pr.description}, ${pr.descriptionEn || null},
          ${pr.thumbnailUrl || pr.imageUrl}, ${pr.demoUrl || null}, ${pr.repoUrl || null},
          ${JSON.stringify(pr.techStack || pr.techStacks || [])}::jsonb,
          ${pr.featured ?? false}, ${pr.published ?? true}, ${pr.order ?? 0},
          ${pr.publishAt ? new Date(pr.publishAt) : null}, NOW(),
          ${pr.createdAt ? new Date(pr.createdAt) : new Date()}
        )
        ON CONFLICT (id) DO UPDATE SET
          slug = EXCLUDED.slug,
          title = EXCLUDED.title,
          title_en = EXCLUDED.title_en,
          summary = EXCLUDED.summary,
          summary_en = EXCLUDED.summary_en,
          description = EXCLUDED.description,
          description_en = EXCLUDED.description_en,
          image_url = EXCLUDED.image_url,
          demo_url = EXCLUDED.demo_url,
          repo_url = EXCLUDED.repo_url,
          tech_stacks = EXCLUDED.tech_stacks,
          featured = EXCLUDED.featured,
          published = EXCLUDED.published,
          "order" = EXCLUDED."order",
          publish_at = EXCLUDED.publish_at,
          updated_at = NOW();
      `;
    }
    console.log(`✅ Proyek berhasil di-seed (${projects.length} item).`);

    // 6. Produk (Products)
    const products = store?.products || [];
    for (const prod of products) {
      await sql`
        INSERT INTO products (
          id, slug, title, title_en, description, description_en, image_url, price_label,
          price_label_en, compare_price_label, price_amount, badge, category, stock,
          gallery, cta_url, purchase_type, custom_whatsapp, custom_button_label,
          referral_code, published, "order", updated_at, created_at
        ) VALUES (
          ${prod.id}, ${prod.slug || null}, ${prod.title}, ${prod.titleEn || null},
          ${prod.description}, ${prod.descriptionEn || null},
          ${prod.thumbnailUrl || prod.imageUrl},
          ${prod.priceFormatted || prod.priceLabel || null},
          ${prod.priceLabelEn || null}, ${prod.comparePriceLabel || null},
          ${prod.priceAmount || null}, ${prod.badge || null}, ${prod.category || null},
          ${prod.stock || null}, ${JSON.stringify(prod.gallery || [])}::jsonb,
          ${prod.ctaUrl || null}, ${prod.purchaseType || "whatsapp"},
          ${prod.customWhatsapp || null}, ${prod.customButtonLabel || null},
          ${prod.referralCode || null}, ${prod.published ?? true}, ${prod.order ?? 0},
          NOW(), NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          slug = EXCLUDED.slug,
          title = EXCLUDED.title,
          title_en = EXCLUDED.title_en,
          description = EXCLUDED.description,
          description_en = EXCLUDED.description_en,
          image_url = EXCLUDED.image_url,
          price_label = EXCLUDED.price_label,
          price_label_en = EXCLUDED.price_label_en,
          compare_price_label = EXCLUDED.compare_price_label,
          price_amount = EXCLUDED.price_amount,
          badge = EXCLUDED.badge,
          category = EXCLUDED.category,
          stock = EXCLUDED.stock,
          gallery = EXCLUDED.gallery,
          cta_url = EXCLUDED.cta_url,
          purchase_type = EXCLUDED.purchase_type,
          published = EXCLUDED.published,
          "order" = EXCLUDED."order",
          updated_at = NOW();
      `;
    }
    console.log(`✅ Produk berhasil di-seed (${products.length} item).`);

    // 7. Testimoni (Testimonials)
    const testimonials = store?.testimonials || [];
    for (const t of testimonials) {
      await sql`
        INSERT INTO testimonials (
          id, client_name, client_role, client_role_en, content, content_en,
          avatar_url, rating, published, "order", updated_at, created_at
        ) VALUES (
          ${t.id}, ${t.clientName}, ${t.clientRole || null}, ${t.clientRoleEn || null},
          ${t.content}, ${t.contentEn || null}, ${t.avatarUrl || null},
          ${t.rating ?? 5}, ${t.published ?? true}, ${t.order ?? 0}, NOW(), NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          client_name = EXCLUDED.client_name,
          client_role = EXCLUDED.client_role,
          client_role_en = EXCLUDED.client_role_en,
          content = EXCLUDED.content,
          content_en = EXCLUDED.content_en,
          avatar_url = EXCLUDED.avatar_url,
          rating = EXCLUDED.rating,
          published = EXCLUDED.published,
          "order" = EXCLUDED."order",
          updated_at = NOW();
      `;
    }
    console.log(`✅ Testimoni berhasil di-seed (${testimonials.length} item).`);

    // 8. Artikel (Articles)
    const articles = store?.articles || [];
    for (const a of articles) {
      await sql`
        INSERT INTO articles (
          id, slug, title, title_en, summary, summary_en, content, content_en,
          image_url, tags, featured, published, "order", publish_at, updated_at, created_at
        ) VALUES (
          ${a.id}, ${a.slug}, ${a.title}, ${a.titleEn || null}, ${a.summary || null},
          ${a.summaryEn || null}, ${a.content}, ${a.contentEn || null},
          ${a.imageUrl || null}, ${JSON.stringify(a.tags || [])}::jsonb,
          ${a.featured ?? false}, ${a.published ?? true}, ${a.order ?? 0},
          ${a.publishAt ? new Date(a.publishAt) : null}, NOW(),
          ${a.createdAt ? new Date(a.createdAt) : new Date()}
        )
        ON CONFLICT (id) DO UPDATE SET
          slug = EXCLUDED.slug,
          title = EXCLUDED.title,
          title_en = EXCLUDED.title_en,
          summary = EXCLUDED.summary,
          summary_en = EXCLUDED.summary_en,
          content = EXCLUDED.content,
          content_en = EXCLUDED.content_en,
          image_url = EXCLUDED.image_url,
          tags = EXCLUDED.tags,
          featured = EXCLUDED.featured,
          published = EXCLUDED.published,
          "order" = EXCLUDED."order",
          publish_at = EXCLUDED.publish_at,
          updated_at = NOW();
      `;
    }
    console.log(`✅ Artikel berhasil di-seed (${articles.length} item).`);

    // 9. Pengaturan (Settings)
    const settingsPath = path.join(process.cwd(), "data", "local-settings.json");
    if (fs.existsSync(settingsPath)) {
      const settingsData = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
      for (const [key, value] of Object.entries(settingsData)) {
        await sql`
          INSERT INTO settings (key, value, updated_at)
          VALUES (${key}, ${JSON.stringify(value)}::jsonb, NOW())
          ON CONFLICT (key) DO UPDATE SET
            value = EXCLUDED.value,
            updated_at = NOW();
        `;
      }
      console.log("✅ Pengaturan berhasil di-seed.");
    }

    console.log("\n🎉 SELURUH DATA AWAL BERHASIL DI-SEED KE POSTGRESQL!");
  } catch (error) {
    console.error("❌ Gagal melakukan seed:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

seed();
