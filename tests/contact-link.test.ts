import { afterEach, describe, expect, it, vi } from "vitest";
import { CONTACT_SECTION_HREF, prefillContact } from "@/lib/contact-link";

/**
 * Tujuan test: menjaga agar pre-fill form kontak TIDAK pernah lagi menghasilkan
 * varian URL query (SEO "Crawled - currently not indexed"). Lihat CHANGELOG
 * "Fixed — SEO: varian URL duplikat homepage".
 */
describe("contact-link", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("CONTACT_SECTION_HREF bersih — tidak membawa query pre-fill", () => {
    expect(CONTACT_SECTION_HREF).toBe("/#kontak");
    expect(CONTACT_SECTION_HREF).not.toContain("contactSubject");
    expect(CONTACT_SECTION_HREF).not.toContain("contactBody");
  });

  it("prefillContact menulis sessionStorage (bukan URL) saat ada window", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("window", {});
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    });

    prefillContact({ subject: "Diskusi Artikel: X", body: "Halo Sigit" });

    expect(store.get("contactSubject")).toBe("Diskusi Artikel: X");
    expect(store.get("contactBody")).toBe("Halo Sigit");
  });

  it("no-op di SSR (tidak ada window) — tidak melempar", () => {
    expect(() => prefillContact({ subject: "a", body: "b" })).not.toThrow();
  });
});
