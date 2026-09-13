"use server";

import fs from "fs";
import path from "path";
import { db, isDbConnected } from "@/db";

/**
 * Status kelayakan (feasibility/readiness) + observabilitas untuk /admin/system.
 * Read-only, tidak memutasi data. Halaman admin sudah diproteksi layout,
 * jadi tidak perlu verifyAdmin() seperti Server Actions mutasi.
 */

export interface EnvCheck {
  key: string;
  label: string;
  configured: boolean;
  maskedValue: string;
  hint: string;
}

export interface SystemStatus {
  generatedAt: string;
  runtime: {
    nodeVersion: string;
    platform: string;
    isVercel: boolean;
    appUrl: string;
  };
  env: EnvCheck[];
  database: {
    configured: boolean;
    reachable: boolean;
    latencyMs: number | null;
    detail: string;
  };
  filesystem: {
    key: string;
    label: string;
    path: string;
    writable: boolean;
    detail: string;
  }[];
  integrations: {
    clerk: string;
    translate: string;
    indexNow: string;
    formspree: string;
    storage: string;
  };
  observability: {
    tracing: {
      header: string;
      middleware: string;
      limitation: string;
    };
    logging: {
      strategy: string;
      sources: string[];
      sanitization: string;
      persistence: string;
    };
  };
}

function maskSecret(value: string | undefined, visible = 4): string {
  if (!value) return "—";
  if (value.length <= visible * 2) return "••••";
  return `${value.slice(0, visible)}••••${value.slice(-visible)}`;
}

function isPlaceholder(value: string | undefined): boolean {
  if (!value) return true;
  return value.includes("xxxx") || value.includes("your-form-id") || value.includes("nama-storage-zone");
}

export async function getSystemStatus(): Promise<SystemStatus> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://sigitadi.id (fallback)";
  const dbUrl = process.env.DATABASE_URL;
  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const adminId = process.env.ADMIN_CLERK_ID;

  const env: EnvCheck[] = [
    {
      key: "NEXT_PUBLIC_APP_URL",
      label: "Canonical URL",
      configured: Boolean(process.env.NEXT_PUBLIC_APP_URL),
      maskedValue: appUrl,
      hint: "Wajib https://sigitadi.id di prod, tanpa trailing slash.",
    },
    {
      key: "DATABASE_URL",
      label: "Neon PostgreSQL",
      configured: isDbConnected,
      maskedValue: maskSecret(dbUrl, 12),
      hint: "Tanpa ini aplikasi fallback ke data/local-store.json.",
    },
    {
      key: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
      label: "Clerk Publishable",
      configured: Boolean(clerkKey) && !isPlaceholder(clerkKey),
      maskedValue: maskSecret(clerkKey),
      hint: "Placeholder = middleware bypass (dev only).",
    },
    {
      key: "ADMIN_CLERK_ID",
      label: "Admin Owner ID",
      configured: Boolean(adminId) && !isPlaceholder(adminId),
      maskedValue: maskSecret(adminId),
      hint: "Satu-satunya user yang boleh mutasi.",
    },
    {
      key: "INDEXNOW_KEY",
      label: "IndexNow",
      configured: Boolean(process.env.INDEXNOW_KEY) && !isPlaceholder(process.env.INDEXNOW_KEY),
      maskedValue: maskSecret(process.env.INDEXNOW_KEY),
      hint: "Jangan commit key asli. POST /api/indexnow admin-only.",
    },
    {
      key: "NEXT_PUBLIC_FORMSPREE_ENDPOINT",
      label: "Formspree",
      configured: Boolean(process.env.NEXT_PUBLIC_FORMSPREE_ENDPOINT) && !isPlaceholder(process.env.NEXT_PUBLIC_FORMSPREE_ENDPOINT),
      maskedValue: process.env.NEXT_PUBLIC_FORMSPREE_ENDPOINT || "—",
      hint: "Pastikan diarahkan ke x@sigitadi.id.",
    },
    {
      key: "ENABLE_EXTERNAL_TRANSLATE",
      label: "External Translate",
      configured: true,
      maskedValue: process.env.ENABLE_EXTERNAL_TRANSLATE ?? "true (default)",
      hint: "false = matikan egress Google/MyMemory total.",
    },
  ];

  // --- Database reachability (best-effort, timeout manual) ---
  let reachable = false;
  let latencyMs: number | null = null;
  let dbDetail = "DATABASE_URL belum dikonfigurasi — memakai local-store/dummy.";
  if (isDbConnected) {
    const start = Date.now();
    try {
      await Promise.race([
        db.query.profiles.findFirst(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout 5s")), 5000)),
      ]);
      latencyMs = Date.now() - start;
      reachable = true;
      dbDetail = `Terhubung (${latencyMs} ms). Migrasi: drizzle/0000–0003, termasuk 0003_product_slugs.sql.`;
    } catch (err) {
      latencyMs = Date.now() - start;
      dbDetail = `Gagal dijangkau: ${err instanceof Error ? err.message.slice(0, 160) : "unknown"}. Cek sslmode=require + npm run db:push.`;
    }
  }

  // --- Filesystem writability ---
  const isVercel = Boolean(process.env.VERCEL);
  const dataDir = isVercel
    ? path.join("/tmp", "my-web-porto-data")
    : path.join(process.cwd(), "data");
  const uploadsDir = isVercel
    ? path.join("/tmp", "my-web-porto-data", "uploads")
    : path.join(process.cwd(), "public", "uploads");

  const checkWritable = (dirPath: string): boolean => {
    try {
      fs.accessSync(dirPath, fs.constants.W_OK);
      return true;
    } catch {
      try {
        fs.mkdirSync(dirPath, { recursive: true });
        fs.accessSync(dirPath, fs.constants.W_OK);
        return true;
      } catch {
        return false;
      }
    }
  };

  const filesystem = [
    {
      key: "data",
      label: "Local store",
      path: dataDir,
      writable: checkWritable(dataDir),
      detail: isVercel
        ? "/tmp di Vercel: writable tapi ephemeral (hilang tiap redeploy/instance)."
        : "data/local-store.json: fallback saat DB down.",
    },
    {
      key: "uploads",
      label: "Upload gambar",
      path: uploadsDir,
      writable: checkWritable(uploadsDir),
      detail: isVercel
        ? "WARNING: public/uploads tidak persisten di serverless — migrasi ke Bunny/R2/S3."
        : "public/uploads: SVG diblok, magic-bytes, max 20MB.",
    },
  ];

  const clerkConfigured = clerkKey && !isPlaceholder(clerkKey);
  const translateEnabled = (process.env.ENABLE_EXTERNAL_TRANSLATE ?? "true") !== "false";

  return {
    generatedAt: new Date().toISOString(),
    runtime: {
      nodeVersion: process.version,
      platform: `${process.platform}-${process.arch}`,
      isVercel,
      appUrl,
    },
    env,
    database: {
      configured: isDbConnected,
      reachable,
      latencyMs,
      detail: dbDetail,
    },
    filesystem,
    integrations: {
      clerk: clerkConfigured
        ? "Live — /admin/* diproteksi auth.protect() + ADMIN_CLERK_ID, non-admin 404."
        : "Placeholder/dev — middleware bypass, JANGAN deploy ke prod seperti ini.",
      translate: translateEnabled
        ? "Opt-in per field via translateFieldAction (Google → MyMemory fallback)."
        : "OFF — egress dimatikan total, isi kolom EN manual.",
      indexNow: "POST /api/indexnow admin-only, 5 req/60s/IP, max 100 URLs, payload 10KB, host allowlist.",
      formspree: process.env.NEXT_PUBLIC_FORMSPREE_ENDPOINT && !isPlaceholder(process.env.NEXT_PUBLIC_FORMSPREE_ENDPOINT)
        ? "Terkonfigurasi."
        : "Belum dikonfigurasi — form kontak tidak terkirim.",
      storage: "Lokal (public/uploads). BUNNY_* ada di .env.example tapi belum di-wiring.",
    },
    observability: {
      tracing: {
        header: "x-request-id (UUID per request, diset di src/middleware.ts:31).",
        middleware: "Non-admin /admin/* dicatat console.warn dengan route + userId (tanpa PII berlebih).",
        limitation: "Belum dikirim ke Sentry/Log Drains — korelasi manual via log server/Vercel Logs.",
      },
      logging: {
        strategy: "console.warn untuk fallback DB/translate/upload, console.error untuk gagal sinkron DB.",
        sources: [
          "src/lib/actions.ts — DB fallback, auto-seed dilewati, sinkron gagal",
          "src/lib/error-utils.ts — sanitizeError() mask + slice(0,500)",
          "src/lib/local-upload.ts:115 — Vercel FS ephemeral warning",
          "src/lib/translate.ts — Google/MyMemory fallback gagal",
          "src/middleware.ts:24 — non-admin access denied",
        ],
        sanitization: "Allowlist pesan aman, stack/env tidak pernah ke klien.",
        persistence: "Belum persisten — hilang di serverless. Langkah lanjut: tabel audit_logs + Sentry.",
      },
    },
  };
}
