import { describe, expect, it } from "vitest";
import { normalizeStringArray, sanitizeNarrativeMarkdown } from "@/lib/text-normalize";
import { ValidationError, sanitizeError } from "@/lib/error-utils";
import { catalogUrl } from "@/lib/indexnow";
import robots from "@/app/robots";

describe("normalizeStringArray", () => {
  it("handles native arrays and trims/filters empty values", () => {
    expect(normalizeStringArray([" Next.js ", "", "GSAP", null])).toEqual(["Next.js", "GSAP"]);
  });

  it("unwraps single and double JSON-encoded string arrays", () => {
    const single = '["React","TypeScript"]';
    const double = JSON.stringify(single);
    expect(normalizeStringArray(single)).toEqual(["React", "TypeScript"]);
    expect(normalizeStringArray(double)).toEqual(["React", "TypeScript"]);
  });

  it("handles CSV fallback, empty JSON strings, and nullish values", () => {
    expect(normalizeStringArray("Docker, Linux, PostgreSQL")).toEqual([
      "Docker",
      "Linux",
      "PostgreSQL",
    ]);
    expect(normalizeStringArray("[]")).toEqual([]);
    expect(normalizeStringArray("")).toEqual([]);
    expect(normalizeStringArray(null)).toEqual([]);
    expect(normalizeStringArray(undefined)).toEqual([]);
  });
});

describe("sanitizeNarrativeMarkdown", () => {
  it("strips dangling trailing backslashes in prose while preserving fenced code blocks", () => {
    const input = [
      "Paragraf pembuka dengan backslash\\",
      "",
      "```bash",
      "curl -s https://example.com \\",
      "  -H 'Accept: application/json'",
      "```",
      "",
      "Penutup\\",
    ].join("\n");

    const output = sanitizeNarrativeMarkdown(input);
    expect(output).toContain("Paragraf pembuka dengan backslash\n");
    expect(output).toContain("curl -s https://example.com \\");
    expect(output.endsWith("Penutup")).toBe(true);
  });

  it("deduplicates H2 sections and drops post-FAQ boilerplate/secondary FAQ while keeping short conclusion", () => {
    const input = [
      "## Arsitektur Sistem",
      "Penjelasan utama.",
      "",
      "## Arsitektur Sistem",
      "Bagian duplikat.",
      "",
      "## FAQ Teknis",
      "**Q:** Mengapa Next.js?\n**A:** Cepat dan aman.",
      "",
      "## Bagaimana Arsitektur Sistem Menjamin Keandalan Skala Besar?",
      "Teks boilerplate yang tidak diinginkan.",
      "",
      "## Pertanyaan yang Sering Diajukan",
      "FAQ ganda setelah FAQ pertama.",
      "",
      "## Kesimpulan",
      "Ringkasan akhir proyek.",
    ].join("\n");

    const output = sanitizeNarrativeMarkdown(input);
    expect(output.match(/^## Arsitektur Sistem$/gm)?.length).toBe(1);
    expect(output).not.toContain("Bagian duplikat.");
    expect(output).not.toContain("Bagaimana Arsitektur Sistem Menjamin Keandalan Skala Besar");
    expect(output).not.toContain("Pertanyaan yang Sering Diajukan");
    expect(output).toContain("## Kesimpulan");
    expect(output).toContain("Ringkasan akhir proyek.");
  });
});

describe("ValidationError & sanitizeError", () => {
  it("passes ValidationError messages through (bounded at 500 chars)", () => {
    const err = new ValidationError("Stok produk tidak mencukupi: hanya tersisa 2 unit.");
    expect(sanitizeError(err)).toBe("Stok produk tidak mencukupi: hanya tersisa 2 unit.");

    const longErr = new ValidationError("x".repeat(700));
    expect(sanitizeError(longErr).length).toBe(500);
  });

  it("allows known safe stock/validation messages and masks internal errors", () => {
    expect(sanitizeError(new Error("Stok varian sudah habis."))).toBe("Stok varian sudah habis.");
    expect(sanitizeError(new Error("Minimal pemesanan 1 unit."))).toBe("Minimal pemesanan 1 unit.");
    expect(
      sanitizeError(new Error("ECONNREFUSED postgres://secret:pass@127.0.0.1:5432/db"))
    ).toBe("Terjadi kesalahan internal. Silakan coba lagi nanti.");
  });
});

describe("robots.ts & catalogUrl('toko')", () => {
  it("allows /api/media/ and /api/og while disallowing /order/, /api/, and /admin/", () => {
    const config = robots();
    const rules = Array.isArray(config.rules) ? config.rules : [config.rules];
    expect(rules.length).toBeGreaterThanOrEqual(3);

    for (const rule of rules) {
      const allowed = Array.isArray(rule.allow) ? rule.allow : [rule.allow];
      const disallowed = Array.isArray(rule.disallow) ? rule.disallow : [rule.disallow];
      expect(allowed).toContain("/api/media/");
      expect(allowed).toContain("/api/og");
      expect(disallowed).toContain("/order/");
      expect(disallowed).toContain("/api/");
      expect(disallowed).toContain("/admin/");
    }
  });

  it("supports 'toko' in catalogUrl", () => {
    expect(catalogUrl("toko").endsWith("/toko")).toBe(true);
  });
});
