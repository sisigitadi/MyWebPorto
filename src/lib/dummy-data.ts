export interface ProfileData {
  id: string;
  name: string;
  headline: string;
  headlineEn?: string | null;
  bio: string;
  bioEn?: string | null;
  avatarUrl: string;
  email: string;
  phone: string;
  location: string;
  availableForHire: boolean;
  skills: string[];
  stats: {
    label: string;
    labelEn?: string | null;
    value: string;
  }[];
  socialLinks: {
    github?: string;
    linkedin?: string;
    instagram?: string;
    twitter?: string;
  };
}

export interface ProjectData {
  id: string;
  title: string;
  titleEn?: string | null;
  slug: string;
  summary: string;
  summaryEn?: string | null;
  description: string;
  descriptionEn?: string | null;
  thumbnailUrl: string;
  techStack: string[];
  demoUrl?: string | null;
  repoUrl?: string | null;
  featured: boolean;
  published: boolean;
  createdAt: string;
}

export interface ServiceData {
  id: string;
  order: number;
  title: string;
  titleEn?: string | null;
  description: string;
  descriptionEn?: string | null;
  published: boolean;
}

export interface ProductData {
  id: string;
  title: string;
  titleEn?: string | null;
  description: string;
  descriptionEn?: string | null;
  priceFormatted: string;
  thumbnailUrl: string;
  ctaUrl: string;
  published: boolean;
}

export interface TestimonialData {
  id: string;
  clientName: string;
  clientRole: string;
  clientRoleEn?: string | null;
  avatarUrl?: string | null;
  content: string;
  contentEn?: string | null;
  rating: number;
  published: boolean;
}

export const DUMMY_PROFILE: ProfileData = {
  id: "owner",
  name: "Dimas Prasetya",
  headline: "Web Developer & Content Creator",
  headlineEn: "Web Developer & Content Creator",
  bio: "Saya membantu UMKM dan kreator digital membangun website yang cepat, profesional, dan mudah digunakan.",
  bioEn: "I help SMBs and digital creators build fast, professional, and intuitive websites.",
  avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=600&auto=format&fit=crop",
  email: "halo@dimasprasetya.com",
  phone: "6281234567890",
  location: "Jakarta, Indonesia",
  availableForHire: true,
  skills: [
    "Next.js 15",
    "React",
    "TypeScript",
    "Tailwind CSS",
    "Drizzle ORM",
    "PostgreSQL",
    "UI/UX Design",
    "Content Strategy",
  ],
  stats: [
    { label: "Tahun Pengalaman", labelEn: "Years Experience", value: "4+" },
    { label: "Proyek Selesai", labelEn: "Projects Done", value: "25+" },
    { label: "Kepuasan Klien", labelEn: "Client Rating", value: "100%" },
  ],
  socialLinks: {
    github: "https://github.com/dimasprasetya",
    linkedin: "https://linkedin.com/in/dimasprasetya",
    instagram: "https://instagram.com/dimasprasetya",
    twitter: "https://twitter.com/dimasprasetya",
  },
};

export const DUMMY_SERVICES: ServiceData[] = [
  {
    id: "serv-1",
    order: 1,
    title: "Pembuatan Website Profesional",
    titleEn: "Professional Website Development",
    description:
      "Saya membantu Anda membuat website company profile, landing page, atau aplikasi bisnis yang modern, responsif, dan optimal dalam kecepatan akses.",
    descriptionEn:
      "I help you craft modern, responsive, and ultra-fast company profiles, high-converting landing pages, and web applications tailored to your business needs.",
    published: true,
  },
  {
    id: "serv-2",
    order: 2,
    title: "UI/UX Design & Prototyping",
    titleEn: "UI/UX Design & Prototyping",
    description:
      "Saya merancang antarmuka aplikasi yang bersih, mudah dipakai pengguna awam, dan selaras dengan identitas visual merek Anda menggunakan Figma.",
    descriptionEn:
      "I design clean, intuitive interfaces and interactive prototypes that seamlessly align with your visual identity using Figma.",
    published: true,
  },
  {
    id: "serv-3",
    order: 3,
    title: "Optimasi Kinerja & SEO Web",
    titleEn: "Performance Optimization & Web SEO",
    description:
      "Audit mendalam terhadap performa web, Core Web Vitals, struktur metadata Open Graph, serta optimasi kecepatan muat halaman untuk peringkat Google lebih tinggi.",
    descriptionEn:
      "In-depth audits on Core Web Vitals, metadata structuring, and loading speed optimization to ensure higher search rankings and smoother UX.",
    published: true,
  },
];

export const DUMMY_PROJECTS: ProjectData[] = [
  {
    id: "proj-1",
    title: "Pojok Baca Digital",
    titleEn: "Digital Reading Corner",
    slug: "pojok-baca-digital",
    summary:
      "Aplikasi web perpustakaan digital untuk komunitas, dilengkapi katalog buku online, peminjaman otomatis, dan laporan statistik.",
    summaryEn:
      "Community digital library web application featuring online book catalogs, automated circulation, and statistical reports.",
    description:
      "Pojok Baca Digital dibangun untuk memfasilitasi kebutuhan taman bacaan masyarakat dalam mengelola sirkulasi peminjaman buku fisik dan e-book. Platform ini dilengkapi sistem autentikasi anggota, QR Code untuk scan cepat inventaris buku, dan dasbor analitik real-time.",
    descriptionEn:
      "Digital Reading Corner was built to streamline book circulation for community reading parks. Features member authentication, fast QR-code inventory scanning, and real-time analytical dashboards.",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?q=80&w=800&auto=format&fit=crop",
    techStack: ["Next.js", "PostgreSQL", "Tailwind CSS", "Drizzle ORM"],
    demoUrl: "https://demo.pojokbaca.example.com",
    repoUrl: "https://github.com/dimasprasetya/pojok-baca-digital",
    featured: true,
    published: true,
    createdAt: "2024-02-15",
  },
  {
    id: "proj-2",
    title: "Mading Online Sekolah",
    titleEn: "Online School Wall Magazine",
    slug: "mading-online-sekolah",
    summary:
      "Platform pengumuman dan majalah dinding digital untuk siswa dan guru di lingkungan sekolah menengah.",
    summaryEn:
      "Digital wall magazine and announcements platform for high school students and teachers.",
    description:
      "Sebuah platform informasi kampus yang memungkinkan tim jurnalis siswa mempublikasikan artikel, liputan kegiatan sekolah, karya sastra, serta pengumuman penting akademik secara mandiri dengan alur persetujuan guru pembina.",
    descriptionEn:
      "A campus media platform enabling student journalists to publish articles, school event coverages, creative writing, and academic announcements with approval workflows.",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=800&auto=format&fit=crop",
    techStack: ["Laravel", "MySQL", "Bootstrap", "Alpine.js"],
    demoUrl: "https://mading.sekolah.example.com",
    repoUrl: "https://github.com/dimasprasetya/mading-online-sekolah",
    featured: true,
    published: true,
    createdAt: "2023-11-20",
  },
  {
    id: "proj-3",
    title: "Sistem Kasir UMKM Sederhana",
    titleEn: "Simple POS for SMBs",
    slug: "sistem-kasir-umkm",
    summary:
      "Point of Sale (POS) berbasis web ringan untuk pencatatan transaksi kasir warung kopi dan cetak struk bluetooth.",
    summaryEn:
      "Lightweight web-based Point of Sale (POS) for coffee shops featuring daily transaction tracking and Bluetooth receipt printing.",
    description:
      "Solusi kasir web offline-first yang memudahkan barista dan pemilik kedai kopi mencatat transaksi harian, menghitung stok bahan baku secara otomatis, serta mencetak struk kasir melalui printer thermal.",
    descriptionEn:
      "Offline-first POS solution empowering coffee shop owners to record transactions, monitor inventory levels automatically, and print receipts via thermal printers.",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1556742049-0a67c5574f73?q=80&w=800&auto=format&fit=crop",
    techStack: ["React", "TypeScript", "Tailwind CSS", "IndexedDB"],
    demoUrl: "https://pos-umkm.example.com",
    repoUrl: "https://github.com/dimasprasetya/pos-umkm",
    featured: true,
    published: true,
    createdAt: "2023-08-10",
  },
];

export const DUMMY_PRODUCTS: ProductData[] = [
  {
    id: "prod-1",
    title: "Template Portfolio Notion",
    titleEn: "Notion Portfolio Template",
    description:
      "Template siap pakai dan modular untuk menyusun portofolio profesional di Notion hanya dalam 15 menit.",
    descriptionEn:
      "Modular, ready-to-use template to curate a polished, professional portfolio in Notion within 15 minutes.",
    priceFormatted: "Rp75.000",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1517842645767-c639042777db?q=80&w=600&auto=format&fit=crop",
    ctaUrl: "https://karyakarsa.com/dimasprasetya/template-notion-porto",
    published: true,
  },
  {
    id: "prod-2",
    title: "E-book Belajar Freelance",
    titleEn: "Freelance Mastery E-book",
    description:
      "Panduan praktis langkah demi langkah memulai karier freelance untuk pemula, mulai dari negosiasi tarif hingga kontrak kerja.",
    descriptionEn:
      "Practical step-by-step beginner guide to launching a freelance career, from pricing negotiation to contracts.",
    priceFormatted: "Rp49.000",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=600&auto=format&fit=crop",
    ctaUrl: "https://karyakarsa.com/dimasprasetya/ebook-freelance-pemula",
    published: true,
  },
];

export const DUMMY_TESTIMONIALS: TestimonialData[] = [
  {
    id: "testi-1",
    clientName: "Siti Rahma",
    clientRole: "Kepala Desa Digital, Komunitas Desa Cerdas",
    clientRoleEn: "Head of Digital Village, Smart Village Community",
    content:
      "Website desa kami jadi jauh lebih rapi, modern, dan sangat mudah dikelola oleh perangkat desa kami yang masih awam teknologi. Kerja sama dengan Mas Dimas sangat memuaskan!",
    contentEn:
      "Our village website is now exceptionally clean, modern, and effortless for our local staff to manage. Collaborating with Dimas was an absolute pleasure!",
    rating: 5,
    avatarUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=300&auto=format&fit=crop",
    published: true,
  },
  {
    id: "testi-2",
    clientName: "Bambang Kurniawan",
    clientRole: "Founder Kedai Seduh Sore",
    clientRoleEn: "Founder of Kedai Seduh Sore",
    content:
      "Sistem kasir dan landing page yang dibuatkan Mas Dimas berhasil meningkatkan efisiensi kedai kami secara signifikan. Pembukuan jadi transparan dan pelanggan terkesan dengan menu digitalnya.",
    contentEn:
      "The POS system and landing page developed by Dimas significantly elevated our coffee shop's efficiency. Bookkeeping is transparent and customers love the digital menu.",
    rating: 5,
    avatarUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=300&auto=format&fit=crop",
    published: true,
  },
];
