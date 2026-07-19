/**
 * TECH-002 — Lightweight timing (no APM). Opt-in only; zero cost when unused.
 */

export type OperationSample = {
  name: string;
  durationMs: number;
  at: string;
};

export type OperationStats = {
  name: string;
  callCount: number;
  totalMs: number;
  averageMs: number;
  medianMs: number;
  p95Ms: number;
  maxMs: number;
};

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)]!;
}

export class OperationProfiler {
  private readonly samples: OperationSample[] = [];

  record(name: string, durationMs: number): void {
    this.samples.push({
      name,
      durationMs,
      at: new Date().toISOString(),
    });
  }

  async time<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      return await fn();
    } finally {
      this.record(name, performance.now() - start);
    }
  }

  timeSync<T>(name: string, fn: () => T): T {
    const start = performance.now();
    try {
      return fn();
    } finally {
      this.record(name, performance.now() - start);
    }
  }

  getSamples(): readonly OperationSample[] {
    return this.samples;
  }

  statsByName(): OperationStats[] {
    const groups = new Map<string, number[]>();
    for (const s of this.samples) {
      const list = groups.get(s.name) ?? [];
      list.push(s.durationMs);
      groups.set(s.name, list);
    }
    return [...groups.entries()]
      .map(([name, values]) => {
        const sorted = [...values].sort((a, b) => a - b);
        const totalMs = values.reduce((a, b) => a + b, 0);
        return {
          name,
          callCount: values.length,
          totalMs,
          averageMs: totalMs / values.length,
          medianMs: percentile(sorted, 50),
          p95Ms: percentile(sorted, 95),
          maxMs: sorted[sorted.length - 1] ?? 0,
        };
      })
      .sort((a, b) => b.totalMs - a.totalMs);
  }

  top(n = 5): OperationStats[] {
    return this.statsByName().slice(0, n);
  }

  reset(): void {
    this.samples.length = 0;
  }
}

/** Wrap all own async/sync methods of a repository-like object. */
export function wrapWithProfiler<T extends object>(
  label: string,
  target: T,
  profiler: OperationProfiler,
): T {
  return new Proxy(target, {
    get(obj, prop, receiver) {
      const value = Reflect.get(obj, prop, receiver);
      if (typeof value !== "function" || typeof prop !== "string") {
        return value;
      }
      const opName = `${label}.${prop}`;
      return (...args: unknown[]) => {
        const result = value.apply(obj, args);
        if (result && typeof (result as Promise<unknown>).then === "function") {
          const start = performance.now();
          return (result as Promise<unknown>).finally(() => {
            profiler.record(opName, performance.now() - start);
          });
        }
        return profiler.timeSync(opName, () => result);
      };
    },
  }) as T;
}
