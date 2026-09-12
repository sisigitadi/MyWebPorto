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
    portfolio?: string;
    telegram?: string;
    tiktok?: string;
    youtube?: string;
    facebook?: string;
    discord?: string;
    slack?: string;
    reddit?: string;
    medium?: string;
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
  slug?: string | null;
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

export interface ArticleData {
  id: string;
  slug: string;
  title: string;
  titleEn?: string | null;
  summary?: string | null;
  summaryEn?: string | null;
  content: string;
  contentEn?: string | null;
  imageUrl?: string | null;
  tags: string[];
  featured: boolean;
  published: boolean;
  order: number;
  createdAt: string;
  updatedAt?: string;
}

export const DUMMY_PROFILE: ProfileData = {
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
    instagram: "https://instagram.com/si.sigitadi/",
    portfolio: "https://porto.sigitadi.id/",
    twitter: "",
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
    repoUrl: "https://github.com/sisigitadi/pojok-baca-digital",
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
    repoUrl: "https://github.com/sisigitadi/mading-online-sekolah",
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
    repoUrl: "https://github.com/sisigitadi/pos-umkm",
    featured: true,
    published: true,
    createdAt: "2023-08-10",
  },
];

export const DUMMY_PRODUCTS: ProductData[] = [
  {
    id: "prod-1",
    slug: "template-portfolio-notion",
    title: "Template Portfolio Notion",
    titleEn: "Notion Portfolio Template",
    description:
      "Template siap pakai dan modular untuk menyusun portofolio profesional di Notion hanya dalam 15 menit.",
    descriptionEn:
      "Modular, ready-to-use template to curate a polished, professional portfolio in Notion within 15 minutes.",
    priceFormatted: "Rp75.000",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1517842645767-c639042777db?q=80&w=600&auto=format&fit=crop",
    ctaUrl: "https://karyakarsa.com/sigitadi/template-notion-porto",
    published: true,
  },
  {
    id: "prod-2",
    slug: "e-book-belajar-freelance",
    title: "E-book Belajar Freelance",
    titleEn: "Freelance Mastery E-book",
    description:
      "Panduan praktis langkah demi langkah memulai karier freelance untuk pemula, mulai dari negosiasi tarif hingga kontrak kerja.",
    descriptionEn:
      "Practical step-by-step beginner guide to launching a freelance career, from pricing negotiation to contracts.",
    priceFormatted: "Rp49.000",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=600&auto=format&fit=crop",
    ctaUrl: "https://karyakarsa.com/sigitadi/ebook-freelance-pemula",
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
      "Website desa kami jadi jauh lebih rapi, modern, dan sangat mudah dikelola oleh perangkat desa kami yang masih awam teknologi. Kerja sama dengan Mas Sigit sangat memuaskan!",
    contentEn:
      "Our village website is now exceptionally clean, modern, and effortless for our local staff to manage. Collaborating with Sigit was an absolute pleasure!",
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
      "Sistem kasir dan landing page yang dibuatkan Mas Sigit berhasil meningkatkan efisiensi kedai kami secara signifikan. Pembukuan jadi transparan dan pelanggan terkesan dengan menu digitalnya.",
    contentEn:
      "The POS system and landing page developed by Sigit significantly elevated our coffee shop's efficiency. Bookkeeping is transparent and customers love the digital menu.",
    rating: 5,
    avatarUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=300&auto=format&fit=crop",
    published: true,
  },
];

export const DUMMY_ARTICLES: ArticleData[] = [
  {
    id: "art-1",
    slug: "arsitektur-retro-os-nextjs-15",
    title: "Membangun Antarmuka Retro OS Interaktif dengan Next.js 15 & GSAP",
    titleEn: "Building an Interactive Retro OS Interface with Next.js 15 & GSAP",
    summary:
      "Bagaimana merancang arsitektur windowing system klasik era 90-an yang tetap berkinerja tinggi, responsif di mobile, dan ramah SEO.",
    summaryEn:
      "How to architect a 90s classic windowing system that remains high-performance, mobile-responsive, and SEO friendly.",
    content: `Antarmuka bergaya sistem operasi retro (vintage desktop) memberikan pengalaman bernostalgia sekaligus pembeda visual yang kuat di tengah homogenitas desain web modern. Namun, tantangan terbesarnya adalah menjaga performa, aksesibilitas, dan keramahan SEO.

### 1. Struktur State Terpusat
Alih-alih membuat DOM yang saling tumpang tindih secara liar, kita memanfaatkan state terpusat di Next.js Client Component. Setiap window bertindak sebagai state machine dengan riwayat z-index dan koordinat layar.

### 2. Animasi Ringan dengan GSAP
Efek CRT scanline, window snap, dan transisi desktop diatur menggunakan GSAP Context agar aman dari memory leak dan mudah di-cleanup saat komponen di-unmount.

### 3. Progressive Enhancement untuk SEO
Halaman seperti portofolio dan detail artikel tetap memiliki URL mandiri dengan tag HTML semantik dan JSON-LD terstruktur, sehingga bot pencari Google tetap dapat mengindeks konten tanpa terhalang JavaScript retro.`,
    contentEn: `Retro OS-style interfaces offer nostalgic appeal and powerful visual differentiation amid modern web design uniformity. However, the core challenge is preserving performance, accessibility, and SEO integrity.

### 1. Centralized State Architecture
Rather than haphazard DOM layering, we manage active windows via centralized state within Next.js Client Components. Each window acts as a discrete state machine tracking z-index hierarchy and viewport constraints.

### 2. Lightweight GSAP Animations
CRT scanline flickers, window snapping, and desktop transitions are orchestrated via GSAP Context to avoid memory leaks and ensure tidy unmounting.

### 3. Progressive Enhancement for Search Engines
Standalone routes for projects and articles preserve full semantic HTML and structured JSON-LD schemas, ensuring search crawlers index content frictionlessly.`,
    imageUrl:
      "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=800&auto=format&fit=crop",
    tags: ["Next.js", "GSAP", "Architecture", "Retro UI"],
    featured: true,
    published: true,
    order: 1,
    createdAt: "2026-03-01T08:00:00.000Z",
  },
  {
    id: "art-2",
    slug: "optimasi-server-actions-drizzle-orm",
    title: "Strategi Dual-Persistence: Drizzle ORM + Local Store Fallback di Serverless",
    titleEn: "Dual-Persistence Strategy: Drizzle ORM + Local Store Fallback in Serverless",
    summary:
      "Mengamankan persistensi data portofolio pribadi agar tetap online dan dapat diedit baik ketika terkoneksi database cloud maupun mode lokal.",
    summaryEn:
      "Securing personal portfolio data persistence with seamless cloud database connectivity and local storage fallback.",
    content: `Di platform hosting modern seperti Vercel, cold-start atau limitasi koneksi database relasional sering menjadi hambatan bagi situs personal. Salah satu arsitektur tangguh adalah menerapkan Dual-Persistence Layer.

### Mengapa Perlu Fallback?
Ketika kredensial database belum diset atau terjadi network partition pada Neon PostgreSQL, aplikasi tidak boleh menampilkan error 500 fatal kepada pengunjung publik.

### Pola Server Action Bertingkat
1. Cek ketersediaan pool koneksi Drizzle.
2. Jika aktif, lakukan query SQL berindeks.
3. Jika gagal atau tidak terkonfigurasi, alihkan secara mulus ke serialized JSON store lokal.

Dengan pola ini, pengunjung selalu mendapatkan response cepat dalam hitungan milidetik tanpa downtime.`,
    contentEn: `On modern serverless platforms like Vercel, cold starts and relational database connection caps often pose hurdles for personal portfolios. A dual-persistence layer provides unmatched reliability.

### Why Fallbacks Matter
When cloud credentials are intentionally omitted in preview environments or database outages occur, public visitors should never see a fatal 500 page.

### Tiered Server Action Pattern
1. Probe Drizzle connection pool readiness.
2. If healthy, execute indexed relational queries.
3. If unreachable or unconfigured, seamlessly failover to a serialized local store.

This guarantee delivers sub-millisecond response times with zero public-facing downtime.`,
    imageUrl:
      "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=800&auto=format&fit=crop",
    tags: ["Drizzle ORM", "PostgreSQL", "Next.js", "Backend"],
    featured: true,
    published: true,
    order: 2,
    createdAt: "2026-03-05T10:30:00.000Z",
  },
  {
    id: "art-3",
    slug: "tips-freelance-developer-pemula",
    title: "5 Pelajaran Penting Memulai Karier Freelance Web Developer",
    titleEn: "5 Crucial Lessons for Starting a Web Developer Freelance Career",
    summary:
      "Menemukan klien pertama, menentukan pricing yang sehat, dan menyusun kontrak kerja transparan tanpa terjebak banting harga.",
    summaryEn:
      "Finding your first client, establishing healthy pricing models, and structuring transparent contracts without price wars.",
    content: `Memulai freelance bukan hanya soal menulis kode, melainkan tentang komunikasi bisnis dan penyelesaian masalah bagi klien.

### 1. Portofolio Nyata Mengalahkan CV Berlembar-lembar
Klien UMKM atau startup lebih peduli pada apakah Anda bisa menyelesaikan masalah mereka daripada sertifikat teori. Tunjukkan studi kasus nyata.

### 2. Hindari Berkompetisi di Harga Murah
Banting harga hanya akan menarik klien yang menuntut berlebihan dengan budget minim. Tawarkan paket solusi yang jelas dengan batasan revisi terukur.

### 3. Gunakan Kontrak Tertulis dan DP 50%
Jangan pernah memulai penulisan baris kode pertama sebelum DP diterima dan cakupan pekerjaan (Scope of Work) disepakati secara tertulis.`,
    contentEn: `Embarking on freelancing is far more than writing code—it is about business communication and solving high-value problems for clients.

### 1. Real Case Studies Beat Lengthy Resumes
Clients care about tangible outcomes rather than theoretical certificates. Showcase measurable problem-solving examples.

### 2. Never Compete in the Race to the Bottom
Underpricing inevitably attracts demanding clients with meager budgets. Offer transparent packages with explicit revision scopes.

### 3. Require Written Agreements and 50% Deposits
Never write the first line of production code before receiving a deposit and an agreed-upon Scope of Work.`,
    imageUrl:
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=800&auto=format&fit=crop",
    tags: ["Career", "Freelance", "Tips", "Business"],
    featured: false,
    published: true,
    order: 3,
    createdAt: "2026-03-08T14:15:00.000Z",
  },
  {
    id: "art-4",
    slug: "studi-kasus-pojok-baca-digital-nextjs-postgresql",
    title: "Studi Kasus Pojok Baca Digital: Membangun Perpustakaan Komunitas dengan Next.js dan PostgreSQL",
    titleEn: "Digital Reading Corner Case Study: Building a Community Library with Next.js and PostgreSQL",
    summary:
      "Membahas arsitektur katalog buku, autentikasi anggota, peminjaman, QR inventory, dan dashboard analitik untuk perpustakaan digital komunitas.",
    summaryEn:
      "A practical case study covering book catalogs, member authentication, lending workflows, QR inventory, and analytics for a community digital library.",
    content: `Pojok Baca Digital dirancang untuk menjawab masalah yang sering muncul pada taman bacaan komunitas: data buku tersebar, status peminjaman tidak konsisten, dan pengelola kesulitan membuat laporan.

### Arsitektur Data yang Sederhana
Katalog buku, anggota, dan transaksi peminjaman dipisahkan agar setiap perubahan memiliki sumber kebenaran yang jelas. PostgreSQL menangani relasi dan histori, sementara Next.js menyediakan antarmuka administrasi yang cepat.

### QR Inventory untuk Operasional Lapangan
QR code mempersingkat proses pencarian inventaris. Pengelola dapat memindai buku, melihat statusnya, dan memperbarui transaksi tanpa mengetik kode inventaris secara manual.

### Pelajaran SEO dan Produk
Halaman katalog publik harus memiliki URL yang stabil, judul buku yang semantik, dan metadata yang mudah dipahami mesin pencari. Studi kasus ini menunjukkan bahwa sistem komunitas tetap dapat dibangun dengan standar engineering yang rapi.`,
    contentEn: `Digital Reading Corner solves common community library problems: scattered book data, inconsistent lending status, and difficult reporting.

### A Simple Data Architecture
Books, members, and lending transactions are separated so every change has a clear source of truth. PostgreSQL handles relationships and history while Next.js provides a fast administration interface.

### QR Inventory for Field Operations
QR codes shorten inventory workflows. Staff can scan a book, inspect its status, and update a transaction without manually entering inventory codes.

### SEO and Product Lessons
Public catalog pages need stable URLs, semantic book titles, and machine-readable metadata. Community software can still follow disciplined engineering standards.`,
    imageUrl: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?q=80&w=800&auto=format&fit=crop",
    tags: ["Next.js", "PostgreSQL", "Digital Library", "QR Code", "Web Development", "SEO Indonesia"],
    featured: true,
    published: true,
    order: 4,
    createdAt: "2026-03-10T08:00:00.000Z",
  },
  {
    id: "art-5",
    slug: "studi-kasus-mading-online-sekolah-cms-editorial",
    title: "Studi Kasus Mading Online Sekolah: CMS Editorial Aman untuk Siswa dan Guru",
    titleEn: "Online School Wall Magazine Case Study: A Safe Editorial CMS for Students and Teachers",
    summary:
      "Mendesain CMS publikasi sekolah dengan workflow persetujuan guru, struktur artikel SEO-friendly, dan akses yang sesuai untuk penulis siswa.",
    summaryEn:
      "Designing a school publishing CMS with teacher approvals, SEO-friendly articles, and access controls suited to student writers.",
    content: `Mading Online Sekolah bukan sekadar blog. Sistem ini harus memberi ruang kreatif bagi siswa sekaligus menjaga kualitas, privasi, dan akurasi informasi yang dipublikasikan.

### Workflow Persetujuan
Penulis siswa dapat membuat draft, sedangkan guru pembina menjadi pemeriksa sebelum artikel diterbitkan. Status draft, review, dan published mencegah perubahan penting langsung tampil tanpa pengawasan.

### Struktur Konten yang Ramah Mesin Pencari
Setiap artikel memiliki slug, ringkasan, tag, tanggal terbit, dan data terstruktur. Kombinasi ini membantu artikel sekolah ditemukan untuk pencarian kegiatan, literasi, dan informasi akademik lokal.

### Prinsip Keamanan
Hak akses harus mengikuti peran. Validasi input, sanitasi konten, dan audit perubahan menjadi bagian dari fitur editorial, bukan tambahan belakangan.`,
    contentEn: `An online school wall magazine is more than a blog. It must give students creative space while preserving quality, privacy, and publishing accuracy.

### Approval Workflow
Student writers create drafts while teacher editors review them before publication. Draft, review, and published states prevent unmoderated changes from appearing publicly.

### Search-Friendly Content Structure
Each article uses a slug, summary, tags, publication date, and structured data. This helps school content rank for local activities, literacy, and academic information.

### Security Principles
Permissions must follow roles. Input validation, content sanitization, and change auditing belong inside the editorial feature itself.`,
    imageUrl: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=800&auto=format&fit=crop",
    tags: ["Laravel", "MySQL", "CMS", "School Technology", "Content Security", "Technical SEO"],
    featured: true,
    published: true,
    order: 5,
    createdAt: "2026-03-11T08:00:00.000Z",
  },
  {
    id: "art-6",
    slug: "studi-kasus-sistem-kasir-umkm-offline-first",
    title: "Studi Kasus Sistem Kasir UMKM: Strategi Offline-First untuk Transaksi Cepat",
    titleEn: "SMB Point-of-Sale Case Study: An Offline-First Strategy for Fast Transactions",
    summary:
      "Membahas POS web ringan dengan IndexedDB, sinkronisasi transaksi, kontrol stok, dan cetak struk thermal untuk kedai kopi.",
    summaryEn:
      "A case study on a lightweight POS using IndexedDB, transaction sync, stock control, and thermal receipt printing for coffee shops.",
    content: `Sistem kasir UMKM harus tetap berguna ketika koneksi internet tidak stabil. Karena itu, Sistem Kasir UMKM Sederhana menggunakan pendekatan offline-first untuk memprioritaskan transaksi di meja kasir.

### IndexedDB sebagai Buffer Lokal
Transaksi ditulis ke penyimpanan lokal terlebih dahulu. Kasir tetap dapat menyelesaikan pesanan tanpa menunggu koneksi, lalu data disinkronkan ketika jaringan kembali tersedia.

### Konsistensi Stok dan Konflik Data
Sinkronisasi harus memiliki id transaksi, waktu perubahan, dan strategi resolusi konflik. Tanpa identitas transaksi yang konsisten, penjualan ganda atau stok negatif mudah terjadi.

### SEO untuk Produk SaaS Lokal
Landing page POS harus menargetkan kebutuhan spesifik seperti kasir kedai kopi, stok UMKM, dan cetak struk thermal. Bahasa yang dekat dengan masalah pengguna lebih kuat daripada klaim fitur yang generik.`,
    contentEn: `A small-business POS must remain useful when internet connectivity is unreliable. This project uses an offline-first approach to prioritize counter transactions.

### IndexedDB as a Local Buffer
Transactions are written locally first. Cashiers can complete orders without waiting for the network, then synchronize when connectivity returns.

### Stock Consistency and Conflicts
Synchronization needs transaction IDs, timestamps, and conflict resolution. Without consistent identities, duplicate sales and negative inventory become likely.

### SEO for Local SaaS Products
A POS landing page should target specific needs such as coffee shop cashier systems, SMB inventory, and thermal receipt printing. Problem-focused language beats generic feature claims.`,
    imageUrl: "https://images.unsplash.com/photo-1556742049-0a67c5574f73?q=80&w=800&auto=format&fit=crop",
    tags: ["React", "TypeScript", "IndexedDB", "Offline-First", "POS UMKM", "Product Engineering"],
    featured: true,
    published: true,
    order: 6,
    createdAt: "2026-03-12T08:00:00.000Z",
  },
  {
    id: "art-7",
    slug: "integrasi-ai-generatif-aman-untuk-aplikasi-bisnis",
    title: "Integrasi AI Generatif yang Aman untuk Aplikasi Bisnis: Dari Prompt hingga Evaluasi",
    titleEn: "Secure Generative AI Integration for Business Apps: From Prompts to Evaluation",
    summary:
      "Panduan engineering untuk memilih use case AI, menjaga data sensitif, mengendalikan prompt, dan mengevaluasi kualitas output secara terukur.",
    summaryEn:
      "An engineering guide to selecting AI use cases, protecting sensitive data, controlling prompts, and measuring output quality.",
    content: `AI generatif bukan hanya persoalan memilih model. Aplikasi yang dapat dipercaya membutuhkan batasan data, validasi output, observability, dan jalur fallback ketika model gagal.

### Pilih Use Case yang Terukur
Mulai dari pekerjaan yang memiliki input, output, dan kriteria keberhasilan yang jelas. Ringkasan dokumen, klasifikasi tiket, dan ekstraksi data lebih mudah dievaluasi daripada chatbot tanpa tujuan spesifik.

### Lindungi Data dan Prompt
Jangan mengirim rahasia, token, atau data pribadi ke model tanpa kebijakan yang jelas. Terapkan redaction, batas ukuran input, dan logging yang tidak membocorkan isi sensitif.

### Evaluasi dan Human Review
Simpan contoh input-output, ukur akurasi, dan sediakan persetujuan manusia untuk keputusan berisiko. AI yang baik adalah sistem yang dapat diaudit, bukan hanya respons yang terdengar meyakinkan.`,
    contentEn: `Generative AI is not only about choosing a model. A trustworthy application needs data boundaries, output validation, observability, and fallbacks when the model fails.

### Choose Measurable Use Cases
Start with tasks that have clear inputs, outputs, and success criteria. Document summarization, ticket classification, and data extraction are easier to evaluate than an undefined chatbot.

### Protect Data and Prompts
Do not send secrets, tokens, or personal data to a model without clear policies. Apply redaction, input limits, and privacy-aware logging.

### Evaluation and Human Review
Store input-output examples, measure accuracy, and require human approval for high-impact decisions. Good AI is auditable systems engineering.`,
    imageUrl: "https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=800&auto=format&fit=crop",
    tags: ["Artificial Intelligence", "Generative AI", "LLM", "Prompt Engineering", "AI Security", "Machine Learning"],
    featured: true,
    published: true,
    order: 7,
    createdAt: "2026-03-13T08:00:00.000Z",
  },
  {
    id: "art-8",
    slug: "dasar-cybersecurity-untuk-aplikasi-web-modern",
    title: "Dasar Cybersecurity untuk Aplikasi Web Modern: Threat Modeling hingga Monitoring",
    titleEn: "Cybersecurity Fundamentals for Modern Web Apps: From Threat Modeling to Monitoring",
    summary:
      "Menyusun pertahanan aplikasi web melalui threat modeling, autentikasi, validasi input, manajemen secret, logging, dan incident response.",
    summaryEn:
      "A practical web security foundation covering threat modeling, authentication, input validation, secrets, logging, and incident response.",
    content: `Keamanan aplikasi web dimulai sebelum kode masuk production. Threat modeling membantu tim memahami aset penting, jalur serangan, dan kontrol yang harus diuji.

### Identifikasi Aset dan Ancaman
Petakan data pengguna, endpoint admin, kredensial, upload, dan integrasi eksternal. Hubungkan setiap aset dengan risiko seperti broken access control, injection, dan kebocoran informasi.

### Kontrol yang Wajib Konsisten
Gunakan validasi schema di server, authorization pada setiap mutation, cookie/session yang aman, serta secret dari environment variable. Keamanan UI saja tidak cukup.

### Monitoring dan Respons
Log harus membantu investigasi tanpa menyimpan password atau token. Siapkan alert, backup, dan prosedur pemulihan sehingga insiden dapat ditangani dengan cepat.`,
    contentEn: `Web security begins before code reaches production. Threat modeling helps teams understand critical assets, attack paths, and controls that must be tested.

### Identify Assets and Threats
Map user data, admin endpoints, credentials, uploads, and external integrations. Connect every asset to risks such as broken access control, injection, and information disclosure.

### Consistent Controls
Use server-side schema validation, authorization on every mutation, secure sessions, and environment-managed secrets. UI security alone is insufficient.

### Monitoring and Response
Logs should support investigation without storing passwords or tokens. Prepare alerts, backups, and recovery procedures before an incident occurs.`,
    imageUrl: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?q=80&w=800&auto=format&fit=crop",
    tags: ["Cybersecurity", "Web Security", "OWASP", "Threat Modeling", "DevSecOps", "Security Audit"],
    featured: true,
    published: true,
    order: 8,
    createdAt: "2026-03-14T08:00:00.000Z",
  },
  {
    id: "art-9",
    slug: "linux-server-hardening-untuk-developer",
    title: "Linux Server Hardening untuk Developer: Checklist Aman sebelum Deployment",
    titleEn: "Linux Server Hardening for Developers: A Secure Pre-Deployment Checklist",
    summary:
      "Checklist praktis hardening Linux meliputi user privilege, SSH, firewall, patching, service exposure, logging, dan backup.",
    summaryEn:
      "A practical Linux hardening checklist covering privileges, SSH, firewall rules, patching, exposed services, logging, and backups.",
    content: `Linux memberi kontrol besar atas server, tetapi kontrol itu harus diikuti kebiasaan operasional yang disiplin.

### Kurangi Permukaan Serangan
Hapus service yang tidak diperlukan, batasi port dengan firewall, dan gunakan user non-root untuk pekerjaan harian. Akses administratif harus eksplisit dan tercatat.

### Amankan SSH dan Patch
Gunakan key-based authentication, matikan login root langsung, batasi percobaan login, dan jadwalkan pembaruan keamanan. Jangan menunda patch untuk service yang terekspos internet.

### Observability dan Recovery
Aktifkan log terpusat, pantau disk dan resource, serta uji backup secara berkala. Server yang aman bukan hanya sulit ditembus, tetapi juga cepat dipulihkan.`,
    contentEn: `Linux gives developers deep server control, but that control requires disciplined operations.

### Reduce Attack Surface
Remove unused services, restrict ports with a firewall, and use non-root users for daily work. Administrative access must be explicit and auditable.

### Secure SSH and Patch Regularly
Use key-based authentication, disable direct root login, limit login attempts, and schedule security updates. Internet-facing services should never remain unpatched.

### Observability and Recovery
Centralize logs, monitor resources, and test backups regularly. A secure server is also one that can be restored quickly.`,
    imageUrl: "https://images.unsplash.com/photo-1629654297299-c8506221ca97?q=80&w=800&auto=format&fit=crop",
    tags: ["Linux", "Linux Server", "Server Hardening", "SSH Security", "DevOps", "System Administration"],
    featured: false,
    published: true,
    order: 9,
    createdAt: "2026-03-15T08:00:00.000Z",
  },
  {
    id: "art-10",
    slug: "windows-security-hardening-untuk-workstation-dan-server",
    title: "Windows Security Hardening untuk Workstation dan Server: Praktik Dasar yang Sering Terlewat",
    titleEn: "Windows Security Hardening for Workstations and Servers: Commonly Missed Basics",
    summary:
      "Membahas hardening Windows melalui patch management, least privilege, Defender, firewall, PowerShell logging, dan kebijakan akses.",
    summaryEn:
      "Windows hardening through patch management, least privilege, Defender, firewall rules, PowerShell logging, and access policies.",
    content: `Windows workstation dan server sering menjadi target karena dipakai untuk identitas, file, aplikasi bisnis, dan akses remote.

### Patch dan Least Privilege
Pastikan Windows Update berjalan, aplikasi lama diinventarisasi, dan user tidak memakai akun administrator untuk aktivitas rutin. Least privilege mengurangi dampak ketika kredensial bocor.

### Defender, Firewall, dan Remote Access
Konfigurasikan Microsoft Defender, Windows Firewall, dan kebijakan remote access sesuai kebutuhan. RDP harus dibatasi melalui jaringan tepercaya dan autentikasi berlapis.

### PowerShell dan Event Logging
Logging membantu tim melihat pola eksekusi mencurigakan. Gabungkan event log, backup, dan prosedur isolasi endpoint untuk mempercepat respons insiden.`,
    contentEn: `Windows workstations and servers are targeted because they host identity, files, business applications, and remote access.

### Patching and Least Privilege
Keep Windows Update active, inventory legacy software, and avoid administrator accounts for routine work. Least privilege limits the blast radius of stolen credentials.

### Defender, Firewall, and Remote Access
Configure Microsoft Defender, Windows Firewall, and remote access policies according to need. Restrict RDP to trusted networks and layered authentication.

### PowerShell and Event Logging
Logging reveals suspicious execution patterns. Combine event logs, backups, and endpoint isolation procedures to improve incident response.`,
    imageUrl: "https://images.unsplash.com/photo-1624571409108-e9a7c47e3f29?q=80&w=800&auto=format&fit=crop",
    tags: ["Windows", "Windows Security", "Microsoft Defender", "PowerShell", "Endpoint Security", "IT Security"],
    featured: false,
    published: true,
    order: 10,
    createdAt: "2026-03-16T08:00:00.000Z",
  },
  {
    id: "art-11",
    slug: "macos-security-privacy-untuk-developer",
    title: "macOS Security dan Privacy untuk Developer: Menjaga Device, Credential, dan Source Code",
    titleEn: "macOS Security and Privacy for Developers: Protecting Devices, Credentials, and Source Code",
    summary:
      "Panduan keamanan macOS untuk developer: FileVault, keychain, permission aplikasi, update, credential hygiene, dan backup source code.",
    summaryEn:
      "A macOS security guide for developers covering FileVault, Keychain, app permissions, updates, credential hygiene, and source-code backups.",
    content: `macOS sering dipercaya sebagai workstation developer, tetapi keamanan tetap bergantung pada konfigurasi dan kebiasaan pengguna.

### Lindungi Device dan Disk
Aktifkan FileVault, gunakan password kuat, dan pastikan perangkat memiliki lock screen otomatis. Perangkat yang hilang tidak boleh langsung membuka data source code.

### Kelola Credential Developer
Simpan credential di Keychain atau secret manager, bukan di repository dan file dot yang ikut terunggah. Rotasi token ketika device pernah dipakai di jaringan yang tidak tepercaya.

### Permission, Update, dan Backup
Tinjau izin aplikasi, perbarui macOS serta dependency, dan siapkan backup terenkripsi. Privacy yang baik membantu mengurangi risiko supply-chain dan credential theft.`,
    contentEn: `macOS is commonly trusted as a developer workstation, but security still depends on configuration and user habits.

### Protect the Device and Disk
Enable FileVault, use a strong password, and configure automatic screen locking. A lost laptop must not expose source code immediately.

### Manage Developer Credentials
Store credentials in Keychain or a secret manager, never in repositories or uploaded dotfiles. Rotate tokens after exposure to untrusted networks.

### Permissions, Updates, and Backups
Review app permissions, update macOS and dependencies, and maintain encrypted backups. Strong privacy reduces supply-chain and credential-theft risk.`,
    imageUrl: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=800&auto=format&fit=crop",
    tags: ["macOS", "Mac Security", "FileVault", "Keychain", "Developer Security", "Privacy"],
    featured: false,
    published: true,
    order: 11,
    createdAt: "2026-03-17T08:00:00.000Z",
  },
];
