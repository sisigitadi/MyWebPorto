import { describe, it, expect, beforeEach } from "vitest";
import fs from "fs";
import path from "path";
import {
  getSetting,
  setSetting,
  deleteSetting,
  recordSettingHistory,
  getSettingHistory,
  getSettingHistoryById,
} from "@/lib/settings";

const DATA_DIR = path.join(process.cwd(), "data");
const SETTINGS_FILE = path.join(DATA_DIR, "local-settings.json");
const HISTORY_FILE = path.join(DATA_DIR, "local-settings-history.json");

describe("settings layer: deleteSetting & settingsHistory", () => {
  beforeEach(() => {
    try {
      if (fs.existsSync(SETTINGS_FILE)) fs.unlinkSync(SETTINGS_FILE);
      if (fs.existsSync(HISTORY_FILE)) fs.unlinkSync(HISTORY_FILE);
    } catch {
      // ignore
    }
  });

  it("dapat menyimpan dan menghapus setting (deleteSetting)", async () => {
    await setSetting("test_draft", { active: true });
    let val = await getSetting<{ active: boolean }>("test_draft");
    expect(val?.active).toBe(true);

    await deleteSetting("test_draft");
    val = await getSetting<{ active: boolean }>("test_draft");
    expect(val).toBeNull();
  });

  it("dapat mencatat dan mengambil history snapshot (recordSettingHistory & getSettingHistory)", async () => {
    const rec1 = await recordSettingHistory({
      key: "features",
      value: { enable_terminal: true },
      label: "Versi 1 terminal aktif",
      actor: "user_test_1",
    });

    const rec2 = await recordSettingHistory({
      key: "features",
      value: { enable_terminal: false },
      label: "Versi 2 terminal mati",
      actor: "user_test_1",
    });

    const list = await getSettingHistory("features");
    expect(list.length).toBe(2);
    expect(list[0].id).toBe(rec2.id); // Terkini di urutan pertama
    expect(list[1].id).toBe(rec1.id);

    const single = await getSettingHistoryById(rec1.id);
    expect(single).not.toBeNull();
    expect(single?.label).toBe("Versi 1 terminal aktif");
    expect(single?.value).toEqual({ enable_terminal: true });
  });

  it("resolveFeatures: mode default abaikan draft, mode preview membaca draft", async () => {
    const { resolveFeatures } = await import("@/lib/features-config");
    // Tulis published features: enable_terminal = true
    await setSetting("features", { enable_terminal: true, enable_store_cart: true });
    // Tulis draft features: enable_terminal = false
    await setSetting("features:draft", { enable_terminal: false, enable_store_cart: true });

    const live = await resolveFeatures();
    expect(live.enable_terminal).toBe(true);

    const preview = await resolveFeatures({ preview: true });
    expect(preview.enable_terminal).toBe(false);
  });
});
