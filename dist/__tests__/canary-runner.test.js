"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const canary_runner_js_1 = require("../canary-runner.js");
const canary_bench_js_1 = require("../canary-bench.js");
// Correct answers map (trivial lookup table for building mock responses)
const CORRECT = {
    "math-mul": "30883",
    "math-pow": "65536",
    "math-mod": "6",
    "logic-syllogism": "yes",
    "recall-capital": "Canberra",
    "recall-symbol": "Au",
    "format-echo": "BANANA",
    "format-json": '{"ok":true}',
    "code-reverse": "s[::-1]",
    "recall-year": "1969",
};
function mockUpstream(answerById, servedModel = "openai/gpt-4o") {
    vitest_1.vi.stubGlobal("fetch", vitest_1.vi.fn(async (_url, init) => {
        const body = JSON.parse(init.body);
        const prompt = body.messages[0].content;
        const item = canary_bench_js_1.CANARY_BENCH.find(c => c.prompt === prompt);
        const answer = item ? (answerById[item.id] ?? "WRONG_ANSWER") : "WRONG_ANSWER";
        return new Response(JSON.stringify({
            model: servedModel,
            choices: [{ message: { content: answer } }],
        }), { status: 200, headers: { "content-type": "application/json" } });
    }));
}
(0, vitest_1.beforeEach)(() => { vitest_1.vi.clearAllMocks(); });
(0, vitest_1.afterEach)(() => { vitest_1.vi.unstubAllGlobals(); });
(0, vitest_1.describe)("runCanary", () => {
    (0, vitest_1.it)("returns verdict=healthy and score=1 when all answers correct", async () => {
        mockUpstream(CORRECT);
        const r = await (0, canary_runner_js_1.runCanary)({
            baseUrl: "https://upstream/v1",
            apiKey: "sk-test",
            modelId: "openai/gpt-4o",
        });
        (0, vitest_1.expect)(r.verdict).toBe("healthy");
        (0, vitest_1.expect)(r.score).toBe(1);
        (0, vitest_1.expect)(r.totalChecks).toBe(canary_bench_js_1.CANARY_BENCH.length);
        (0, vitest_1.expect)(r.passedChecks).toBe(canary_bench_js_1.CANARY_BENCH.length);
        (0, vitest_1.expect)(r.servedModel).toBe("openai/gpt-4o");
        (0, vitest_1.expect)(r.details).toHaveLength(canary_bench_js_1.CANARY_BENCH.length);
        (0, vitest_1.expect)(r.error).toBeNull();
    });
    (0, vitest_1.it)("returns verdict=degraded when 0.5 <= score < 0.8", async () => {
        // 6/10 correct → 0.6
        const partial = {
            "math-mul": CORRECT["math-mul"],
            "math-pow": CORRECT["math-pow"],
            "math-mod": CORRECT["math-mod"],
            "logic-syllogism": CORRECT["logic-syllogism"],
            "recall-capital": CORRECT["recall-capital"],
            "recall-symbol": CORRECT["recall-symbol"],
        };
        mockUpstream(partial);
        const r = await (0, canary_runner_js_1.runCanary)({ baseUrl: "https://x/v1", apiKey: "k", modelId: "openai/gpt-4o" });
        (0, vitest_1.expect)(r.verdict).toBe("degraded");
        (0, vitest_1.expect)(r.score).toBeGreaterThanOrEqual(0.5);
        (0, vitest_1.expect)(r.score).toBeLessThan(0.8);
    });
    (0, vitest_1.it)("returns verdict=failed when score < 0.5", async () => {
        mockUpstream({}); // all wrong
        const r = await (0, canary_runner_js_1.runCanary)({ baseUrl: "https://x/v1", apiKey: "k", modelId: "openai/gpt-4o" });
        (0, vitest_1.expect)(r.verdict).toBe("failed");
        (0, vitest_1.expect)(r.passedChecks).toBe(0);
        (0, vitest_1.expect)(r.score).toBe(0);
    });
    (0, vitest_1.it)("returns verdict=error and captures message when fetch throws", async () => {
        vitest_1.vi.stubGlobal("fetch", vitest_1.vi.fn(async () => { throw new Error("boom network"); }));
        const r = await (0, canary_runner_js_1.runCanary)({ baseUrl: "https://x/v1", apiKey: "k", modelId: "openai/gpt-4o" });
        (0, vitest_1.expect)(r.verdict).toBe("error");
        (0, vitest_1.expect)(r.error).toContain("boom");
        (0, vitest_1.expect)(r.score).toBe(0);
    });
    (0, vitest_1.it)("captures servedModel from first upstream response", async () => {
        mockUpstream(CORRECT, "openai/gpt-3.5-turbo");
        const r = await (0, canary_runner_js_1.runCanary)({ baseUrl: "https://x/v1", apiKey: "k", modelId: "openai/gpt-4o" });
        (0, vitest_1.expect)(r.servedModel).toBe("openai/gpt-3.5-turbo");
    });
    (0, vitest_1.it)("sends Authorization Bearer header with apiKey", async () => {
        const spy = vitest_1.vi.fn(async (_url, _init) => new Response(JSON.stringify({ model: "m", choices: [{ message: { content: "x" } }] }), { status: 200, headers: { "content-type": "application/json" } }));
        vitest_1.vi.stubGlobal("fetch", spy);
        await (0, canary_runner_js_1.runCanary)({ baseUrl: "https://x/v1", apiKey: "sk-secret-abc", modelId: "m" });
        const firstCall = spy.mock.calls[0];
        (0, vitest_1.expect)(firstCall[1].headers["Authorization"]).toBe("Bearer sk-secret-abc");
    });
    (0, vitest_1.it)("strips trailing slashes from baseUrl and appends /chat/completions", async () => {
        const spy = vitest_1.vi.fn(async (_url, _init) => new Response(JSON.stringify({ model: "m", choices: [{ message: { content: "x" } }] }), { status: 200, headers: { "content-type": "application/json" } }));
        vitest_1.vi.stubGlobal("fetch", spy);
        await (0, canary_runner_js_1.runCanary)({ baseUrl: "https://upstream/v1///", apiKey: "k", modelId: "m" });
        (0, vitest_1.expect)(spy.mock.calls[0][0]).toBe("https://upstream/v1/chat/completions");
    });
});
//# sourceMappingURL=canary-runner.test.js.map