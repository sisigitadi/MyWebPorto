import { describe, expect, it } from "vitest";
import { getEnvIssues, isDeployReady } from "@/lib/env";

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

  it("isDeployReady false bila ada warning, true bila lengkap", () => {
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
