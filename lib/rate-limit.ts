import { get } from "@/lib/db";

export type RateLimitRule = { max: number; windowSeconds: number };

/**
 * Fixed-window counter in SQLite. better-auth's own limiter only guards its
 * HTTP router, so `auth.api.*` calls from server actions need this instead.
 * One UPSERT keeps read-and-increment atomic. Returns false once over `max`.
 */
export function consumeRateLimit(key: string, { max, windowSeconds }: RateLimitRule): boolean {
  const now = Date.now();
  const windowStartedBefore = now - windowSeconds * 1000;
  const row = get<{ count: number }>(
    `INSERT INTO rate_limit (key, count, window_start) VALUES (?1, 1, ?2)
     ON CONFLICT (key) DO UPDATE SET
       count = CASE WHEN window_start <= ?3 THEN 1 ELSE count + 1 END,
       window_start = CASE WHEN window_start <= ?3 THEN ?2 ELSE window_start END
     RETURNING count`,
    [key, now, windowStartedBefore],
  );
  return row!.count <= max;
}

/**
 * Best-effort client IP. `x-forwarded-for` is only trustworthy behind a proxy
 * that overwrites it, which is why sign-in also limits per email.
 */
export function clientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}
