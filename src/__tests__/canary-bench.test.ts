import { describe, it, expect } from "vitest";
import { CANARY_BENCH, scoreCanaryAnswer } from "../canary-bench.js";

describe("CANARY_BENCH", () => {
  it("has at least 8 deterministic items with unique ids", () => {
    expect(CANARY_BENCH.length).toBeGreaterThanOrEqual(8);
    const ids = new Set(CANARY_BENCH.map(c => c.id));
    expect(ids.size).toBe(CANARY_BENCH.length);
  });
  it("every item has prompt and either expectedExact or expectedRegex", () => {
    for (const c of CANARY_BENCH) {
      expect(c.prompt.length).toBeGreaterThan(0);
      expect(!!c.expectedExact || !!c.expectedRegex).toBe(true);
    }
  });
});

describe("scoreCanaryAnswer", () => {
  it("exact match passes (case/whitespace tolerant, trailing period stripped)", () => {
    const c = { id: "t", prompt: "", expectedExact: "Paris", category: "recall" as const };
    expect(scoreCanaryAnswer(c, "Paris").passed).toBe(true);
    expect(scoreCanaryAnswer(c, " paris\n").passed).toBe(true);
    expect(scoreCanaryAnswer(c, "Paris.").passed).toBe(true);
    expect(scoreCanaryAnswer(c, "The capital is Paris").passed).toBe(false);
  });
  it("regex match passes when pattern matches trimmed actual", () => {
    const c = { id: "t", prompt: "", expectedRegex: "^30883$", category: "math" as const };
    expect(scoreCanaryAnswer(c, "30883").passed).toBe(true);
    expect(scoreCanaryAnswer(c, "30884").passed).toBe(false);
  });
  it("handles empty/null actual", () => {
    const c = { id: "t", prompt: "", expectedExact: "x", category: "math" as const };
    expect(scoreCanaryAnswer(c, "").passed).toBe(false);
    expect(scoreCanaryAnswer(c, null).passed).toBe(false);
  });
});
