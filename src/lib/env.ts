import { z } from "zod";

/**
 * Validasi environment terpusat — NON-BLOCKING by design.
 *
 * Tidak pernah throw: dev lokal (Clerk placeholder / tanpa DATABASE_URL)
 * harus tetap jalan via fallback yang sudah ada. Hasil dipakai untuk
 * checklist kelayakan di /admin/system dan gagal-fast yang sopan
 * (peringatan, bukan crash) di level UI.
 */

const EnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().optional().or(z.literal("")),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional().or(z.literal("")),
  CLERK_SECRET_KEY: z.string().optional().or(z.literal("")),
  ADMIN_CLERK_ID: z.string().optional().or(z.literal("")),
  DATABASE_URL: z.string().optional().or(z.literal("")),
  NEXT_PUBLIC_FORMSPREE_ENDPOINT: z.string().optional().or(z.literal("")),
  INDEXNOW_KEY: z.string().optional().or(z.literal("")),
  ENABLE_EXTERNAL_TRANSLATE: z.string().optional().or(z.literal("")),
  // Cloud AI Sigit_Bot: off (default) | gemini | openai | anthropic | deepseek |
  // groq | openrouter | together | mistral | xai (lihat registry ai-providers.ts)
  AI_PROVIDER: z.string().optional().or(z.literal("")),
  GEMINI_API_KEY: z.string().optional().or(z.literal("")),
  AI_MODEL: z.string().optional().or(z.literal("")),
  OPENAI_API_KEY: z.string().optional().or(z.literal("")),
  OPENAI_BASE_URL: z.string().optional().or(z.literal("")),
  OPENAI_MODEL: z.string().optional().or(z.literal("")),
  ANTHROPIC_API_KEY: z.string().optional().or(z.literal("")),
  ANTHROPIC_BASE_URL: z.string().optional().or(z.literal("")),
  ANTHROPIC_MODEL: z.string().optional().or(z.literal("")),
  DEEPSEEK_API_KEY: z.string().optional().or(z.literal("")),
  DEEPSEEK_MODEL: z.string().optional().or(z.literal("")),
  GROQ_API_KEY: z.string().optional().or(z.literal("")),
  GROQ_MODEL: z.string().optional().or(z.literal("")),
  OPENROUTER_API_KEY: z.string().optional().or(z.literal("")),
  OPENROUTER_MODEL: z.string().optional().or(z.literal("")),
  TOGETHER_API_KEY: z.string().optional().or(z.literal("")),
  TOGETHER_MODEL: z.string().optional().or(z.literal("")),
  MISTRAL_API_KEY: z.string().optional().or(z.literal("")),
  MISTRAL_MODEL: z.string().optional().or(z.literal("")),
  XAI_API_KEY: z.string().optional().or(z.literal("")),
  XAI_MODEL: z.string().optional().or(z.literal("")),
});

export type AppEnv = z.infer<typeof EnvSchema>;

function isPlaceholder(value: string | undefined): boolean {
  return isPlaceholderKey(value);
}

/** True untuk nilai kosong/placeholder (xxxx, your-form-id, nama-storage-zone). */
export function isPlaceholderKey(value: string | undefined): boolean {
  if (!value) return true;
  return (
    value.includes("xxxx") ||
    value.includes("your-form-id") ||
    value.includes("nama-storage-zone")
  );
}

/** True hanya di lingkungan produksi (Vercel production / NODE_ENV production). */
/**
 * True bila publishable key Clerk VALID (ada dan bukan placeholder).
 *
 * SDK Clerk v7 memvalidasi format key saat inisialisasi: key kosong atau
 * placeholder (mis. `pk_test_xxxx`) membuat clerkMiddleware MELEMPAR di
 * setiap request (HTTP 500) dan ClerkProvider crash di client. Karena itu
 * middleware (proxy.ts), provider (layout.tsx), maupun komponen yang butuh
 * konteks Clerk (os-menubar) memeriksa ini dulu dan masuk "mode tanpa Clerk"
 * — situasi dev lokal tanpa kredensial dan CI. Rute /admin tetap fail-closed
 * di produksi (lihat SECURITY.md).
 */
export function hasClerkPublishableKey(): boolean {
  return !isPlaceholderKey(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
}

/** True hanya di lingkungan produksi (Vercel production / NODE_ENV production). */
export function isProduction(): boolean {
  return process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";
}

export interface EnvIssue {
  key: string;
  severity: "error" | "warning" | "info";
  message: string;
}

/** Parse aman — selalu sukses, field kosong dinormalisasi ke "". */
export function getEnv(): AppEnv {
  const parsed = EnvSchema.safeParse(process.env);
  if (parsed.success) return parsed.data;
  return {
    NEXT_PUBLIC_APP_URL: "",
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "",
    CLERK_SECRET_KEY: "",
    ADMIN_CLERK_ID: "",
    DATABASE_URL: "",
    NEXT_PUBLIC_FORMSPREE_ENDPOINT: "",
    INDEXNOW_KEY: "",
    ENABLE_EXTERNAL_TRANSLATE: "",
    AI_PROVIDER: "",
    GEMINI_API_KEY: "",
    AI_MODEL: "",
    OPENAI_API_KEY: "",
    OPENAI_BASE_URL: "",
    OPENAI_MODEL: "",
    ANTHROPIC_API_KEY: "",
    ANTHROPIC_BASE_URL: "",
    ANTHROPIC_MODEL: "",
    DEEPSEEK_API_KEY: "",
    DEEPSEEK_MODEL: "",
    GROQ_API_KEY: "",
    GROQ_MODEL: "",
    OPENROUTER_API_KEY: "",
    OPENROUTER_MODEL: "",
    TOGETHER_API_KEY: "",
    TOGETHER_MODEL: "",
    MISTRAL_API_KEY: "",
    MISTRAL_MODEL: "",
    XAI_API_KEY: "",
    XAI_MODEL: "",
  };
}

/** Daftar masalah konfigurasi untuk dashboard + pra-deploy. Tidak throw. */
export function getEnvIssues(env: AppEnv = getEnv()): EnvIssue[] {
  const issues: EnvIssue[] = [];

  if (!env.NEXT_PUBLIC_APP_URL) {
    issues.push({
      key: "NEXT_PUBLIC_APP_URL",
      severity: "warning",
      message: "Kosong — canonical fallback ke https://sigitadi.id. Isi eksplisit di prod.",
    });
  }
  if (!env.DATABASE_URL || env.DATABASE_URL.length < 6) {
    issues.push({
      key: "DATABASE_URL",
      severity: "warning",
      message: "Belum dikonfigurasi — aplikasi berjalan mode fallback (local-store/dummy).",
    });
  }
  if (isPlaceholder(env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) || isPlaceholder(env.CLERK_SECRET_KEY)) {
    issues.push({
      key: "CLERK_*",
      severity: "warning",
      message: "Key placeholder — middleware bypass (dev only). Wajib key live + ADMIN_CLERK_ID valid sebelum deploy.",
    });
  } else if (
    env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.startsWith("pk_test_")
  ) {
    // SEO KRITIS: pk_test_ memakai domain *.clerk.accounts.dev. Browser tanpa
    // cookie dev-browser (termasuk Googlebot) diredirect ke handshake Clerk
    // untuk SETIAP rute — termasuk /robots.txt & /sitemap.xml. Google melihat
    // ini sebagai "Redirect error" dan halaman jadi tidak terindeks.
    issues.push({
      key: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
      severity: "error",
      message:
        "Masih pk_test_ (development). Domain clerk.accounts.dev me-redirect Googlebot ke handshake Clerk di SEMUA rute (termasuk /robots.txt & /sitemap.xml) → 'Redirect error' di Google Search Console. Ganti ke pk_live_ + CLERK_SECRET_KEY live.",
    });
  }
  if (isPlaceholder(env.ADMIN_CLERK_ID)) {
    issues.push({
      key: "ADMIN_CLERK_ID",
      severity: "warning",
      message: "Belum diisi user ID valid — hanya pemilik yang boleh mutasi konten.",
    });
  }
  if (isPlaceholder(env.NEXT_PUBLIC_FORMSPREE_ENDPOINT)) {
    issues.push({
      key: "NEXT_PUBLIC_FORMSPREE_ENDPOINT",
      severity: "info",
      message: "Form kontak tidak terkirim sampai endpoint Formspree diisi.",
    });
  }
  if (isPlaceholder(env.INDEXNOW_KEY)) {
    issues.push({
      key: "INDEXNOW_KEY",
      severity: "info",
      message: "Ping IndexNow memakai key default — ganti di .env (jangan commit).",
    });
  }
  if ((env.ENABLE_EXTERNAL_TRANSLATE ?? "true") === "false") {
    issues.push({
      key: "ENABLE_EXTERNAL_TRANSLATE",
      severity: "info",
      message: "Egress translate dimatikan — kolom EN wajib diisi manual.",
    });
  }
  return issues;
}

/** True bila tidak ada issue error/warning (info diabaikan). */
export function isDeployReady(env: AppEnv = getEnv()): boolean {
  return !getEnvIssues(env).some((i) => i.severity !== "info");
}
