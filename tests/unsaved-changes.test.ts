import { describe, it, expect, beforeEach } from "vitest";
import {
  hasUnsavedChanges,
  setUnsavedChanges,
  isSnapshotDirty,
} from "@/lib/unsaved-changes";

describe("unsaved-changes store", () => {
  beforeEach(() => {
    setUnsavedChanges(false);
  });

  it("defaults to clean", () => {
    expect(hasUnsavedChanges()).toBe(false);
  });

  it("flag can be set and read synchronously", () => {
    setUnsavedChanges(true);
    expect(hasUnsavedChanges()).toBe(true);
    setUnsavedChanges(false);
    expect(hasUnsavedChanges()).toBe(false);
  });

  it("flag survives across calls within the same module instance", () => {
    setUnsavedChanges(true);
    expect(hasUnsavedChanges()).toBe(true);
    expect(hasUnsavedChanges()).toBe(true);
  });
});

describe("isSnapshotDirty", () => {
  it("identical primitives are clean", () => {
    expect(isSnapshotDirty("a", "a")).toBe(false);
    expect(isSnapshotDirty(1, 1)).toBe(false);
    expect(isSnapshotDirty(true, true)).toBe(false);
  });

  it("changed primitives are dirty", () => {
    expect(isSnapshotDirty("a", "b")).toBe(true);
    expect(isSnapshotDirty(1, 2)).toBe(true);
    expect(isSnapshotDirty(true, false)).toBe(true);
  });

  it("deep-equal objects are clean", () => {
    const a = { title: "x", order: 1, tags: ["a", "b"] };
    const b = { title: "x", order: 1, tags: ["a", "b"] };
    expect(isSnapshotDirty(a, b)).toBe(false);
  });

  it("nested change marks dirty", () => {
    const a = { title: "x", order: 1, tags: ["a", "b"] };
    const b = { title: "x", order: 1, tags: ["a", "c"] };
    expect(isSnapshotDirty(a, b)).toBe(true);
  });

  it("null vs undefined are distinguished (form field cleared)", () => {
    expect(isSnapshotDirty({ titleEn: null }, { titleEn: undefined })).toBe(true);
  });

  it("empty string vs null are distinguished (translation field emptied)", () => {
    expect(isSnapshotDirty({ titleEn: "Hello" }, { titleEn: "" })).toBe(true);
  });

  it("fresh form baseline equals its snapshot", () => {
    const fresh = { title: "", titleEn: "", description: "", order: 1, published: true };
    expect(isSnapshotDirty(fresh, { ...fresh })).toBe(false);
  });

  it("baseline undefined vs snapshot object is dirty", () => {
    expect(isSnapshotDirty(undefined, { title: "a" })).toBe(true);
  });
});
