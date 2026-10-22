import { describe, expect, it } from "vitest";
import { resolveSectionRedirect, SECTION_PATH_REDIRECTS } from "@/lib/section-redirects";

describe("resolveSectionRedirect", () => {
  it("mengarahkan path section polos ke anchor homepage", () => {
    expect(resolveSectionRedirect("/layanan")).toBe("#layanan");
    expect(resolveSectionRedirect("/terminal")).toBe("#terminal");
    expect(resolveSectionRedirect("/testimoni")).toBe("#testimoni");
    expect(resolveSectionRedirect("/kontak")).toBe("#kontak");
    expect(resolveSectionRedirect("/contact")).toBe("#kontak");
  });

  it("normalisasi: trailing slash dan huruf besar tetap ke anchor sama", () => {
    expect(resolveSectionRedirect("/layanan/")).toBe("#layanan");
    expect(resolveSectionRedirect("/layanan//")).toBe("#layanan");
    expect(resolveSectionRedirect("/Layanan")).toBe("#layanan");
    expect(resolveSectionRedirect("/Kontak")).toBe("#kontak");
    expect(resolveSectionRedirect("/contact/")).toBe("#kontak");
  });

  it("tidak menyentuh rute nyata — homepage, katalog, detail, admin, api", () => {
    expect(resolveSectionRedirect("/")).toBeNull();
    expect(resolveSectionRedirect("/proyek")).toBeNull();
    expect(resolveSectionRedirect("/artikel")).toBeNull();
    expect(resolveSectionRedirect("/toko")).toBeNull();
    expect(resolveSectionRedirect("/toko/template-portfolio-notion")).toBeNull();
    expect(resolveSectionRedirect("/proyek/dashboard-halaqah")).toBeNull();
    expect(resolveSectionRedirect("/admin")).toBeNull();
    expect(resolveSectionRedirect("/admin/products")).toBeNull();
    expect(resolveSectionRedirect("/api/retrobot")).toBeNull();
    expect(resolveSectionRedirect("/sitemap.xml")).toBeNull();
  });

  it("menjamin /toko tidak lagi dialihkan ke #produk karena telah menjadi rute katalog tersendiri", () => {
    expect(resolveSectionRedirect("/toko")).toBeNull();
    expect(resolveSectionRedirect("/toko/")).toBeNull();
  });

  it("hanya memetakan lima path section virtual yang disengaja", () => {
    expect(Object.keys(SECTION_PATH_REDIRECTS).sort()).toEqual(
      ["/contact", "/kontak", "/layanan", "/terminal", "/testimoni"].sort(),
    );
  });
});

