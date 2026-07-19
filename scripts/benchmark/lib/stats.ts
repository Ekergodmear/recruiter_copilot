export type LatencyStats = {
  count: number;
  averageMs: number;
  medianMs: number;
  p95Ms: number;
  maxMs: number;
  minMs: number;
  totalMs: number;
};

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)]!;
}

export function computeLatencyStats(samplesMs: number[]): LatencyStats {
  if (samplesMs.length === 0) {
    return {
      count: 0,
      averageMs: 0,
      medianMs: 0,
      p95Ms: 0,
      maxMs: 0,
      minMs: 0,
      totalMs: 0,
    };
  }
  const sorted = [...samplesMs].sort((a, b) => a - b);
  const totalMs = samplesMs.reduce((a, b) => a + b, 0);
  return {
    count: samplesMs.length,
    averageMs: totalMs / samplesMs.length,
    medianMs: percentile(sorted, 50),
    p95Ms: percentile(sorted, 95),
    maxMs: sorted[sorted.length - 1]!,
    minMs: sorted[0]!,
    totalMs,
  };
}

export function formatMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${ms.toFixed(2)}ms`;
}

export function parseSizeList(envValue: string | undefined, defaults: number[]): number[] {
  if (!envValue?.trim()) return defaults;
  return envValue
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
}
