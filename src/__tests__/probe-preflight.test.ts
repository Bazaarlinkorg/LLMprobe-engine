import { describe, it, expect } from "vitest";
import { classifyPreflightResult } from "../probe-preflight.js";

function body(obj: object): string {
  return JSON.stringify(obj);
}

describe("classifyPreflightResult — ok range", () => {
  it("returns ok for HTTP 200", () => {
    expect(classifyPreflightResult(200, "").outcome).toBe("ok");
  });

  it("returns ok for HTTP 201", () => {
    expect(classifyPreflightResult(201, "").outcome).toBe("ok");
  });

  it("returns ok for HTTP 299", () => {
    expect(classifyPreflightResult(299, "").outcome).toBe("ok");
  });
});

describe("classifyPreflightResult — auth errors (abort)", () => {
  it("aborts on 401 invalid API key", () => {
    const r = classifyPreflightResult(401, body({ error: { message: "Invalid API key" } }));
    expect(r.outcome).toBe("abort");
    expect(r.reason).toMatch(/401/);
  });

  it("aborts on 403 forbidden", () => {
    const r = classifyPreflightResult(403, body({ error: { message: "Forbidden" } }));
    expect(r.outcome).toBe("abort");
    expect(r.reason).toMatch(/403/);
  });

  it("includes error message in abort reason", () => {
    const r = classifyPreflightResult(401, body({ error: { message: "Your API key is expired" } }));
    expect(r.reason).toMatch(/expired/i);
  });
});

describe("classifyPreflightResult — model not found (abort)", () => {
  it("aborts on 503 + model_not_found code", () => {
    const r = classifyPreflightResult(
      503,
      body({ error: { code: "model_not_found", message: "No available channel for model x" } }),
    );
    expect(r.outcome).toBe("abort");
  });

  it("aborts on 404 + model_not_found code", () => {
    const r = classifyPreflightResult(
      404,
      body({ error: { code: "model_not_found", message: "Model not found" } }),
    );
    expect(r.outcome).toBe("abort");
  });

  it("aborts when message contains 'no available channel' without error code", () => {
    const r = classifyPreflightResult(
      503,
      body({ error: { message: "No available channel for model gpt-99" } }),
    );
    expect(r.outcome).toBe("abort");
  });

  it("aborts when message contains 'model not found' case-insensitively", () => {
    const r = classifyPreflightResult(
      400,
      body({ error: { message: "Model Not Found" } }),
    );
    expect(r.outcome).toBe("abort");
  });
});

describe("classifyPreflightResult — retryable / warn", () => {
  it("warns on generic 503 without model_not_found", () => {
    const r = classifyPreflightResult(503, body({ error: { message: "Service Unavailable" } }));
    expect(r.outcome).toBe("warn");
    expect(r.reason).toMatch(/503/);
  });

  it("warns on 429 rate limit", () => {
    const r = classifyPreflightResult(429, body({ error: { message: "rate limit exceeded" } }));
    expect(r.outcome).toBe("warn");
  });

  it("warns on 500 internal server error", () => {
    expect(classifyPreflightResult(500, "").outcome).toBe("warn");
  });

  it("warns on 502 bad gateway", () => {
    expect(classifyPreflightResult(502, "").outcome).toBe("warn");
  });
});

describe("classifyPreflightResult — edge cases", () => {
  it("handles empty body without throwing", () => {
    const r = classifyPreflightResult(503, "");
    expect(["abort", "warn"]).toContain(r.outcome);
    expect(typeof r.reason).toBe("string");
    expect(r.reason.length).toBeGreaterThan(0);
  });

  it("handles non-JSON body without throwing", () => {
    const r = classifyPreflightResult(503, "Bad Gateway");
    expect(typeof r.reason).toBe("string");
  });

  it("includes HTTP status in reason for unknown errors", () => {
    expect(classifyPreflightResult(503, "").reason).toMatch(/503/);
    expect(classifyPreflightResult(429, "").reason).toMatch(/429/);
  });

  it("returns a reason string for every outcome", () => {
    for (const status of [200, 400, 401, 403, 404, 429, 500, 503]) {
      const r = classifyPreflightResult(status, "");
      expect(typeof r.reason).toBe("string");
    }
  });
});
