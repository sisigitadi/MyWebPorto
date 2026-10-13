import { describe, it, expect } from "vitest";
import { cleanTextForTTS } from "@/lib/tts-sanitizer";

describe("TTS Sanitizer (cleanTextForTTS)", () => {
  it("harus menghapus seluruh emoji dan pictograph Unicode", () => {
    const input = "Halo! 👤 Pemesan: *Budi Santoso* 📦 Total: 💰 Rp 250.000 📊 Status: Sukses 🚀";
    const result = cleanTextForTTS(input);

    expect(result).not.toContain("👤");
    expect(result).not.toContain("📦");
    expect(result).not.toContain("💰");
    expect(result).not.toContain("📊");
    expect(result).not.toContain("🚀");
    expect(result).toContain("Halo!");
    expect(result).toContain("Pemesan: Budi Santoso");
    expect(result).toContain("Total: Rp 250.000");
  });

  it("harus menghapus simbol bullet, bintang markdown, dan badge teknis", () => {
    const input = "[LOKAL] • Template Dashboard (x1) • Source Code API. [CLOUD] Selesai!";
    const result = cleanTextForTTS(input);

    expect(result).not.toContain("[LOKAL]");
    expect(result).not.toContain("[CLOUD]");
    expect(result).not.toContain("•");
    expect(result).toContain("Template Dashboard (x1)");
    expect(result).toContain("Source Code API");
  });

  it("harus menghapus URL dan penanda markdown", () => {
    const input = "Kunjungi website kami di https://sigitadi.id/order/INV-001 untuk **detail** _lengkap_.";
    const result = cleanTextForTTS(input);

    expect(result).not.toContain("https://");
    expect(result).not.toContain("**");
    expect(result).not.toContain("_");
    expect(result).toContain("Kunjungi website kami di");
    expect(result).toContain("detail lengkap");
  });

  it("harus menangani string kosong atau input non-string secara aman", () => {
    expect(cleanTextForTTS("")).toBe("");
    expect(cleanTextForTTS(null as unknown as string)).toBe("");
    expect(cleanTextForTTS(undefined as unknown as string)).toBe("");
  });
});
