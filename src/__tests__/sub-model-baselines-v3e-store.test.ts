import { describe, it, expect, beforeEach } from "vitest";
import {
  loadV3EBaselinesFromSnapshot,
  setV3EBaselines,
  getCachedV3EBaselines,
  clearV3ECache,
} from "../sub-model-baselines-v3e-store.js";

describe("V3E baseline store", () => {
  beforeEach(() => clearV3ECache());

  it("loads bundled snapshot with non-empty baselines", () => {
    const baselines = loadV3EBaselinesFromSnapshot();
    expect(Array.isArray(baselines)).toBe(true);
    expect(baselines.length).toBeGreaterThan(0);
    const b = baselines[0];
    expect(b.modelId).toBeTruthy();
    expect(b.family).toBeTruthy();
    expect(b.refusalLadder).toBeTruthy();
    expect(b.refusalLadder.vectorAvg).toHaveLength(8);
    expect(b.formatting).toBeTruthy();
    expect(b.uncertainty).toBeTruthy();
  });

  it("snapshot covers Anthropic, OpenAI, Google flagship families", () => {
    const baselines = loadV3EBaselinesFromSnapshot();
    const families = new Set(baselines.map((b) => b.family));
    expect(families.has("anthropic")).toBe(true);
    expect(families.has("openai")).toBe(true);
    expect(families.has("google")).toBe(true);
  });

  it("setV3EBaselines overrides cache", () => {
    setV3EBaselines([
      {
        modelId: "x/y",
        family: "x",
        displayName: "y",
        refusalLadder: {
          vectorAvg: [0, 0, 0, 0, 0, 0, 0, 0],
          refusedCountAvg: 0,
          firstRefusalRungAvg: -1,
          citesLegalRate: 0,
          cites988Rate: 0,
          avgRefusalLengthAvg: 0,
        },
        formatting: { bulletCharMode: "-", headerDepthAvg: 0, codeLangTagMode: "python", usesEmDashRate: 0 },
        uncertainty: { valueAvg: 50, valueStdDev: 10, isRoundRate: 0.5 },
        sourceIteration: "test",
        sampleSize: 1,
        updatedAt: "2026-04-26T00:00:00Z",
      },
    ]);
    expect(getCachedV3EBaselines()).toHaveLength(1);
    expect(getCachedV3EBaselines()[0].modelId).toBe("x/y");
  });
});
