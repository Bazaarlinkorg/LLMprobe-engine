import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { runCanary } from "../canary-runner.js";
import { CANARY_BENCH } from "../canary-bench.js";

// Correct answers map (trivial lookup table for building mock responses)
const CORRECT: Record<string, string> = {
  "math-mul":        "30883",
  "math-pow":        "65536",
  "math-mod":        "6",
  "logic-syllogism": "yes",
  "recall-capital":  "Canberra",
  "recall-symbol":   "Au",
  "format-echo":     "BANANA",
  "format-json":     '{"ok":true}',
  "code-reverse":    "s[::-1]",
  "recall-year":     "1969",
};

function mockUpstream(answerById: Record<string, string>, servedModel: string | null = "openai/gpt-4o") {
  vi.stubGlobal("fetch", vi.fn(async (_url: unknown, init: RequestInit) => {
    const body = JSON.parse(init.body as string) as { messages: Array<{ content: string }> };
    const prompt = body.messages[0].content;
    const item = CANARY_BENCH.find(c => c.prompt === prompt);
    const answer = item ? (answerById[item.id] ?? "WRONG_ANSWER") : "WRONG_ANSWER";
    return new Response(JSON.stringify({
      model: servedModel,
      choices: [{ message: { content: answer } }],
    }), { status: 200, headers: { "content-type": "application/json" } });
  }));
}

beforeEach(() => { vi.clearAllMocks(); });
afterEach(() => { vi.unstubAllGlobals(); });

describe("runCanary", () => {
  it("returns verdict=healthy and score=1 when all answers correct", async () => {
    mockUpstream(CORRECT);
    const r = await runCanary({
      baseUrl: "https://upstream/v1",
      apiKey: "sk-test",
      modelId: "openai/gpt-4o",
    });
    expect(r.verdict).toBe("healthy");
    expect(r.score).toBe(1);
    expect(r.totalChecks).toBe(CANARY_BENCH.length);
    expect(r.passedChecks).toBe(CANARY_BENCH.length);
    expect(r.servedModel).toBe("openai/gpt-4o");
    expect(r.details).toHaveLength(CANARY_BENCH.length);
    expect(r.error).toBeNull();
  });

  it("returns verdict=degraded when 0.5 <= score < 0.8", async () => {
    // 6/10 correct → 0.6
    const partial: Record<string, string> = {
      "math-mul": CORRECT["math-mul"],
      "math-pow": CORRECT["math-pow"],
      "math-mod": CORRECT["math-mod"],
      "logic-syllogism": CORRECT["logic-syllogism"],
      "recall-capital": CORRECT["recall-capital"],
      "recall-symbol": CORRECT["recall-symbol"],
    };
    mockUpstream(partial);
    const r = await runCanary({ baseUrl: "https://x/v1", apiKey: "k", modelId: "openai/gpt-4o" });
    expect(r.verdict).toBe("degraded");
    expect(r.score).toBeGreaterThanOrEqual(0.5);
    expect(r.score).toBeLessThan(0.8);
  });

  it("returns verdict=failed when score < 0.5", async () => {
    mockUpstream({}); // all wrong
    const r = await runCanary({ baseUrl: "https://x/v1", apiKey: "k", modelId: "openai/gpt-4o" });
    expect(r.verdict).toBe("failed");
    expect(r.passedChecks).toBe(0);
    expect(r.score).toBe(0);
  });

  it("returns verdict=error and captures message when fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("boom network"); }));
    const r = await runCanary({ baseUrl: "https://x/v1", apiKey: "k", modelId: "openai/gpt-4o" });
    expect(r.verdict).toBe("error");
    expect(r.error).toContain("boom");
    expect(r.score).toBe(0);
  });

  it("captures servedModel from first upstream response", async () => {
    mockUpstream(CORRECT, "openai/gpt-3.5-turbo");
    const r = await runCanary({ baseUrl: "https://x/v1", apiKey: "k", modelId: "openai/gpt-4o" });
    expect(r.servedModel).toBe("openai/gpt-3.5-turbo");
  });

  it("sends Authorization Bearer header with apiKey", async () => {
    const spy = vi.fn(async (_url: unknown, _init: RequestInit) =>
      new Response(JSON.stringify({ model: "m", choices: [{ message: { content: "x" } }] }),
        { status: 200, headers: { "content-type": "application/json" } }),
    );
    vi.stubGlobal("fetch", spy);
    await runCanary({ baseUrl: "https://x/v1", apiKey: "sk-secret-abc", modelId: "m" });
    const firstCall = spy.mock.calls[0] as [unknown, RequestInit & { headers: Record<string, string> }];
    expect(firstCall[1].headers["Authorization"]).toBe("Bearer sk-secret-abc");
  });

  it("strips trailing slashes from baseUrl and appends /chat/completions", async () => {
    const spy = vi.fn(async (_url: unknown, _init: RequestInit) =>
      new Response(JSON.stringify({ model: "m", choices: [{ message: { content: "x" } }] }),
        { status: 200, headers: { "content-type": "application/json" } }),
    );
    vi.stubGlobal("fetch", spy);
    await runCanary({ baseUrl: "https://upstream/v1///", apiKey: "k", modelId: "m" });
    expect(spy.mock.calls[0][0]).toBe("https://upstream/v1/chat/completions");
  });
});
