import { describe, expect, it } from "vitest";
import { resolveSectionRedirect, SECTION_PATH_REDIRECTS } from "@/lib/section-redirects";

describe("resolveSectionRedirect", () => {
  it("mengarahkan path section polos ke anchor homepage", () => {
    expect(resolveSectionRedirect("/layanan")).toBe("#layanan");
    expect(resolveSectionRedirect("/terminal")).toBe("#terminal");
    expect(resolveSectionRedirect("/testimoni")).toBe("#testimoni");
  });

  it("mengarahkan /toko ke #produk — id section di DOM 'produk', bukan 'toko'", () => {
    // App "Toko" di taskbar merender section ber-id "produk"
    // (products-section.tsx). Tombol "Kembali ke Toko" di detail produk juga
    // memakai /#produk, jadi ini harus konsisten.
    expect(resolveSectionRedirect("/toko")).toBe("#produk");
  });

  it("normalisasi: trailing slash dan huruf besar tetap ke anchor sama", () => {
    expect(resolveSectionRedirect("/layanan/")).toBe("#layanan");
    expect(resolveSectionRedirect("/layanan//")).toBe("#layanan");
    expect(resolveSectionRedirect("/Layanan")).toBe("#layanan");
    expect(resolveSectionRedirect("/TOKO")).toBe("#produk");
  });

  it("tidak menyentuh rute nyata — homepage, katalog, detail, admin, api", () => {
    expect(resolveSectionRedirect("/")).toBeNull();
    expect(resolveSectionRedirect("/proyek")).toBeNull();
    expect(resolveSectionRedirect("/artikel")).toBeNull();
    // /toko/[slug] adalah rute detail produk yang nyata — hanya /toko polos
    // yang redirect.
    expect(resolveSectionRedirect("/toko/template-portfolio-notion")).toBeNull();
    expect(resolveSectionRedirect("/proyek/dashboard-halaqah")).toBeNull();
    expect(resolveSectionRedirect("/admin")).toBeNull();
    expect(resolveSectionRedirect("/admin/products")).toBeNull();
    expect(resolveSectionRedirect("/api/retrobot")).toBeNull();
    expect(resolveSectionRedirect("/sitemap.xml")).toBeNull();
  });

  it("hanya memetakan empat path section virtual yang disengaja", () => {
    expect(Object.keys(SECTION_PATH_REDIRECTS).sort()).toEqual(
      ["/layanan", "/terminal", "/testimoni", "/toko"].sort(),
    );
  });
});
