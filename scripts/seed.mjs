import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { neon } from "@neondatabase/serverless";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("❌ DATABASE_URL tidak ditemukan di .env.local atau environment variables.");
  process.exit(1);
}

const sql = neon(dbUrl);

async function seed() {
  console.log("🌱 Menjalankan seed data awal ke Neon PostgreSQL...");

  try {
    // 1. Profil
    await sql`
      INSERT INTO profiles (
        id, name, headline, headline_en, bio, bio_en, avatar_url, email, phone, location, available_for_hire, skills, stats, social_links, updated_at
      ) VALUES (
        'owner',
        'Sigit',
        'Web Developer & Systems Architect',
        'Web Developer & Systems Architect',
        'Saya membantu UMKM dan kreator digital membangun website yang cepat, profesional, dan mudah digunakan.',
        'I help SMBs and digital creators build fast, professional, and intuitive websites.',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=600&auto=format&fit=crop',
        'halo@sigit.dev',
        '6281234567890',
        'Indonesia',
        true,
        '["Next.js 15", "React", "TypeScript", "Tailwind CSS", "Drizzle ORM", "PostgreSQL", "UI/UX Design", "Content Strategy"]'::jsonb,
        '[{"label": "Tahun Pengalaman", "labelEn": "Years Experience", "value": "4+"}, {"label": "Proyek Selesai", "labelEn": "Projects Done", "value": "25+"}, {"label": "Kepuasan Klien", "labelEn": "Client Rating", "value": "100%"}]'::jsonb,
        '{"github": "https://github.com/sisigitadi", "linkedin": "https://linkedin.com/in/sigit", "instagram": "https://instagram.com/sigit", "twitter": "https://twitter.com/sigit"}'::jsonb,
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        headline = EXCLUDED.headline,
        bio = EXCLUDED.bio,
        updated_at = NOW();
    `;
    console.log("✅ Profil 'owner' berhasil di-seed.");

    // 2. Layanan (Services)
    const services = [
      {
        id: "serv-1",
        title: "Pembuatan Website Profesional",
        titleEn: "Professional Website Development",
        description: "Saya membantu Anda membuat website company profile, landing page, atau aplikasi bisnis yang modern, responsif, dan optimal dalam kecepatan akses.",
        descriptionEn: "I help you craft modern, responsive, and ultra-fast company profiles, high-converting landing pages, and web applications tailored to your business needs.",
        order: 1,
      },
      {
        id: "serv-2",
        title: "UI/UX Design & Prototyping",
        titleEn: "UI/UX Design & Prototyping",
        description: "Saya merancang antarmuka aplikasi yang bersih, mudah dipakai pengguna awam, dan selaras dengan identitas visual merek Anda menggunakan Figma.",
        descriptionEn: "I design clean, intuitive interfaces and interactive prototypes that seamlessly align with your visual identity using Figma.",
        order: 2,
      },
      {
        id: "serv-3",
        title: "Optimasi Kinerja & SEO Web",
        titleEn: "Performance Optimization & Web SEO",
        description: "Audit mendalam terhadap performa web, Core Web Vitals, struktur metadata Open Graph, serta optimasi kecepatan muat halaman untuk peringkat Google lebih tinggi.",
        descriptionEn: "In-depth audits on Core Web Vitals, metadata structuring, and loading speed optimization to ensure higher search rankings and smoother UX.",
        order: 3,
      },
    ];

    for (const s of services) {
      await sql`
        INSERT INTO services (id, title, title_en, description, description_en, published, "order", updated_at, created_at)
        VALUES (${s.id}, ${s.title}, ${s.titleEn}, ${s.description}, ${s.descriptionEn}, true, ${s.order}, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          updated_at = NOW();
      `;
    }
    console.log("✅ Layanan berhasil di-seed (3 item).");

    // 3. Proyek (Projects)
    const projects = [
      {
        id: "proj-1",
        title: "Pojok Baca Digital",
        titleEn: "Digital Reading Corner",
        slug: "pojok-baca-digital",
        summary: "Aplikasi web perpustakaan digital untuk komunitas, dilengkapi katalog buku online, peminjaman otomatis, dan laporan statistik.",
        summaryEn: "Community digital library web application featuring online book catalogs, automated circulation, and statistical reports.",
        description: "Pojok Baca Digital dibangun untuk memfasilitasi kebutuhan taman bacaan masyarakat dalam mengelola sirkulasi peminjaman buku fisik dan e-book. Platform ini dilengkapi sistem autentikasi anggota, QR Code untuk scan cepat inventaris buku, dan dasbor analitik real-time.",
        descriptionEn: "Digital Reading Corner was built to streamline book circulation for community reading parks. Features member authentication, fast QR-code inventory scanning, and real-time analytical dashboards.",
        imageUrl: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?q=80&w=800&auto=format&fit=crop",
        demoUrl: "https://demo.pojokbaca.example.com",
        repoUrl: "https://github.com/sisigitadi/pojok-baca-digital",
        techStacks: JSON.stringify(["Next.js", "PostgreSQL", "Tailwind CSS", "Drizzle ORM"]),
        featured: true,
        order: 1,
      },
      {
        id: "proj-2",
        title: "Mading Online Sekolah",
        titleEn: "Online School Wall Magazine",
        slug: "mading-online-sekolah",
        summary: "Platform pengumuman dan majalah dinding digital untuk siswa dan guru di lingkungan sekolah menengah.",
        summaryEn: "Digital wall magazine and announcements platform for high school students and teachers.",
        description: "Sebuah platform informasi kampus yang memungkinkan tim jurnalis siswa mempublikasikan artikel, liputan kegiatan sekolah, karya sastra, serta pengumuman penting akademik secara mandiri dengan alur persetujuan guru pembina.",
        descriptionEn: "A campus media platform enabling student journalists to publish articles, school event coverages, creative writing, and academic announcements with approval workflows.",
        imageUrl: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=800&auto=format&fit=crop",
        demoUrl: "https://mading.sekolah.example.com",
        repoUrl: "https://github.com/sisigitadi/mading-online-sekolah",
        techStacks: JSON.stringify(["Laravel", "MySQL", "Bootstrap", "Alpine.js"]),
        featured: true,
        order: 2,
      },
      {
        id: "proj-3",
        title: "Sistem Kasir UMKM Sederhana",
        titleEn: "Simple POS for SMBs",
        slug: "sistem-kasir-umkm",
        summary: "Point of Sale (POS) berbasis web ringan untuk pencatatan transaksi kasir warung kopi dan cetak struk bluetooth.",
        summaryEn: "Lightweight web-based Point of Sale (POS) for coffee shops featuring daily transaction tracking and Bluetooth receipt printing.",
        description: "Solusi kasir web offline-first yang memudahkan barista dan pemilik kedai kopi mencatat transaksi harian, menghitung stok bahan baku secara otomatis, serta mencetak struk kasir melalui printer thermal.",
        descriptionEn: "Offline-first POS solution empowering coffee shop owners to record transactions, monitor inventory levels automatically, and print receipts via thermal printers.",
        imageUrl: "https://images.unsplash.com/photo-1556742049-0a67c5574f73?q=80&w=800&auto=format&fit=crop",
        demoUrl: "https://pos-umkm.example.com",
        repoUrl: "https://github.com/sisigitadi/pos-umkm",
        techStacks: JSON.stringify(["React", "TypeScript", "Tailwind CSS", "IndexedDB"]),
        featured: true,
        order: 3,
      },
    ];

    for (const p of projects) {
      await sql`
        INSERT INTO projects (
          id, slug, title, title_en, summary, summary_en, description, description_en, image_url, demo_url, repo_url, tech_stacks, featured, published, "order", updated_at, created_at
        ) VALUES (
          ${p.id}, ${p.slug}, ${p.title}, ${p.titleEn}, ${p.summary}, ${p.summaryEn}, ${p.description}, ${p.descriptionEn}, ${p.imageUrl}, ${p.demoUrl}, ${p.repoUrl}, ${p.techStacks}::jsonb, ${p.featured}, true, ${p.order}, NOW(), NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          title_en = EXCLUDED.title_en,
          summary = EXCLUDED.summary,
          summary_en = EXCLUDED.summary_en,
          description = EXCLUDED.description,
          description_en = EXCLUDED.description_en,
          updated_at = NOW();
      `;
    }
    console.log("✅ Proyek berhasil di-seed (3 item).");

    // 4. Produk (Products)
    const products = [
      {
        id: "prod-1",
        title: "Template Portfolio Notion",
        titleEn: "Notion Portfolio Template",
        description: "Template siap pakai dan modular untuk menyusun portofolio profesional di Notion hanya dalam 15 menit.",
        descriptionEn: "Modular, ready-to-use template to curate a polished, professional portfolio in Notion within 15 minutes.",
        priceLabel: "Rp75.000",
        imageUrl: "https://images.unsplash.com/photo-1517842645767-c639042777db?q=80&w=600&auto=format&fit=crop",
        ctaUrl: "https://karyakarsa.com/sigitadi/template-notion-porto",
        order: 1,
      },
      {
        id: "prod-2",
        title: "E-book Belajar Freelance",
        titleEn: "Freelance Mastery E-book",
        description: "Panduan praktis langkah demi langkah memulai karier freelance untuk pemula, mulai dari negosiasi tarif hingga kontrak kerja.",
        descriptionEn: "Practical step-by-step beginner guide to launching a freelance career, from pricing negotiation to contracts.",
        priceLabel: "Rp49.000",
        imageUrl: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=600&auto=format&fit=crop",
        ctaUrl: "#kontak",
        order: 2,
      },
    ];

    for (const pr of products) {
      await sql`
        INSERT INTO products (
          id, title, title_en, description, description_en, image_url, price_label, cta_url, published, "order", updated_at, created_at
        ) VALUES (
          ${pr.id}, ${pr.title}, ${pr.titleEn}, ${pr.description}, ${pr.descriptionEn}, ${pr.imageUrl}, ${pr.priceLabel}, ${pr.ctaUrl}, true, ${pr.order}, NOW(), NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          title_en = EXCLUDED.title_en,
          description = EXCLUDED.description,
          description_en = EXCLUDED.description_en,
          cta_url = EXCLUDED.cta_url,
          updated_at = NOW();
      `;
    }
    console.log("✅ Produk berhasil di-seed (2 item).");

    // 5. Testimoni (Testimonials)
    const testimonials = [
      {
        id: "testi-1",
        clientName: "Budi Santoso",
        clientRole: "Owner, Kopi Senja Mandiri",
        clientRoleEn: "Owner, Kopi Senja Mandiri",
        content: "Website profil dan POS yang dibangun sangat membantu efisiensi operasional kami. Pelayanan ramah, responsif, dan pengerjaan tepat waktu.",
        contentEn: "The portfolio website and lightweight POS drastically improved our operational efficiency. Fast response, friendly communication, and timely delivery.",
        avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=300&auto=format&fit=crop",
        rating: 5,
        order: 1,
      },
      {
        id: "testi-2",
        clientName: "Rina Wijaya",
        clientRole: "Ketua Yayasan Taman Baca",
        clientRoleEn: "Head of Reading Corner Foundation",
        content: "Aplikasi Pojok Baca Digital kami sekarang dipakai oleh ratusan anggota warga. Desainnya bersih dan sangat mudah dipahami oleh pengurus yang awam teknologi.",
        contentEn: "Our digital library platform is now used by hundreds of community members. Clean UI and effortlessly operated by non-tech coordinators.",
        avatarUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=300&auto=format&fit=crop",
        rating: 5,
        order: 2,
      },
    ];

    for (const t of testimonials) {
      await sql`
        INSERT INTO testimonials (
          id, client_name, client_role, client_role_en, content, content_en, avatar_url, rating, published, "order", updated_at, created_at
        ) VALUES (
          ${t.id}, ${t.clientName}, ${t.clientRole}, ${t.clientRoleEn}, ${t.content}, ${t.contentEn}, ${t.avatarUrl}, ${t.rating}, true, ${t.order}, NOW(), NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          client_name = EXCLUDED.client_name,
          content = EXCLUDED.content,
          content_en = EXCLUDED.content_en,
          rating = EXCLUDED.rating,
          updated_at = NOW();
      `;
    }
    console.log("✅ Testimoni berhasil di-seed (2 item).");

    console.log("\n🎉 SELURUH DATA AWAL BERHASIL DI-SEED KE NEON POSTGRESQL!");
  } catch (error) {
    console.error("❌ Gagal melakukan seed:", error);
    process.exit(1);
  }
}

seed();
