// src/probe-score.ts — 0-100 score calculator (MIT)

export interface ProbeRunItemLike {
  status: "pending" | "running" | "done" | "error" | "skipped";
  passed: true | false | "warning" | null;
  neutral: boolean;
}

export function computeProbeScore(items: ProbeRunItemLike[]): { low: number; high: number } {
  const done = items.filter(i => (i.status === "done" || i.status === "error" || i.status === "skipped") && !i.neutral);
  if (done.length === 0) return { low: 0, high: 0 };

  let points = 0;
  let nullCount = 0;
  for (const item of done) {
    if (item.passed === true) points += 1;
    else if (item.passed === "warning") points += 0.5;
    else if (item.passed === null) nullCount += 1;
  }

  const low = Math.round((points / done.length) * 100);
  const high = Math.round(((points + nullCount) / done.length) * 100);
  return { low, high };
}
