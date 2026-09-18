import { describe, expect, it, afterEach } from "vitest";
import { getEnvIssues, isDeployReady, isPlaceholderKey, isProduction } from "@/lib/env";

const OLD_VERCEL_ENV = process.env.VERCEL_ENV;
const OLD_NODE_ENV = process.env.NODE_ENV;
const writableEnv = process.env as Record<string, string | undefined>;

afterEach(() => {
  if (OLD_VERCEL_ENV === undefined) delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV = OLD_VERCEL_ENV;
  writableEnv.NODE_ENV = OLD_NODE_ENV;
});

describe("isPlaceholderKey", () => {
  it("mendeteksi kosong dan placeholder", () => {
    expect(isPlaceholderKey(undefined)).toBe(true);
    expect(isPlaceholderKey("")).toBe(true);
    expect(isPlaceholderKey("pk_test_xxxx")).toBe(true);
    expect(isPlaceholderKey("pk_live_abc")).toBe(false);
  });
});

describe("getEnvIssues — Clerk pk_test_ (SEO)", () => {
  it("menandai pk_test_ sebagai error (redirect Googlebot)", () => {
    // pk_test_ memakai domain *.clerk.accounts.dev → Googlebot diredirect
    // ke handshake Clerk di semua rute (termasuk /robots.txt & /sitemap.xml).
    // Google Search Console melaporkan ini sebagai "Redirect error".
    const issues = getEnvIssues({
      NEXT_PUBLIC_APP_URL: "https://sigitadi.id",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_Y2FyZWZ1bC1ibHVlamF5",
      CLERK_SECRET_KEY: "sk_test_abc",
      ADMIN_CLERK_ID: "user_valid123",
      DATABASE_URL: "postgresql://u:p@host/db?sslmode=require",
      NEXT_PUBLIC_FORMSPREE_ENDPOINT: "https://formspree.io/f/abc",
      INDEXNOW_KEY: "abcdef123456",
      ENABLE_EXTERNAL_TRANSLATE: "true",
    });
    const clerkIssue = issues.find((i) => i.key === "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");
    expect(clerkIssue).toBeDefined();
    expect(clerkIssue?.severity).toBe("error");
    expect(clerkIssue?.message).toContain("pk_test_");
  });

  it("menerima pk_live_ tanpa error", () => {
    const issues = getEnvIssues({
      NEXT_PUBLIC_APP_URL: "https://sigitadi.id",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_abc",
      CLERK_SECRET_KEY: "sk_live_abc",
      ADMIN_CLERK_ID: "user_valid123",
      DATABASE_URL: "postgresql://u:p@host/db?sslmode=require",
      NEXT_PUBLIC_FORMSPREE_ENDPOINT: "https://formspree.io/f/abc",
      INDEXNOW_KEY: "abcdef123456",
      ENABLE_EXTERNAL_TRANSLATE: "true",
    });
    expect(issues.some((i) => i.key === "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY")).toBe(false);
  });
});

describe("isProduction", () => {
  it("true hanya di production", () => {
    process.env.VERCEL_ENV = "production";
    expect(isProduction()).toBe(true);
    delete process.env.VERCEL_ENV;
    writableEnv.NODE_ENV = "production";
    expect(isProduction()).toBe(true);
    writableEnv.NODE_ENV = "test";
    expect(isProduction()).toBe(false);
  });
});
describe("getEnvIssues", () => {
  it("tidak pernah throw dan melabeli env kosong", () => {
    const issues = getEnvIssues({
      NEXT_PUBLIC_APP_URL: "",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "",
      CLERK_SECRET_KEY: "",
      ADMIN_CLERK_ID: "",
      DATABASE_URL: "",
      NEXT_PUBLIC_FORMSPREE_ENDPOINT: "",
      INDEXNOW_KEY: "",
      ENABLE_EXTERNAL_TRANSLATE: "",
    });
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.some((i) => i.key === "DATABASE_URL")).toBe(true);
  });
});

describe("isDeployReady", () => {
  it("false bila ada warning, true bila lengkap", () => {
    expect(
      isDeployReady({
        NEXT_PUBLIC_APP_URL: "",
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "",
        CLERK_SECRET_KEY: "",
        ADMIN_CLERK_ID: "",
        DATABASE_URL: "",
        NEXT_PUBLIC_FORMSPREE_ENDPOINT: "",
        INDEXNOW_KEY: "",
        ENABLE_EXTERNAL_TRANSLATE: "",
      })
    ).toBe(false);

    expect(
      isDeployReady({
        NEXT_PUBLIC_APP_URL: "https://sigitadi.id",
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_abc",
        CLERK_SECRET_KEY: "sk_live_abc",
        ADMIN_CLERK_ID: "user_valid123",
        DATABASE_URL: "postgresql://u:p@host/db?sslmode=require",
        NEXT_PUBLIC_FORMSPREE_ENDPOINT: "https://formspree.io/f/abc",
        INDEXNOW_KEY: "abcdef123456",
        ENABLE_EXTERNAL_TRANSLATE: "true",
      })
    ).toBe(true);
  });
});
