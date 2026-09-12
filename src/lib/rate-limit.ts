// Simple in-memory sliding-window rate limiter.
// Suitable for single-instance / serverless (per-instance protection).
// For multi-instance deployments, swap this for Redis (Upstash / Vercel KV).

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetInMs: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || now >= existing.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, limit, resetInMs: windowMs };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, limit, resetInMs: existing.resetAt - now };
  }

  existing.count += 1;
  return { allowed: true, remaining: limit - existing.count, limit, resetInMs: existing.resetAt - now };
}

// Best-effort cleanup to avoid unbounded growth (called opportunistically).
export function cleanupRateLimits(maxEntries = 1000): void {
  if (store.size <= maxEntries) return;
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now >= entry.resetAt) store.delete(key);
  }
}
