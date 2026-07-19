export type MemorySnapshot = {
  rss: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
  at: string;
};

export function takeMemorySnapshot(): MemorySnapshot {
  const m = process.memoryUsage();
  return {
    rss: m.rss,
    heapUsed: m.heapUsed,
    heapTotal: m.heapTotal,
    external: m.external,
    arrayBuffers: m.arrayBuffers,
    at: new Date().toISOString(),
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function memoryTableRow(label: string, snap: MemorySnapshot): string {
  return `| ${label} | ${formatBytes(snap.rss)} | ${formatBytes(snap.heapUsed)} | ${formatBytes(snap.heapTotal)} | ${formatBytes(snap.external)} |`;
}
