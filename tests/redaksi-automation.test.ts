import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import {
  resolveRedaksiAutomation,
  saveRedaksiAutomation,
  computePublishIntent,
  stageDraft,
  listStagedDrafts,
  deleteStagedDraft,
  getStagedDraft,
} from "@/lib/redaksi-automation";
import {
  DEFAULT_REDAKSI_AUTOMATION,
  MAX_PER_RUN_HARD_CAP,
} from "@/lib/redaksi-automation-meta";

/**
 * resolve/save membaca-tulis setting "redaksi_auto" & "redaksi_staging"; di
 * lingkungan test tidak ada DB terhubung sehingga getSetting/setSetting memakai
 * file data/local-settings.json. File itu harus bersih di awal & akhir test.
 *
 * File ini menulis/membaca berkas bersama dengan cloud-ai-config.test.ts,
 * features-config.test.ts, os-apps-config.test.ts, ui-strings-config.test.ts,
 * settings-history.test.ts — karenanya WAJIB terdaftar di SHARED_FS_TESTS
 * (project serial) di vitest.config.mts. Bila lupa, beforeEach satu file
 * menghapus file persis saat file lain menulis → flaky race.
 */

const LOCAL_SETTINGS = path.join(process.cwd(), "data", "local-settings.json");

function clearLocalSettings(): void {
  try {
    if (fs.existsSync(LOCAL_SETTINGS)) fs.unlinkSync(LOCAL_SETTINGS);
  } catch {
    // Ignore: mungkin sedang ditulis worker lain.
  }
}

async function writeSetting(key: string, payload: unknown): Promise<void> {
  await fs.promises.mkdir(path.dirname(LOCAL_SETTINGS), { recursive: true });
  const existing = fs.existsSync(LOCAL_SETTINGS)
    ? JSON.parse(fs.readFileSync(LOCAL_SETTINGS, "utf-8"))
    : {};
  await fs.promises.writeFile(
    LOCAL_SETTINGS,
    JSON.stringify({ ...existing, [key]: payload })
  );
}

beforeEach(clearLocalSettings);
afterEach(clearLocalSettings);

describe("resolveRedaksiAutomation (toleran — infra rusak tidak mengarang konten)", () => {
  it("DB kosong → DEFAULT: master OFF, tanpa topik, autoUpload OFF", async () => {
    const cfg = await resolveRedaksiAutomation();
    expect(cfg).toEqual(DEFAULT_REDAKSI_AUTOMATION);
    expect(cfg.enabled).toBe(false);
    expect(cfg.autoUpload).toBe(false);
    expect(cfg.scheduleMode).toBe("manual");
    expect(cfg.topics.article).toEqual([]);
  });

  it("shape hancur (array/string/null) → DEFAULT, tidak melempar", async () => {
    await writeSetting("redaksi_auto", [1, 2, 3]);
    expect(await resolveRedaksiAutomation()).toEqual(DEFAULT_REDAKSI_AUTOMATION);
    await writeSetting("redaksi_auto", "on");
    expect(await resolveRedaksiAutomation()).toEqual(DEFAULT_REDAKSI_AUTOMATION);
    await writeSetting("redaksi_auto", null);
    expect(await resolveRedaksiAutomation()).toEqual(DEFAULT_REDAKSI_AUTOMATION);
  });

  it("tipe salah per-field ditoleransi (fail-closed ke nilai aman)", async () => {
    await writeSetting("redaksi_auto", {
      enabled: "yes", // non-boolean → false
      autoUpload: 1, // non-boolean → false
      scheduleMode: "kapan-kapan", // bukan scheduled → manual
      maxPerRun: "banyak", // non-numerik → default
      publishAt: 12345, // non-string → null
    });
    const cfg = await resolveRedaksiAutomation();
    expect(cfg.enabled).toBe(false);
    expect(cfg.autoUpload).toBe(false);
    expect(cfg.scheduleMode).toBe("manual");
    expect(cfg.maxPerRun).toBe(DEFAULT_REDAKSI_AUTOMATION.maxPerRun);
    expect(cfg.publishAt).toBe(null);
  });

  it("maxPerRun melebihi hard cap → dipotong ke batas", async () => {
    await writeSetting("redaksi_auto", { maxPerRun: 99999 });
    expect((await resolveRedaksiAutomation()).maxPerRun).toBe(MAX_PER_RUN_HARD_CAP);
  });

  it("section asing diabaikan; section terdaftar tetap dibaca", async () => {
    await writeSetting("redaksi_auto", {
      sections: { article: true, evil_section: true },
    });
    const cfg = await resolveRedaksiAutomation();
    expect(cfg.sections.article).toBe(true);
    expect((cfg.sections as Record<string, unknown>).evil_section).toBeUndefined();
  });

  it("topik: pendek (<4) dibuang, non-string dibuang, key asing diabaikan", async () => {
    await writeSetting("redaksi_auto", {
      topics: {
        article: ["Topik valid panjang", "abc", 42, "   "],
        evil_section: ["Topik key asing"],
      },
    });
    const cfg = await resolveRedaksiAutomation();
    expect(cfg.topics.article).toEqual(["Topik valid panjang"]);
    expect((cfg.topics as Record<string, unknown>).evil_section).toBeUndefined();
  });
});

describe("saveRedaksiAutomation (input admin ditolak keras)", () => {
  it("bukan object → throw", async () => {
    await expect(saveRedaksiAutomation("string")).rejects.toThrow(/tidak valid/);
  });

  it("top-level key asing → throw dengan nama key", async () => {
    await expect(
      saveRedaksiAutomation({ enabled: true, evil: true })
    ).rejects.toThrow(/evil/);
  });

  it("section tidak dikenal → throw", async () => {
    await expect(
      saveRedaksiAutomation({ sections: { evil: true } })
    ).rejects.toThrow(/evil/);
  });

  it("nilai section bukan boolean → throw", async () => {
    await expect(saveRedaksiAutomation({ sections: { article: "on" } })).rejects.toThrow(
      /true\/false/
    );
  });

  it("topik bukan array → throw", async () => {
    await expect(saveRedaksiAutomation({ topics: { article: "satu topik" } })).rejects.toThrow(
      /daftar topik/
    );
  });

  it("publishAt tidak valid → throw", async () => {
    await expect(
      saveRedaksiAutomation({ scheduleMode: "manual", publishAt: "bukan-tanggal" })
    ).rejects.toThrow(/waktu upload/i);
  });

  it("mode terjadwal tanpa publishAt → throw", async () => {
    await expect(saveRedaksiAutomation({ scheduleMode: "scheduled" })).rejects.toThrow(
      /wajib mengisi/
    );
  });

  it("input valid → disimpan & dibaca kembali; lastRunAt tidak ditimpa form", async () => {
    const lastRun = "2026-01-01T00:00:00.000Z";
    await writeSetting("redaksi_auto", { lastRunAt: lastRun });
    const saved = await saveRedaksiAutomation({
      enabled: true,
      sections: { article: true },
      topics: { article: ["Topik artikel panjang"] },
      autoUpload: false,
      scheduleMode: "manual",
      publishAt: null,
      maxPerRun: 3,
    });
    expect(saved.enabled).toBe(true);
    expect(saved.lastRunAt).toBe(lastRun); // form tidak menyentuh lastRunAt

    const reread = await resolveRedaksiAutomation();
    expect(reread.enabled).toBe(true);
    expect(reread.sections.article).toBe(true);
    expect(reread.topics.article).toEqual(["Topik artikel panjang"]);
    expect(reread.maxPerRun).toBe(3);
    expect(reread.lastRunAt).toBe(lastRun);
  });
});

describe("computePublishIntent (murni)", () => {
  it("manual → draft, tanpa publishAt", () => {
    const r = computePublishIntent({
      ...DEFAULT_REDAKSI_AUTOMATION,
      autoUpload: false,
      scheduleMode: "manual",
    });
    expect(r).toEqual({ intendedPublished: false, intendedPublishAt: null });
  });

  it("autoUpload ON → published langsung tanpa publishAt", () => {
    const r = computePublishIntent({
      ...DEFAULT_REDAKSI_AUTOMATION,
      autoUpload: true,
      scheduleMode: "manual",
    });
    expect(r).toEqual({ intendedPublished: true, intendedPublishAt: null });
  });

  it("terjadwal dengan publishAt → published + publishAt", () => {
    const at = "2027-01-01T08:00";
    const r = computePublishIntent({
      ...DEFAULT_REDAKSI_AUTOMATION,
      scheduleMode: "scheduled",
      publishAt: at,
    });
    expect(r).toEqual({ intendedPublished: true, intendedPublishAt: at });
  });

  it("terjadwal tapi publishAt hilang → fail-closed jadi draft", () => {
    const r = computePublishIntent({
      ...DEFAULT_REDAKSI_AUTOMATION,
      scheduleMode: "scheduled",
      publishAt: null,
    });
    expect(r.intendedPublished).toBe(false);
  });
});

describe("staging draf (semua hasil auto-tulis butuh 1x review manusia)", () => {
  it("tambah → muncul di daftar (terbaru di depan); hapus & ambil by id", async () => {
    const a = await stageDraft({
      type: "article",
      topic: "Topik A yang panjang",
      data: { title: "A", content: "Isi artikel" },
      intendedPublished: false,
      intendedPublishAt: null,
    });
    const b = await stageDraft({
      type: "article",
      topic: "Topik B yang panjang",
      data: { title: "B", content: "Isi artikel" },
      intendedPublished: true,
      intendedPublishAt: "2027-01-01T08:00",
    });
    const list = await listStagedDrafts();
    expect(list).toHaveLength(2);
    expect(list[0].id).toBe(b.id); // unshift → terbaru di depan
    expect(list[1].id).toBe(a.id);
    expect((await getStagedDraft(b.id))?.topic).toBe("Topik B yang panjang");
    expect(await getStagedDraft("tidak-ada")).toBe(null);

    await deleteStagedDraft(a.id);
    expect(await listStagedDrafts()).toHaveLength(1);
  });

  it("data staging rusak (bukan array / entry cacat) → diabaikan, tidak throw", async () => {
    await writeSetting("redaksi_staging", "bukan-array");
    expect(await listStagedDrafts()).toEqual([]);
    await writeSetting("redaksi_staging", [{ rusak: true }, { id: "x" }]);
    expect(await listStagedDrafts()).toEqual([]);
  });

  it("panggung tidak pernah melebihi MAX_STAGED (yang tertua dipotong)", async () => {
    for (let i = 0; i < 52; i++) {
      await stageDraft({
        type: "service",
        topic: `Topik nomor ${i}`,
        data: { title: `T${i}`, description: "Deskripsi singkat" },
        intendedPublished: false,
        intendedPublishAt: null,
      });
    }
    const list = await listStagedDrafts();
    expect(list.length).toBeLessThanOrEqual(50);
  });
});
