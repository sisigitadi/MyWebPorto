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
});

export type AppEnv = z.infer<typeof EnvSchema>;

function isPlaceholder(value: string | undefined): boolean {
  if (!value) return true;
  return (
    value.includes("xxxx") ||
    value.includes("your-form-id") ||
    value.includes("nama-storage-zone")
  );
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
