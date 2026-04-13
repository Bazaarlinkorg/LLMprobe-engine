import { describe, it, expect } from "vitest";
import { checkSSECompliance } from "../sse-compliance.js";

describe("checkSSECompliance — valid stream", () => {
  it("passes a well-formed stream ending with [DONE]", () => {
    const lines = [
      JSON.stringify({ choices: [{ delta: { content: "Hello" }, index: 0 }] }),
      JSON.stringify({ choices: [{ delta: { content: " world" }, index: 0 }] }),
      "[DONE]",
    ];
    const r = checkSSECompliance(lines);
    expect(r.passed).toBe(true);
    expect(r.issues).toHaveLength(0);
    expect(r.dataLines).toBe(2);
  });

  it("counts data lines correctly", () => {
    const lines = [
      JSON.stringify({ choices: [{ delta: { content: "a" } }] }),
      JSON.stringify({ choices: [{ delta: { content: "b" } }] }),
      JSON.stringify({ choices: [{ delta: { content: "c" } }] }),
      "[DONE]",
    ];
    expect(checkSSECompliance(lines).dataLines).toBe(3);
  });

  it("[DONE] is not counted as a data line", () => {
    const lines = [
      JSON.stringify({ choices: [{ delta: { content: "hi" } }] }),
      "[DONE]",
    ];
    expect(checkSSECompliance(lines).dataLines).toBe(1);
  });
});

describe("checkSSECompliance — missing [DONE]", () => {
  it("fails when [DONE] is absent", () => {
    const lines = [
      JSON.stringify({ choices: [{ delta: { content: "hello" } }] }),
    ];
    const r = checkSSECompliance(lines);
    expect(r.passed).toBe(false);
    expect(r.issues.some(i => i.includes("[DONE]"))).toBe(true);
  });
});

describe("checkSSECompliance — empty stream", () => {
  it("fails on empty input", () => {
    const r = checkSSECompliance([]);
    expect(r.passed).toBe(false);
    expect(r.issues.some(i => i.toLowerCase().includes("empty"))).toBe(true);
    expect(r.dataLines).toBe(0);
  });
});

describe("checkSSECompliance — invalid JSON chunks", () => {
  it("fails on non-JSON data line", () => {
    const r = checkSSECompliance(["this is not json", "[DONE]"]);
    expect(r.passed).toBe(false);
    expect(r.issues.some(i => i.toLowerCase().includes("json"))).toBe(true);
  });

  it("reports the bad line content in the issue", () => {
    const r = checkSSECompliance(["BAD_JSON_CHUNK", "[DONE]"]);
    expect(r.issues[0]).toMatch(/BAD_JSON_CHUNK/);
  });
});

describe("checkSSECompliance — missing choices (warning)", () => {
  it("does not fail but sets warning for usage-only chunks (no choices array)", () => {
    const lines = [
      JSON.stringify({ choices: [{ delta: { content: "hi" } }] }),
      JSON.stringify({ usage: { prompt_tokens: 10, completion_tokens: 5 } }), // usage chunk
      "[DONE]",
    ];
    const r = checkSSECompliance(lines);
    expect(r.passed).toBe(true);
    expect(r.warning).toBe(true);
    expect(r.missingChoicesCount).toBe(1);
  });

  it("tracks missingChoicesCount correctly", () => {
    const lines = [
      JSON.stringify({ choices: [] }),  // empty choices array
      JSON.stringify({ choices: [] }),
      "[DONE]",
    ];
    const r = checkSSECompliance(lines);
    expect(r.missingChoicesCount).toBe(2);
    expect(r.warning).toBe(true);
  });
});

describe("checkSSECompliance — warning suppressed when failing", () => {
  it("does not set warning=true when stream also has hard failures", () => {
    // Missing [DONE] is a hard fail, warning should be suppressed
    const lines = [
      JSON.stringify({ usage: { prompt_tokens: 10 } }), // no choices → would warn
      // no [DONE] → hard fail
    ];
    const r = checkSSECompliance(lines);
    expect(r.passed).toBe(false);
    expect(r.warning).toBe(false);
  });
});

describe("checkSSECompliance — result shape", () => {
  it("always returns all required fields", () => {
    const r = checkSSECompliance(["[DONE]"]);
    expect(typeof r.passed).toBe("boolean");
    expect(typeof r.warning).toBe("boolean");
    expect(typeof r.dataLines).toBe("number");
    expect(typeof r.missingChoicesCount).toBe("number");
    expect(Array.isArray(r.issues)).toBe(true);
  });
});
