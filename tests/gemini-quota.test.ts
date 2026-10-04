import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import {
  getGeminiQuotaSnapshot,
  recordGeminiRateLimit,
  recordGeminiRequest,
} from "@/lib/gemini-quota";

// Pakai fake timers supaya rolling window (60 detik / 24 jam) bisa dimajukan
// tanpa menunggu nyata.
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-04T12:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
  delete process.env.GEMINI_FREE_RPM;
  delete process.env.GEMINI_FREE_RPD;
});

describe("getGeminiQuotaSnapshot — rolling window", () => {
  it("RPM kedaluwarsa setelah 60 detik, RPD tetap dihitung", () => {
    recordGeminiRequest("gemini-2.5-flash-a");
    recordGeminiRequest("gemini-2.5-flash-a");
    let snap = getGeminiQuotaSnapshot(["gemini-2.5-flash-a"]);
    expect(snap.models[0].rpmUsed).toBe(2);
    expect(snap.models[0].rpdUsed).toBe(2);

    // Maju 61 detik: rolling window RPM sudah kedaluwarsa, RPD (24 jam) belum.
    vi.setSystemTime(new Date("2026-10-04T12:01:01Z"));
    snap = getGeminiQuotaSnapshot(["gemini-2.5-flash-a"]);
    expect(snap.models[0].rpmUsed).toBe(0);
    expect(snap.models[0].rpdUsed).toBe(2);
  });

  it("RPD kedaluwarsa setelah 24 jam", () => {
    recordGeminiRequest("gemini-2.5-flash-b");
    vi.setSystemTime(new Date("2026-10-05T13:00:00Z")); // > 24 jam kemudian
    const snap = getGeminiQuotaSnapshot(["gemini-2.5-flash-b"]);
    expect(snap.models[0].rpmUsed).toBe(0);
    expect(snap.models[0].rpdUsed).toBe(0);
  });

  it("hitungan per-model independen", () => {
    recordGeminiRequest("gemini-2.0-flash");
    recordGeminiRequest("gemini-2.0-flash");
    recordGeminiRequest("gemini-1.5-flash");
    const snap = getGeminiQuotaSnapshot(["gemini-2.0-flash", "gemini-1.5-flash"]);
    const byModel = new Map(snap.models.map((m) => [m.model, m]));
    expect(byModel.get("gemini-2.0-flash")?.rpmUsed).toBe(2);
    expect(byModel.get("gemini-1.5-flash")?.rpmUsed).toBe(1);
  });

  it("model duplikat & kosong diabaikan; model aktif tetap di urutan pertama", () => {
    recordGeminiRequest("gemini-2.5-flash-c");
    const snap = getGeminiQuotaSnapshot([
      "gemini-2.5-flash-c",
      "gemini-2.5-flash-c",
      "",
      "gemini-2.0-flash",
    ]);
    expect(snap.models.map((m) => m.model)).toEqual([
      "gemini-2.5-flash-c",
      "gemini-2.0-flash",
    ]);
  });
});

describe("getGeminiQuotaSnapshot — batas default", () => {
  it("tabel default per keluarga model (flash lebih longgar dari pro)", () => {
    const snap = getGeminiQuotaSnapshot(["gemini-1.5-pro", "gemini-1.5-flash"]);
    const byModel = new Map(snap.models.map((m) => [m.model, m]));
    expect(byModel.get("gemini-1.5-pro")?.rpdLimit).toBe(50);
    expect(byModel.get("gemini-1.5-flash")?.rpdLimit).toBe(1500);
    expect(snap.models.every((m) => m.limitSource === "default")).toBe(true);
  });

  it("varian preview dikecohkan ke batas keluarga (prefix match)", () => {
    const snap = getGeminiQuotaSnapshot(["gemini-2.5-flash-preview-05-20"]);
    expect(snap.models[0].rpmLimit).toBe(10);
  });

  it("model tak dikenal jatuh ke default global", () => {
    const snap = getGeminiQuotaSnapshot(["gemini-9.9-nano"]);
    expect(snap.models[0].rpmLimit).toBe(10);
    expect(snap.models[0].rpdLimit).toBe(250);
  });

  it("env GEMINI_FREE_RPM / GEMINI_FREE_RPD menimpa default", () => {
    process.env.GEMINI_FREE_RPM = "20";
    process.env.GEMINI_FREE_RPD = "500";
    const snap = getGeminiQuotaSnapshot(["gemini-2.5-flash-d"]);
    expect(snap.models[0].rpmLimit).toBe(20);
    expect(snap.models[0].rpdLimit).toBe(500);
    expect(snap.models[0].limitSource).toBe("env");
  });

  it("env non-angka diabaikan (jatuh kembali ke default)", () => {
    process.env.GEMINI_FREE_RPM = "bukan-angka";
    const snap = getGeminiQuotaSnapshot(["gemini-2.5-flash-e"]);
    expect(snap.models[0].rpmLimit).toBe(10);
    expect(snap.models[0].limitSource).toBe("default");
  });
});

describe("recordGeminiRateLimit — learned limits", () => {
  it("tubuh 429 RPM Google dipelajari dan menimpa default/env", () => {
    process.env.GEMINI_FREE_RPM = "999";
    const body = JSON.stringify({
      error: {
        code: 429,
        message:
          "Quota exceeded for quota metric 'Requests per minute per project' and limit 'Requests per minute per project' of service 'generativelanguage.googleapis.com' for consumer 'project_number: 123'. Requests per minute: 10. Requests per minute per project: 10.",
        status: "RESOURCE_EXHAUSTED",
      },
    });
    recordGeminiRateLimit("gemini-2.5-flash-f", { status: 429, body });
    const snap = getGeminiQuotaSnapshot(["gemini-2.5-flash-f"]);
    // Learned (10) menimpa env (999).
    expect(snap.models[0].rpmLimit).toBe(10);
    expect(snap.models[0].limitSource).toBe("learned");
  });

  it("tubuh 429 RPD mempelajari batas harian", () => {
    const body = JSON.stringify({
      error: {
        code: 429,
        message: "Requests per day: 250. Requests per day per project: 250.",
      },
    });
    recordGeminiRateLimit("gemini-2.5-flash-g", { status: 429, body });
    const snap = getGeminiQuotaSnapshot(["gemini-2.5-flash-g"]);
    expect(snap.models[0].rpdLimit).toBe(250);
  });

  it("cadangan terstruktur: metadata.quotaValue + quotaId 'Day'", () => {
    const body = JSON.stringify({
      error: {
        message: "Resource has been exhausted",
        details: [
          {
            "@type": "type.googleapis.com/google.rpc.ErrorInfo",
            reason: "RATE_LIMIT_EXCEEDED",
            metadata: {
              quotaValue: "1500",
              quotaId: "RequestsPerDayPerProject-abc",
              service: "generativelanguage.googleapis.com",
            },
          },
        ],
      },
    });
    recordGeminiRateLimit("gemini-2.0-flash-h", { status: 429, body });
    const snap = getGeminiQuotaSnapshot(["gemini-2.0-flash-h"]);
    expect(snap.models[0].rpdLimit).toBe(1500);
  });

  it("Retry-After (detik) → status 'limited' + limitedUntil di masa depan", () => {
    recordGeminiRateLimit("gemini-2.5-flash-i", {
      status: 429,
      body: JSON.stringify({ error: { message: "Requests per minute: 10." } }),
      retryAfter: "45",
    });
    const snap = getGeminiQuotaSnapshot(["gemini-2.5-flash-i"]);
    expect(snap.models[0].status).toBe("limited");
    expect(snap.models[0].limitedUntil).toBeGreaterThan(Date.now());
  });

  it("limitedUntil kedaluwarsa → status kembali 'ok'", () => {
    recordGeminiRateLimit("gemini-2.5-flash-j", { status: 429, retryAfter: "10" });
    vi.setSystemTime(new Date("2026-10-04T12:01:00Z")); // 60 detik kemudian
    const snap = getGeminiQuotaSnapshot(["gemini-2.5-flash-j"]);
    expect(snap.models[0].status).toBe("ok");
  });

  it("status 'near' ketika pemakaian >= 80% batas RPM", () => {
    // Batas default RPM gemini-1.5-flash = 15; 12/15 = 80%.
    for (let i = 0; i < 12; i++) recordGeminiRequest("gemini-1.5-flash-k");
    const snap = getGeminiQuotaSnapshot(["gemini-1.5-flash-k"]);
    expect(snap.models[0].status).toBe("near");
  });

  it("badan error bukan JSON / kosong tidak throw & tidak mengubah batas", () => {
    expect(() =>
      recordGeminiRateLimit("gemini-2.5-flash-l", {
        status: 429,
        body: "<html>Server Error</html>",
      })
    ).not.toThrow();
    expect(() =>
      recordGeminiRateLimit("gemini-2.5-flash-l", { status: 503, body: null })
    ).not.toThrow();
    const snap = getGeminiQuotaSnapshot(["gemini-2.5-flash-l"]);
    expect(snap.models[0].limitSource).toBe("default");
    expect(snap.models[0].status).toBe("ok");
  });
});

describe("getGeminiQuotaSnapshot — bentuk output", () => {
  it("menyertakan metadata window + generatedAt", () => {
    recordGeminiRequest("gemini-2.5-flash-m");
    const snap = getGeminiQuotaSnapshot(["gemini-2.5-flash-m"]);
    expect(snap.rollingWindowRpmMs).toBe(60_000);
    expect(snap.rollingWindowRpdMs).toBe(24 * 60 * 60 * 1000);
    expect(snap.generatedAt).toBe(Date.now());
    expect(snap.models[0].lastRequestAt).toBe(Date.now());
    expect(snap.models[0].model).toBe("gemini-2.5-flash-m");
  });
});
