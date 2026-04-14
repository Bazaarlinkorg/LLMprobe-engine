import { describe, it, expect } from "vitest";
import { parseJudgeIdentityResult } from "../fingerprint-judge.js";

describe("parseJudgeIdentityResult", () => {
  it("parses valid JSON with family and confidence", () => {
    const raw = JSON.stringify({ family: "anthropic", confidence: 0.9, reasons: ["claude_style refusal"] });
    const result = parseJudgeIdentityResult(raw);
    expect(result).toEqual({ family: "anthropic", confidence: 0.9, reasons: ["claude_style refusal"] });
  });

  it("clamps confidence to 0-1", () => {
    const raw = JSON.stringify({ family: "openai", confidence: 1.5, reasons: [] });
    const result = parseJudgeIdentityResult(raw);
    expect(result?.confidence).toBe(1.0);
  });

  it("returns null for missing family", () => {
    const raw = JSON.stringify({ confidence: 0.8 });
    expect(parseJudgeIdentityResult(raw)).toBeNull();
  });

  it("returns null for unknown family", () => {
    const raw = JSON.stringify({ family: "banana", confidence: 0.8, reasons: [] });
    expect(parseJudgeIdentityResult(raw)).toBeNull();
  });

  it("returns null for unparseable text", () => {
    expect(parseJudgeIdentityResult("not json")).toBeNull();
  });

  it("extracts JSON from markdown fence", () => {
    const raw = "```json\n" + JSON.stringify({ family: "google", confidence: 0.7, reasons: ["gemini"] }) + "\n```";
    const result = parseJudgeIdentityResult(raw);
    expect(result?.family).toBe("google");
  });
});
