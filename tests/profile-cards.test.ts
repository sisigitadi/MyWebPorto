import { describe, expect, it } from "vitest";
import {
  DEFAULT_PROFILE_CARDS,
  sanitizeProfileCards,
  type ProfileCardsConfig,
} from "@/lib/profile-cards-meta";
import { resolveProfileCards, saveProfileCards } from "@/lib/profile-cards-config";

describe("profile-cards-meta & sanitizer", () => {
  it("memiliki 5 kategori kartu profil default yang lengkap", () => {
    expect(DEFAULT_PROFILE_CARDS.techStack.length).toBeGreaterThanOrEqual(4);
    expect(DEFAULT_PROFILE_CARDS.careerTimeline.length).toBeGreaterThanOrEqual(3);
    expect(DEFAULT_PROFILE_CARDS.workPreferences).toBeDefined();
    expect(DEFAULT_PROFILE_CARDS.credentials.length).toBeGreaterThanOrEqual(3);
    expect(DEFAULT_PROFILE_CARDS.philosophy.length).toBeGreaterThanOrEqual(4);
  });

  it("workPreferences tidak menyediakan link download langsung melainkan jaminan respon & prompt kontak", () => {
    const prefs = DEFAULT_PROFILE_CARDS.workPreferences;
    expect(prefs.responseTimeSla).toContain("Jam");
    expect(prefs.contactPrompt).toBeDefined();
    // Memastikan tidak ada field cvUrl langsung di kartu profil untuk privasi resume
    expect((prefs as unknown as Record<string, unknown>).cvUrl).toBeUndefined();
    expect((prefs as unknown as Record<string, unknown>).downloadUrl).toBeUndefined();
  });

  it("sanitizeProfileCards aman dan kembali ke default saat input null/undefined/rusak", () => {
    expect(sanitizeProfileCards(null)).toEqual(DEFAULT_PROFILE_CARDS);
    expect(sanitizeProfileCards(undefined)).toEqual(DEFAULT_PROFILE_CARDS);
    expect(sanitizeProfileCards("string")).toEqual(DEFAULT_PROFILE_CARDS);
    expect(sanitizeProfileCards(12345)).toEqual(DEFAULT_PROFILE_CARDS);
    expect(sanitizeProfileCards({})).toEqual(DEFAULT_PROFILE_CARDS);
  });

  it("sanitizeProfileCards mempertahankan data kustom yang valid", () => {
    const custom: ProfileCardsConfig = {
      techStack: [
        {
          id: "custom-tech",
          title: "Custom Title",
          titleEn: "Custom Title EN",
          iconName: "code",
          items: ["Rust", "Go"],
        },
      ],
      careerTimeline: [
        {
          id: "custom-career",
          period: "2025",
          periodEn: "2025",
          role: "Principal Architect",
          roleEn: "Principal Architect",
          company: "Acme Corp",
          description: "Led architecture",
          descriptionEn: "Led architecture",
          badges: ["Rust", "K8s"],
        },
      ],
      workPreferences: {
        statusBadge: "KONSULTASI AKTIF",
        statusBadgeEn: "ACTIVE CONSULTING",
        locationTimezone: "Bandung, WIB",
        locationTimezoneEn: "Bandung, WIB",
        collaborationTypes: [{ title: "Audit Arsitektur", titleEn: "Architecture Audit" }],
        responseTimeSla: "< 1 Jam",
        responseTimeSlaEn: "< 1 Hour",
        contactPrompt: "Hubungi untuk diskusi",
        contactPromptEn: "Reach out for discussion",
      },
      credentials: [
        {
          id: "custom-cred",
          title: "Security Champion",
          titleEn: "Security Champion",
          issuer: "OWASP",
          year: "2025",
          badgeText: "CHAMPION",
        },
      ],
      philosophy: [
        {
          id: "custom-phil",
          principle: "Keep It Simple",
          principleEn: "Keep It Simple",
          detail: "Simple is better",
          detailEn: "Simple is better",
        },
      ],
    };

    const sanitized = sanitizeProfileCards(custom);
    expect(sanitized.techStack[0].items).toEqual(["Rust", "Go"]);
    expect(sanitized.careerTimeline[0].company).toBe("Acme Corp");
    expect(sanitized.workPreferences.responseTimeSla).toBe("< 1 Jam");
    expect(sanitized.credentials[0].badgeText).toBe("CHAMPION");
    expect(sanitized.philosophy[0].principle).toBe("Keep It Simple");
  });
});

describe("profile-cards-config (server-only resolver)", () => {
  it("resolveProfileCards mengembalikan data profil kartu yang valid", async () => {
    const cards = await resolveProfileCards();
    expect(cards).toBeDefined();
    expect(Array.isArray(cards.techStack)).toBe(true);
    expect(Array.isArray(cards.careerTimeline)).toBe(true);
  });

  it("saveProfileCards melempar error saat input bukan objek", async () => {
    await expect(saveProfileCards("invalid")).rejects.toThrow();
  });
});
