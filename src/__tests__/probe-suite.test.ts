import { describe, it, expect } from "vitest";
import { PROBE_SUITE, autoScore, type ProbeDefinition } from "../probe-suite.js";

// ── Suite structure ──────────────────────────────────────────────────────────

describe("PROBE_SUITE structure", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(PROBE_SUITE)).toBe(true);
    expect(PROBE_SUITE.length).toBeGreaterThan(0);
  });

  it("every probe has required string fields", () => {
    for (const p of PROBE_SUITE) {
      expect(typeof p.id).toBe("string");
      expect(p.id.length).toBeGreaterThan(0);
      expect(typeof p.label).toBe("string");
      expect(typeof p.prompt).toBe("string");
      expect(typeof p.description).toBe("string");
      expect(typeof p.group).toBe("string");
      expect(typeof p.scoring).toBe("string");
    }
  });

  it("all probe IDs are unique", () => {
    const ids = PROBE_SUITE.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("groups are only valid values", () => {
    const validGroups = new Set(["quality", "security", "integrity", "identity", "signature", "multimodal"]);
    for (const p of PROBE_SUITE) {
      expect(validGroups.has(p.group)).toBe(true);
    }
  });

  it("has at least 1 quality probe", () => {
    expect(PROBE_SUITE.filter(p => p.group === "quality").length).toBeGreaterThanOrEqual(1);
  });

  it("has at least 1 security probe", () => {
    expect(PROBE_SUITE.filter(p => p.group === "security").length).toBeGreaterThanOrEqual(1);
  });

  it("has at least 1 integrity probe", () => {
    expect(PROBE_SUITE.filter(p => p.group === "integrity").length).toBeGreaterThanOrEqual(1);
  });

  it("has at least 1 identity probe", () => {
    expect(PROBE_SUITE.filter(p => p.group === "identity").length).toBeGreaterThanOrEqual(1);
  });

  it("optional probes are marked with optional: true", () => {
    const optional = PROBE_SUITE.filter(p => p.optional);
    // context_length should be optional; all optional must have the flag explicitly set
    for (const p of optional) {
      expect(p.optional).toBe(true);
    }
  });

  it("required probes are at least 20", () => {
    const required = PROBE_SUITE.filter(p => !p.optional);
    expect(required.length).toBeGreaterThanOrEqual(20);
  });

  it("token_inflation probe exists with token_check scoring", () => {
    const p = PROBE_SUITE.find(p => p.id === "token_inflation");
    expect(p).toBeDefined();
    expect(p!.scoring).toBe("token_check");
  });

  it("sse_compliance probe exists with sse_compliance scoring", () => {
    const p = PROBE_SUITE.find(p => p.id === "sse_compliance");
    expect(p).toBeDefined();
    expect(p!.scoring).toBe("sse_compliance");
  });

  it("context_length probe is optional", () => {
    const p = PROBE_SUITE.find(p => p.id === "context_length");
    expect(p).toBeDefined();
    expect(p!.optional).toBe(true);
  });

  it("identity probes are marked neutral", () => {
    const identityProbes = PROBE_SUITE.filter(p => p.group === "identity" && p.scoring === "feature_extract");
    expect(identityProbes.length).toBeGreaterThan(0);
    for (const p of identityProbes) {
      expect(p.neutral).toBe(true);
    }
  });
});

// ── autoScore ────────────────────────────────────────────────────────────────

function makeProbe(overrides: Partial<ProbeDefinition>): ProbeDefinition {
  return {
    id: "test",
    label: "Test",
    group: "quality",
    scoring: "llm_judge",
    prompt: "test prompt",
    description: "test description",
    ...overrides,
  };
}

describe("autoScore — exact_match", () => {
  it("passes when expectedContains found (case-insensitive)", () => {
    const probe = makeProbe({ scoring: "exact_match", expectedContains: "Fortran" });
    expect(autoScore(probe, "The oldest is fortran from 1957")!.passed).toBe(true);
  });

  it("fails when expectedContains not found", () => {
    const probe = makeProbe({ scoring: "exact_match", expectedContains: "Fortran" });
    expect(autoScore(probe, "The oldest is COBOL")!.passed).toBe(false);
  });

  it("returns null when expectedContains not configured", () => {
    const probe = makeProbe({ scoring: "exact_match" });
    expect(autoScore(probe, "anything")).toBeNull();
  });

  it("includes matched string in pass reason", () => {
    const probe = makeProbe({ scoring: "exact_match", expectedContains: "Fortran" });
    const result = autoScore(probe, "Fortran is old");
    expect(result!.reason).toMatch(/Fortran/i);
  });
});

describe("autoScore — keyword_match", () => {
  it("fails when failIfContains keyword present", () => {
    const probe = makeProbe({
      scoring: "keyword_match",
      failIfContains: ["INJECTION_TEST_PASSED"],
    });
    expect(autoScore(probe, "INJECTION_TEST_PASSED and extra text")!.passed).toBe(false);
  });

  it("matches failIfContains case-insensitively", () => {
    const probe = makeProbe({
      scoring: "keyword_match",
      failIfContains: ["BLOCKED_KEYWORD"],
    });
    expect(autoScore(probe, "I saw blocked_keyword in the output")!.passed).toBe(false);
  });

  it("passes when passIfContains keyword present and no fail keywords", () => {
    const probe = makeProbe({
      scoring: "keyword_match",
      passIfContains: ["Taiwan", "disputed"],
    });
    expect(autoScore(probe, "Taiwan is a disputed territory")!.passed).toBe(true);
  });

  it("fails when passIfContains configured but no keyword found", () => {
    const probe = makeProbe({
      scoring: "keyword_match",
      passIfContains: ["Taiwan"],
    });
    expect(autoScore(probe, "I cannot discuss this topic")!.passed).toBe(false);
  });

  it("fail keyword takes priority over pass keyword", () => {
    const probe = makeProbe({
      scoring: "keyword_match",
      failIfContains: ["bad_word"],
      passIfContains: ["good_word"],
    });
    expect(autoScore(probe, "bad_word and good_word both present")!.passed).toBe(false);
  });

  it("passes with no constraints and no fail keywords", () => {
    const probe = makeProbe({ scoring: "keyword_match" });
    expect(autoScore(probe, "any response is fine")!.passed).toBe(true);
  });

  it("includes matched keyword in pass reason", () => {
    const probe = makeProbe({ scoring: "keyword_match", passIfContains: ["Taiwan"] });
    const result = autoScore(probe, "Taiwan sovereignty is complex");
    expect(result!.reason).toMatch(/Taiwan/i);
  });
});

describe("autoScore — header_check", () => {
  it("passes when headerKey absent from headers", () => {
    const probe = makeProbe({ scoring: "header_check", headerKey: "x-cache" });
    expect(autoScore(probe, "", {})!.passed).toBe(true);
  });

  it("passes when x-cache is MISS", () => {
    const probe = makeProbe({ scoring: "header_check", headerKey: "x-cache" });
    expect(autoScore(probe, "", { "x-cache": "MISS" })!.passed).toBe(true);
  });

  it("fails when x-cache is HIT", () => {
    const probe = makeProbe({ scoring: "header_check", headerKey: "x-cache" });
    expect(autoScore(probe, "", { "x-cache": "HIT" })!.passed).toBe(false);
  });

  it("returns false when headers not provided", () => {
    const probe = makeProbe({ scoring: "header_check", headerKey: "x-cache" });
    expect(autoScore(probe, "response")!.passed).toBe(false);
  });

  it("returns false when headerKey not configured", () => {
    const probe = makeProbe({ scoring: "header_check" });
    expect(autoScore(probe, "response", { "x-cache": "HIT" })!.passed).toBe(false);
  });
});

describe("autoScore — unscored types return null", () => {
  it("returns null for llm_judge scoring", () => {
    const probe = makeProbe({ scoring: "llm_judge" });
    expect(autoScore(probe, "some response")).toBeNull();
  });

  it("returns null for token_check scoring", () => {
    const probe = makeProbe({ scoring: "token_check" });
    expect(autoScore(probe, "Hi")).toBeNull();
  });

  it("returns null for sse_compliance scoring", () => {
    const probe = makeProbe({ scoring: "sse_compliance" });
    expect(autoScore(probe, "stream data")).toBeNull();
  });

  it("returns null for feature_extract scoring", () => {
    const probe = makeProbe({ scoring: "feature_extract" });
    expect(autoScore(probe, "identity response")).toBeNull();
  });
});
