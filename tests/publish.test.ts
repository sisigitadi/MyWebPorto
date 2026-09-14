import { describe, expect, it } from "vitest";
import { isLivePublished, isScheduled, normalizePublishAt } from "@/lib/publish";

const NOW = new Date("2026-09-14T12:00:00Z");
const PAST = "2026-01-01T00:00:00Z";
const FUTURE = "2026-12-31T00:00:00Z";

describe("isLivePublished", () => {
  it("tayang bila published tanpa jadwal", () => {
    expect(isLivePublished({ published: true }, NOW)).toBe(true);
    expect(isLivePublished({ published: true, publishAt: null }, NOW)).toBe(true);
  });

  it("tayang bila jadwal sudah lewat, sembunyi bila masa depan", () => {
    expect(isLivePublished({ published: true, publishAt: PAST }, NOW)).toBe(true);
    expect(isLivePublished({ published: true, publishAt: FUTURE }, NOW)).toBe(false);
  });

  it("tidak tayang bila unpublished atau tanggal rusak fail-open", () => {
    expect(isLivePublished({ published: false, publishAt: PAST }, NOW)).toBe(false);
    expect(isLivePublished({ published: false }, NOW)).toBe(false);
    expect(isLivePublished({ published: true, publishAt: "bukan-tanggal" }, NOW)).toBe(true);
  });
});

describe("isScheduled", () => {
  it("true hanya untuk published + masa depan", () => {
    expect(isScheduled({ published: true, publishAt: FUTURE }, NOW)).toBe(true);
    expect(isScheduled({ published: true, publishAt: PAST }, NOW)).toBe(false);
    expect(isScheduled({ published: false, publishAt: FUTURE }, NOW)).toBe(false);
    expect(isScheduled({ published: true }, NOW)).toBe(false);
  });
});

describe("normalizePublishAt", () => {
  it("kosong/bukan-string menjadi null, valid menjadi ISO", () => {
    expect(normalizePublishAt("")).toBe(null);
    expect(normalizePublishAt("   ")).toBe(null);
    expect(normalizePublishAt(undefined)).toBe(null);
    expect(normalizePublishAt("bukan-tanggal")).toBe(null);
    // datetime-local tanpa zona = waktu lokal; samakan dengan Date apa adanya (TZ-independent)
    expect(normalizePublishAt("2026-12-31T10:00")).toBe(new Date("2026-12-31T10:00").toISOString());
  });
});
