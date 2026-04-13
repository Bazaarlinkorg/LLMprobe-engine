import { describe, it, expect } from "vitest";
import { detectTokenInflation, TOKEN_INFLATION_THRESHOLD } from "../token-inflation.js";

describe("TOKEN_INFLATION_THRESHOLD", () => {
  it("is a positive number", () => {
    expect(typeof TOKEN_INFLATION_THRESHOLD).toBe("number");
    expect(TOKEN_INFLATION_THRESHOLD).toBeGreaterThan(0);
  });
});

describe("detectTokenInflation", () => {
  it("does not detect inflation when promptTokens <= threshold", () => {
    const r = detectTokenInflation(TOKEN_INFLATION_THRESHOLD);
    expect(r.detected).toBe(false);
    expect(r.inflationAmount).toBe(0);
  });

  it("does not detect inflation for 1 token (bare minimum prompt)", () => {
    const r = detectTokenInflation(1);
    expect(r.detected).toBe(false);
    expect(r.inflationAmount).toBe(0);
  });

  it("does not detect inflation for promptTokens just at threshold", () => {
    const r = detectTokenInflation(TOKEN_INFLATION_THRESHOLD);
    expect(r.detected).toBe(false);
  });

  it("detects inflation when promptTokens > threshold", () => {
    const r = detectTokenInflation(TOKEN_INFLATION_THRESHOLD + 1);
    expect(r.detected).toBe(true);
    expect(r.inflationAmount).toBe(TOKEN_INFLATION_THRESHOLD + 1);
  });

  it("detects inflation for clearly inflated value (e.g. 500 tokens for 'Hi')", () => {
    const r = detectTokenInflation(500);
    expect(r.detected).toBe(true);
    expect(r.actualPromptTokens).toBe(500);
    expect(r.inflationAmount).toBe(500);
  });

  it("reports actualPromptTokens correctly regardless of detection", () => {
    expect(detectTokenInflation(5).actualPromptTokens).toBe(5);
    expect(detectTokenInflation(500).actualPromptTokens).toBe(500);
  });

  it("inflationAmount is 0 when not detected", () => {
    expect(detectTokenInflation(10).inflationAmount).toBe(0);
  });

  it("accepts a custom threshold override", () => {
    const r = detectTokenInflation(100, 200); // 100 tokens, threshold 200 → no inflation
    expect(r.detected).toBe(false);

    const r2 = detectTokenInflation(201, 200);
    expect(r2.detected).toBe(true);
  });

  it("custom threshold of 0 detects inflation for any non-zero value", () => {
    expect(detectTokenInflation(1, 0).detected).toBe(true);
  });
});
