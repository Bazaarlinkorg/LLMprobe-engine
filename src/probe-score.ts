// src/probe-score.ts — 0–100 score calculator (MIT)

export interface ProbeRunItemLike {
  status: "pending" | "running" | "done" | "error" | "skipped";
  passed: true | false | "warning" | null;
  neutral: boolean;
}

/**
 * Calculate 0–100 quality scores from probe run items.
 * All completed items (done + error + skipped) are included in the denominator.
 * - true      = 1 point
 * - "warning" = 0.5 points
 * - false     = 0 points
 * - error     = 0 points
 * - null      = 0 points (low) / 1 point (high) — human review / no baseline
 *
 * Returns { low, high }:
 *   low  = conservative score (null items treated as failed)
 *   high = optimistic score (null items treated as passed)
 *   When no null items exist, low === high.
 */
export function computeProbeScore(items: ProbeRunItemLike[]): { low: number; high: number } {
  // Neutral probes are informational only — excluded from both numerator and denominator.
  const done = items.filter(i => (i.status === "done" || i.status === "error" || i.status === "skipped") && !i.neutral);
  if (done.length === 0) return { low: 0, high: 0 };

  let points = 0;
  let nullCount = 0;
  for (const item of done) {
    if (item.passed === true) points += 1;
    else if (item.passed === "warning") points += 0.5;
    else if (item.passed === null) nullCount += 1;
    // false or error status = 0 points
  }

  const low = Math.round((points / done.length) * 100);
  const high = Math.round(((points + nullCount) / done.length) * 100);
  return { low, high };
}
