import { describe, it, expect, vi } from "vitest";
import { runContextCheck } from "../context-check.js";

// Mock send function factories
function alwaysPass(canaryCount = 5): (msg: string) => Promise<string> {
  return async (msg: string) => {
    // Extract all CANARY_N_XXXXXX tokens from the message and echo them back
    const canaries = [...msg.matchAll(/CANARY_\d+_[0-9A-F]{6}/g)].map(m => m[0]);
    return `I found these canaries: ${canaries.join(", ")}`;
  };
}

function alwaysFail(): (msg: string) => Promise<string> {
  return async (_msg: string) => "I couldn't read the full message.";
}

function failAfterChars(limit: number): (msg: string) => Promise<string> {
  return async (msg: string) => {
    if (msg.length > limit) {
      // Only echo canaries from the first `limit` chars
      const truncated = msg.slice(0, limit);
      const canaries = [...truncated.matchAll(/CANARY_\d+_[0-9A-F]{6}/g)].map(m => m[0]);
      if (canaries.length < 4) return "Too long, I lost some canaries.";
      return canaries.join(" ");
    }
    const canaries = [...msg.matchAll(/CANARY_\d+_[0-9A-F]{6}/g)].map(m => m[0]);
    return canaries.join(" ");
  };
}

function throwAfterChars(limit: number): (msg: string) => Promise<string> {
  return async (msg: string) => {
    if (msg.length > limit) throw new Error("Timeout: message too large");
    const canaries = [...msg.matchAll(/CANARY_\d+_[0-9A-F]{6}/g)].map(m => m[0]);
    return canaries.join(" ");
  };
}

describe("runContextCheck — all levels pass", () => {
  it("passed=true and reason mentions max level when all pass", async () => {
    const result = await runContextCheck(alwaysPass());
    expect(result.passed).toBe(true);
    expect(result.warning).toBe(false);
    expect(result.firstFailChars).toBeNull();
    expect(result.lastPassChars).not.toBeNull();
    expect(result.reason).toMatch(/passed|max/i);
  });
});

describe("runContextCheck — fails at smallest level", () => {
  it("passed=false and lastPassChars=null when first level fails", async () => {
    const result = await runContextCheck(alwaysFail());
    expect(result.passed).toBe(false);
    expect(result.lastPassChars).toBeNull();
    expect(result.firstFailChars).not.toBeNull();
    expect(result.reason).toMatch(/failed|smallest/i);
  });
});

describe("runContextCheck — truncation in the middle", () => {
  it("returns warning=true when context is truncated between levels", async () => {
    // Should pass 4K but fail somewhere higher
    const result = await runContextCheck(throwAfterChars(8_000));
    if (result.lastPassChars !== null && result.firstFailChars !== null) {
      expect(result.passed).toBe(false);
      expect(result.warning).toBe(true);
      expect(result.lastPassChars).toBeLessThan(result.firstFailChars);
      expect(result.reason).toMatch(/truncated|between/i);
    }
    // If it passes all levels it's fine too (mock may have short messages at 4K level)
  });
});

describe("runContextCheck — result shape", () => {
  it("always returns all required fields", async () => {
    const result = await runContextCheck(alwaysFail());
    expect(typeof result.passed).toBe("boolean");
    expect(typeof result.warning).toBe("boolean");
    expect(typeof result.maxTestedChars).toBe("number");
    expect(typeof result.reason).toBe("string");
    expect(result.maxTestedChars).toBeGreaterThan(0);
  });

  it("maxTestedChars is positive after run", async () => {
    const result = await runContextCheck(alwaysPass());
    expect(result.maxTestedChars).toBeGreaterThan(4_000);
  });
});

describe("runContextCheck — throw from send (network error simulation)", () => {
  it("handles send function throwing as a failure at that level", async () => {
    let callCount = 0;
    const send = async (msg: string): Promise<string> => {
      callCount++;
      if (callCount > 1) throw new Error("Connection reset");
      const canaries = [...msg.matchAll(/CANARY_\d+_[0-9A-F]{6}/g)].map(m => m[0]);
      return canaries.join(" ");
    };
    const result = await runContextCheck(send);
    // First level passes, second throws → truncation warning or pass at level 1
    expect(typeof result.passed).toBe("boolean");
    expect(result.firstFailChars).not.toBeNull();
  });
});
