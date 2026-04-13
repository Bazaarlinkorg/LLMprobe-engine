import { describe, it, expect } from "vitest";
import { computeProbeScore } from "../probe-score.js";
import type { ProbeRunItemLike } from "../probe-score.js";

function item(passed: ProbeRunItemLike["passed"], status: ProbeRunItemLike["status"] = "done", neutral = false): ProbeRunItemLike {
  return { passed, status, neutral };
}

describe("computeProbeScore", () => {
  it("returns 100/100 when all items pass", () => {
    expect(computeProbeScore([item(true), item(true), item(true)])).toEqual({ low: 100, high: 100 });
  });

  it("returns 0/0 when all items fail", () => {
    expect(computeProbeScore([item(false), item(false)])).toEqual({ low: 0, high: 0 });
  });

  it("returns 0/0 when no done items exist", () => {
    expect(computeProbeScore([item(null, "pending"), item(null, "pending")])).toEqual({ low: 0, high: 0 });
  });

  it("counts warning as 0.5 points", () => {
    // 1 pass + 1 warning / 2 done = 75
    expect(computeProbeScore([item(true), item("warning")])).toEqual({ low: 75, high: 75 });
  });

  it("null items raise high but not low", () => {
    // 1 pass + 1 null / 2 done → low=50, high=100
    expect(computeProbeScore([item(true), item(null)])).toEqual({ low: 50, high: 100 });
  });

  it("multiple null items compound in high score", () => {
    // 0 pass + 3 null → low=0, high=100
    expect(computeProbeScore([item(null), item(null), item(null)])).toEqual({ low: 0, high: 100 });
  });

  it("excludes neutral items from scoring denominator", () => {
    // 2 pass (non-neutral) + 1 neutral warning → only 2 scored, score = 100/100
    expect(computeProbeScore([item(true), item(true), item("warning", "done", true)])).toEqual({ low: 100, high: 100 });
  });

  it("excludes neutral fails from denominator", () => {
    // 1 pass + 1 neutral false → denominator = 1, score = 100
    expect(computeProbeScore([item(true), item(false, "done", true)])).toEqual({ low: 100, high: 100 });
  });

  it("handles all-neutral items (returns 0/0)", () => {
    expect(computeProbeScore([item(true, "done", true), item(false, "done", true)])).toEqual({ low: 0, high: 0 });
  });

  it("counts error status as a scored item", () => {
    // 1 pass + 1 error(false) → 2 done, low = 50, high = 50
    expect(computeProbeScore([item(true), item(false, "error")])).toEqual({ low: 50, high: 50 });
  });

  it("counts skipped as scored item", () => {
    // 1 pass + 1 skipped(null) → low=50, high=100
    expect(computeProbeScore([item(true), item(null, "skipped")])).toEqual({ low: 50, high: 100 });
  });

  it("mixed realistic scenario: 6 pass, 2 warning, 2 fail, 2 null", () => {
    // points = 6 + 1 = 7; nullCount = 2; done = 12
    // low = round(7/12*100) = 58, high = round(9/12*100) = 75
    const items: ProbeRunItemLike[] = [
      ...Array(6).fill(null).map(() => item(true)),
      ...Array(2).fill(null).map(() => item("warning")),
      ...Array(2).fill(null).map(() => item(false)),
      ...Array(2).fill(null).map(() => item(null)),
    ];
    expect(computeProbeScore(items)).toEqual({ low: 58, high: 75 });
  });

  it("returns 0/0 for empty input", () => {
    expect(computeProbeScore([])).toEqual({ low: 0, high: 0 });
  });
});
