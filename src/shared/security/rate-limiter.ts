export type RateLimitConfig = {
  enabled: boolean;
  windowMs: number;
  maxRequests: number;
};

type Bucket = { count: number; resetAt: number };

/**
 * Simple in-memory sliding fixed-window limiter per key (IP). No Redis.
 */
export class InMemoryRateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(private readonly config: RateLimitConfig) {}

  /** @returns null if allowed; retryAfterSec if limited */
  check(key: string): { limited: boolean; retryAfterSec: number; remaining: number } {
    if (!this.config.enabled) {
      return { limited: false, retryAfterSec: 0, remaining: this.config.maxRequests };
    }
    const now = Date.now();
    let bucket = this.buckets.get(key);
    if (!bucket || now >= bucket.resetAt) {
      bucket = { count: 0, resetAt: now + this.config.windowMs };
      this.buckets.set(key, bucket);
    }
    bucket.count += 1;
    const remaining = Math.max(0, this.config.maxRequests - bucket.count);
    if (bucket.count > this.config.maxRequests) {
      return {
        limited: true,
        retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
        remaining: 0,
      };
    }
    // opportunistic cleanup
    if (this.buckets.size > 10_000) this.prune(now);
    return { limited: false, retryAfterSec: 0, remaining };
  }

  private prune(now: number): void {
    for (const [k, b] of this.buckets) {
      if (now >= b.resetAt) this.buckets.delete(k);
    }
  }
}
