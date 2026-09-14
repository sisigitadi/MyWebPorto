import { describe, expect, it } from "vitest";
import { catalogUrl, detailUrl, filterOwnUrls, submitUrlsToIndexNow } from "@/lib/indexnow";

const BASE = "https://sigitadi.id";

describe("filterOwnUrls", () => {
  it("hanya meloloskan URL http(s) di host sendiri", () => {
    expect(
      filterOwnUrls(
        [
          `${BASE}/proyek/a`,
          "http://sigitadi.id/artikel/b",
          "https://evil.com/steal",
          "javascript:alert(1)",
          "/jalur-relatif",
          123,
          null,
        ],
        BASE
      )
    ).toEqual([`${BASE}/proyek/a`, "http://sigitadi.id/artikel/b"]);
  });

  it("kosong bila base tidak valid", () => {
    expect(filterOwnUrls([`${BASE}/x`], "://salah")).toEqual([]);
  });
});

describe("detailUrl & catalogUrl", () => {
  it("membentuk kanonis detail dan katalog", () => {
    expect(detailUrl("artikel", "abc").endsWith("/artikel/abc")).toBe(true);
    expect(catalogUrl("proyek").endsWith("/proyek")).toBe(true);
  });
});

describe("submitUrlsToIndexNow", () => {
  it("skip tanpa fetch bila tidak ada URL valid", async () => {
    const res = await submitUrlsToIndexNow(["https://evil.com/x"]);
    expect(res.skipped).toBe(true);
    expect(res.submittedCount).toBe(0);
  });
});
