import { describe, it, expect } from "vitest";
import { formatForWhatsApp } from "@/lib/whatsapp-bot/wa-formatter";

describe("WhatsApp Rich Text Formatter (formatForWhatsApp)", () => {
  it("harus mengonversi **teks** menjadi *teks* untuk bold WhatsApp", () => {
    const input = "Halo! Ini adalah **Template Dashboard SaaS** dengan harga **Rp 250.000**.";
    const result = formatForWhatsApp(input);

    expect(result).not.toContain("**");
    expect(result).toContain("*Template Dashboard SaaS*");
    expect(result).toContain("*Rp 250.000*");
  });

  it("harus mengonversi heading markdown menjadi bold WhatsApp", () => {
    const input = "### DAFTAR REKENING RESMI\nSilakan transfer ke rekening berikut.";
    const result = formatForWhatsApp(input);

    expect(result).not.toContain("###");
    expect(result).toContain("*DAFTAR REKENING RESMI*");
  });

  it("harus mengonversi strikethrough ~~teks~~ menjadi ~teks~", () => {
    const input = "Harga lama: ~~Rp 500.000~~ sekarang Rp 250.000";
    const result = formatForWhatsApp(input);

    expect(result).not.toContain("~~");
    expect(result).toContain("~Rp 500.000~");
  });

  it("harus mengonversi list dash (-) dan asterisk (*) menjadi bullet rapi (•)", () => {
    const input = "Fitur:\n- Next.js 16\n- TypeScript\n* Tailwind CSS";
    const result = formatForWhatsApp(input);

    expect(result).toContain("• Next.js 16");
    expect(result).toContain("• TypeScript");
    expect(result).toContain("• Tailwind CSS");
  });

  it("tidak boleh merusak kode di dalam code block", () => {
    const input = "Gunakan kode berikut:\n```\nconst x = **test**;\n```\nSelesai!";
    const result = formatForWhatsApp(input);

    expect(result).toContain("const x = **test**;");
  });
});
