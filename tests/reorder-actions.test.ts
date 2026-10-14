import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

// revalidatePath outside Next request context throws invariant - mock noop.
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  reorderProjects,
  reorderServices,
  reorderArticles,
  reorderTestimonials,
  reorderProducts,
  getProjects,
  getServices,
  getArticles,
  getTestimonials,
  getProducts,
} from "@/lib/actions";

const writableEnv = process.env as Record<string, string | undefined>;
const OLD_PK = writableEnv.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

beforeEach(() => {
  // Placeholder key allows verifyAdmin to pass in local/offline test mode
  writableEnv.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_xxxx";
});

afterEach(() => {
  writableEnv.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = OLD_PK;
});

describe("Content Reordering Server Actions", () => {
  it("rejects invalid or empty reorder items", async () => {
    const res1 = await reorderProjects([]);
    expect(res1.success).toBe(false);

    // @ts-expect-error test invalid payload
    const res2 = await reorderServices(null);
    expect(res2.success).toBe(false);

    // @ts-expect-error test invalid payload
    const res3 = await reorderArticles(undefined);
    expect(res3.success).toBe(false);

    const res4 = await reorderTestimonials([]);
    expect(res4.success).toBe(false);

    const res5 = await reorderProducts([]);
    expect(res5.success).toBe(false);
  });

  it("reorders services and reflects updated order", async () => {
    const list = await getServices();
    expect(list.length).toBeGreaterThan(1);

    // Swap first two services
    const first = list[0];
    const second = list[1];

    const reorderedList = [second, first, ...list.slice(2)];
    const reorderedPayload = reorderedList.map((item, idx) => ({
      id: item.id,
      order: idx + 1,
    }));

    const res = await reorderServices(reorderedPayload);
    expect(res.success).toBe(true);

    const updated = await getServices();
    expect(updated[0].id).toBe(second.id);
    expect(updated[1].id).toBe(first.id);
  });

  it("reorders projects and reflects updated order", async () => {
    const list = await getProjects({ includeScheduled: true });
    expect(list.length).toBeGreaterThan(1);

    const first = list[0];
    const second = list[1];

    const reorderedList = [second, first, ...list.slice(2)];
    const reorderedPayload = reorderedList.map((item, idx) => ({
      id: item.id,
      order: idx + 1,
    }));

    const res = await reorderProjects(reorderedPayload);
    expect(res.success).toBe(true);

    const updated = await getProjects({ includeScheduled: true });
    expect(updated[0].id).toBe(second.id);
    expect(updated[1].id).toBe(first.id);
  });

  it("reorders articles and reflects updated order", async () => {
    const list = await getArticles({ includeScheduled: true });
    expect(list.length).toBeGreaterThan(1);

    const first = list[0];
    const second = list[1];

    const reorderedList = [second, first, ...list.slice(2)];
    const reorderedPayload = reorderedList.map((item, idx) => ({
      id: item.id,
      order: idx + 1,
    }));

    const res = await reorderArticles(reorderedPayload);
    expect(res.success).toBe(true);

    const updated = await getArticles({ includeScheduled: true });
    expect(updated[0].id).toBe(second.id);
    expect(updated[1].id).toBe(first.id);
  });

  it("reorders testimonials and reflects updated order", async () => {
    const list = await getTestimonials();
    expect(list.length).toBeGreaterThan(1);

    const first = list[0];
    const second = list[1];

    const reorderedList = [second, first, ...list.slice(2)];
    const reorderedPayload = reorderedList.map((item, idx) => ({
      id: item.id,
      order: idx + 1,
    }));

    const res = await reorderTestimonials(reorderedPayload);
    expect(res.success).toBe(true);

    const updated = await getTestimonials();
    expect(updated[0].id).toBe(second.id);
    expect(updated[1].id).toBe(first.id);
  });

  it("reorders products and reflects updated order", async () => {
    const list = await getProducts();
    expect(list.length).toBeGreaterThan(1);

    const first = list[0];
    const second = list[1];

    const reorderedList = [second, first, ...list.slice(2)];
    const reorderedPayload = reorderedList.map((item, idx) => ({
      id: item.id,
      order: idx + 1,
    }));

    const res = await reorderProducts(reorderedPayload);
    expect(res.success).toBe(true);

    const updated = await getProducts();
    expect(updated[0].id).toBe(second.id);
    expect(updated[1].id).toBe(first.id);
  });
});
