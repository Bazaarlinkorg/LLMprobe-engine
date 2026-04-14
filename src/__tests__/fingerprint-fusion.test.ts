import { describe, it, expect } from "vitest";
import { fuseScores } from "../fingerprint-fusion.js";
import type { FamilyScore } from "../identity-report.js";

const FAMILIES = ["anthropic", "openai", "google", "qwen", "meta", "mistral", "deepseek"];

function makeScores(family: string, score: number): FamilyScore[] {
  return FAMILIES.map(f => ({ family: f, score: f === family ? score : 0 }));
}

describe("fuseScores", () => {
  it("returns rule-only result when judge and vector are empty", () => {
    const rule = makeScores("anthropic", 1.0);
    const result = fuseScores(rule, [], []);
    const top = result[0];
    expect(top.family).toBe("anthropic");
    expect(top.score).toBeCloseTo(1.0);
  });

  it("judge vote boosts correct family", () => {
    const rule  = makeScores("anthropic", 0.6);
    const judge = makeScores("openai", 1.0);  // judge disagrees
    const result = fuseScores(rule, judge, []);
    // openai should win when judge strongly says so
    const openai    = result.find(s => s.family === "openai")!;
    const anthropic = result.find(s => s.family === "anthropic")!;
    expect(openai.score).toBeGreaterThan(anthropic.score);
  });

  it("returns top 3 sorted descending", () => {
    const rule = makeScores("anthropic", 1.0);
    const result = fuseScores(rule, [], []);
    expect(result.length).toBeLessThanOrEqual(3);
    expect(result[0].score).toBeGreaterThanOrEqual(result[1]?.score ?? 0);
  });

  it("excludes families with fused score 0", () => {
    const rule  = makeScores("anthropic", 0.8);
    const judge = makeScores("anthropic", 0.9);
    const result = fuseScores(rule, judge, []);
    const allPositive = result.every(s => s.score > 0);
    expect(allPositive).toBe(true);
  });
});
