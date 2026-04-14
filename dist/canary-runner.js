"use strict";
// src/canary-runner.ts — Execute the canary benchmark against an endpoint.
// Part of @bazaarlink/probe-engine (MIT)
//
// No LLM judge — all answers compared by exact string / regex match.
// Verdict: healthy (≥80%), degraded (≥50%), failed (<50%), error.
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCanary = runCanary;
const canary_bench_js_1 = require("./canary-bench.js");
async function runCanary(input) {
    const timeoutMs = input.timeoutMs ?? 60000;
    const url = input.baseUrl.replace(/\/+$/, "") + "/chat/completions";
    const details = [];
    let servedModel = null;
    let totalLatency = 0;
    try {
        for (const item of canary_bench_js_1.CANARY_BENCH) {
            const t0 = Date.now();
            let actual = null;
            try {
                const res = await fetch(url, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${input.apiKey}`,
                    },
                    body: JSON.stringify({
                        model: input.modelId,
                        messages: [{ role: "user", content: item.prompt }],
                        temperature: 0,
                        max_tokens: 64,
                        stream: false,
                    }),
                    signal: AbortSignal.timeout(timeoutMs),
                });
                if (res.ok) {
                    const data = await res.json();
                    if (!servedModel && typeof data.model === "string")
                        servedModel = data.model;
                    actual = data.choices?.[0]?.message?.content ?? null;
                }
            }
            catch { /* timeout or network error — actual stays null */ }
            const latencyMs = Date.now() - t0;
            totalLatency += latencyMs;
            details.push({ ...(0, canary_bench_js_1.scoreCanaryAnswer)(item, actual), latencyMs });
        }
        const totalChecks = details.length;
        const passedChecks = details.filter(d => d.passed).length;
        const score = totalChecks > 0 ? passedChecks / totalChecks : 0;
        const avgLatencyMs = totalChecks > 0 ? Math.round(totalLatency / totalChecks) : 0;
        let verdict;
        if (score >= 0.8)
            verdict = "healthy";
        else if (score >= 0.5)
            verdict = "degraded";
        else
            verdict = "failed";
        return { verdict, score, totalChecks, passedChecks, avgLatencyMs, servedModel, details, error: null };
    }
    catch (e) {
        const msg = (e.message ?? "unknown").slice(0, 300);
        return {
            verdict: "error", score: 0,
            totalChecks: details.length,
            passedChecks: details.filter(d => d.passed).length,
            avgLatencyMs: details.length ? Math.round(totalLatency / details.length) : 0,
            servedModel, details, error: msg,
        };
    }
}
//# sourceMappingURL=canary-runner.js.map