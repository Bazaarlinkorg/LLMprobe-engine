"use strict";
// src/runner.ts — Core probe runner for @bazaarlink/probe-engine (MIT)
// No framework dependencies — uses only Node.js 18+ built-in fetch.
Object.defineProperty(exports, "__esModule", { value: true });
exports.runProbes = runProbes;
const probe_suite_js_1 = require("./probe-suite.js");
const probe_score_js_1 = require("./probe-score.js");
const probe_preflight_js_1 = require("./probe-preflight.js");
const token_inflation_js_1 = require("./token-inflation.js");
const sse_compliance_js_1 = require("./sse-compliance.js");
const context_check_js_1 = require("./context-check.js");
const fingerprint_extractor_js_1 = require("./fingerprint-extractor.js");
const candidate_matcher_js_1 = require("./candidate-matcher.js");
function parseJudgeScore(text) {
    const candidates = [];
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch)
        candidates.push(fenceMatch[1].trim());
    const braceMatch = text.match(/\{[\s\S]*?"score"[\s\S]*?\}/);
    if (braceMatch)
        candidates.push(braceMatch[0]);
    candidates.push(text.trim());
    for (const raw of candidates) {
        try {
            const parsed = JSON.parse(raw);
            const score = typeof parsed.score === "number" ? parsed.score : Number(parsed.score);
            if (!isNaN(score) && score >= 1 && score <= 10) {
                return { score: Math.round(score), reason: String(parsed.reason ?? "") };
            }
        }
        catch { /* try next */ }
    }
    return null;
}
/**
 * Runs the similarity-based judge — mirrors `buildJudgePrompt` in the production route.
 * Judge scores 1-10: how similar is the candidate response to the baseline response?
 */
async function runJudgeWithBaseline(judgeUrl, apiKey, modelId, probe, candidateResponse, baselineResponse, threshold, timeoutMs) {
    const judgePrompt = `You are evaluating whether two AI responses are from the same underlying model.

Original probe question: "${probe.prompt.slice(0, 300)}"

Baseline response (from official API):
${baselineResponse.slice(0, 2000)}

Candidate response (under test):
${candidateResponse.slice(0, 2000)}

Score how similar these responses are on a scale of 1-10, where:
- 10: Identical or near-identical content, style, and capability level
- 7-9: Very similar, minor variations in phrasing
- 4-6: Somewhat similar, possible different capability level or style
- 1-3: Very different, likely a different model family or capability tier

Respond ONLY with valid JSON: {"score": <number 1-10>, "reason": "<one sentence>"}`;
    try {
        const res = await fetch(`${judgeUrl.replace(/\/$/, "")}/chat/completions`, {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: modelId,
                messages: [
                    { role: "system", content: "You are a strict JSON-only evaluator. Respond ONLY with the JSON object requested." },
                    { role: "user", content: judgePrompt },
                ],
                stream: false,
                max_tokens: 256,
                temperature: 0,
            }),
            signal: AbortSignal.timeout(timeoutMs),
        });
        if (!res.ok)
            return { passed: null, reason: `Judge API error: HTTP ${res.status}` };
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content ?? "";
        const scored = parseJudgeScore(text);
        if (!scored)
            return { passed: null, reason: `Judge returned unparseable response: ${text.slice(0, 100)}` };
        return {
            passed: scored.score >= threshold,
            reason: `Similarity score: ${scored.score}/10 (threshold: ${threshold}) — ${scored.reason}`,
        };
    }
    catch (e) {
        return { passed: null, reason: `Judge call failed: ${e.message?.slice(0, 100)}` };
    }
}
async function runProbes(options) {
    const { baseUrl, apiKey, modelId, includeOptional = false, timeoutMs = 180000, onProgress, judge, baseline, } = options;
    const chatUrl = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
    const startedAt = new Date().toISOString();
    const probes = probe_suite_js_1.PROBE_SUITE.filter(p => includeOptional || !p.optional);
    const results = [];
    // ── Pre-flight ────────────────────────────────────────────────────────────
    try {
        const pfRes = await fetch(chatUrl, {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: modelId, messages: [{ role: "user", content: "hi" }], max_tokens: 1, stream: false }),
            signal: AbortSignal.timeout(45000),
        });
        if (!pfRes.ok) {
            const rawBody = await pfRes.text().catch(() => "");
            const { outcome, reason } = (0, probe_preflight_js_1.classifyPreflightResult)(pfRes.status, rawBody);
            if (outcome === "abort") {
                for (const probe of probes) {
                    results.push({ probeId: probe.id, label: probe.label, group: probe.group, neutral: probe.neutral ?? false,
                        status: "error", passed: false, passReason: null, ttftMs: null, durationMs: null,
                        inputTokens: null, outputTokens: null, tps: null, response: null, error: reason });
                }
                const { low, high } = (0, probe_score_js_1.computeProbeScore)(results.map(r => ({ status: r.status, passed: r.passed, neutral: r.neutral })));
                return { baseUrl, modelId, startedAt, completedAt: new Date().toISOString(), score: low, scoreMax: high,
                    totalInputTokens: null, totalOutputTokens: null, results };
            }
        }
    }
    catch { /* network issues on preflight — proceed anyway */ }
    // ── Run each probe ────────────────────────────────────────────────────────
    let idx = 0;
    for (const probe of probes) {
        idx++;
        let result;
        // ── thinking_check ────────────────────────────────────────────────────
        if (probe.scoring === "thinking_check") {
            const t0 = Date.now();
            try {
                const r = await fetch(chatUrl, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "anthropic-beta": "interleaved-thinking-2025-05-14" },
                    body: JSON.stringify({ model: modelId, messages: [{ role: "user", content: probe.prompt }], stream: true, max_tokens: 2048, thinking: { type: "enabled", budget_tokens: 1024 } }),
                    signal: AbortSignal.timeout(timeoutMs),
                });
                const dur = Date.now() - t0;
                if (!r.ok) {
                    result = { probeId: probe.id, label: probe.label, group: probe.group, neutral: probe.neutral ?? false,
                        status: "done", passed: "warning", passReason: `HTTP ${r.status} — provider may not support thinking or beta header`, ttftMs: dur, durationMs: dur, inputTokens: null, outputTokens: null, tps: null, response: null, error: null };
                }
                else {
                    let hasThinking = false;
                    let fullT = "";
                    let ttft = null;
                    let inTok = null;
                    let outTok = null;
                    if (r.body) {
                        const rd = r.body.getReader();
                        const dc = new TextDecoder();
                        let buf = "";
                        while (true) {
                            const { done, value } = await rd.read();
                            if (done)
                                break;
                            if (ttft === null)
                                ttft = Date.now() - t0;
                            buf += dc.decode(value, { stream: true });
                            const ls = buf.split("\n");
                            buf = ls.pop() ?? "";
                            for (const l of ls) {
                                if (!l.startsWith("data: "))
                                    continue;
                                const p2 = l.slice(6).trim();
                                if (p2 === "[DONE]")
                                    continue;
                                try {
                                    const j = JSON.parse(p2);
                                    const delta = j.choices?.[0]?.delta;
                                    if (delta?.content)
                                        fullT += delta.content;
                                    if (j.type === "content_block_start")
                                        hasThinking = true;
                                    if (delta?.type === "thinking")
                                        hasThinking = true;
                                    const usage = j.usage;
                                    if (usage) {
                                        inTok = usage.prompt_tokens ?? null;
                                        outTok = usage.completion_tokens ?? null;
                                    }
                                }
                                catch { /* ignore */ }
                            }
                        }
                    }
                    const durationMs = Date.now() - t0;
                    result = { probeId: probe.id, label: probe.label, group: probe.group, neutral: probe.neutral ?? false,
                        status: "done", passed: hasThinking ? true : "warning",
                        passReason: hasThinking ? "Thinking content block detected — provider forwards beta header" : "Response OK but no thinking block — provider may not forward anthropic-beta header",
                        ttftMs: ttft ?? durationMs, durationMs, inputTokens: inTok, outputTokens: outTok, tps: null, response: fullT.slice(0, 1000), error: null };
                }
            }
            catch (e) {
                result = { probeId: probe.id, label: probe.label, group: probe.group, neutral: probe.neutral ?? false,
                    status: "error", passed: null, passReason: null, ttftMs: null, durationMs: null, inputTokens: null, outputTokens: null, tps: null, response: null, error: e.message?.slice(0, 300) ?? "Unknown error" };
            }
            results.push(result);
            onProgress?.(result, idx, probes.length);
            continue;
        }
        // ── consistency_check ─────────────────────────────────────────────────
        if (probe.scoring === "consistency_check") {
            const t0 = Date.now();
            const responses = [];
            let inTok = null;
            let outTok = null;
            for (let i = 0; i < 2; i++) {
                try {
                    const r = await fetch(chatUrl, {
                        method: "POST",
                        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
                        body: JSON.stringify({ model: modelId, messages: [{ role: "user", content: probe.prompt }], stream: false, max_tokens: 32, temperature: 0.7 }),
                        signal: AbortSignal.timeout(timeoutMs),
                    });
                    if (!r.ok) {
                        responses.push("__ERROR__");
                        continue;
                    }
                    const d = await r.json();
                    responses.push((d.choices?.[0]?.message?.content ?? "").trim());
                    if (i === 0) {
                        inTok = d.usage?.prompt_tokens ?? null;
                        outTok = d.usage?.completion_tokens ?? null;
                    }
                }
                catch {
                    responses.push("__EXCEPTION__");
                }
            }
            const ok = responses.length === 2 && !responses.includes("__ERROR__") && !responses.includes("__EXCEPTION__");
            const identical = ok && responses[0] === responses[1];
            result = { probeId: probe.id, label: probe.label, group: probe.group, neutral: probe.neutral ?? false,
                status: "done", durationMs: Date.now() - t0, inputTokens: inTok, outputTokens: outTok,
                response: responses.join(" | "), ttftMs: null, tps: null, error: null,
                passed: !ok ? "warning" : identical ? "warning" : true,
                passReason: !ok ? "One or more requests failed — cannot assess consistency"
                    : identical ? `Both responses identical (${responses[0]?.slice(0, 30)}) — possible cache hit`
                        : "Responses differ — confirms independent generation" };
            results.push(result);
            onProgress?.(result, idx, probes.length);
            continue;
        }
        // ── context_check ──────────────────────────────────────────────────────
        if (probe.scoring === "context_check") {
            const sendFn = async (message) => {
                const r = await fetch(chatUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
                    body: JSON.stringify({ model: modelId, messages: [{ role: "user", content: message }], max_tokens: 256, stream: false }),
                    signal: AbortSignal.timeout(timeoutMs),
                });
                const j = await r.json();
                return j.choices?.[0]?.message?.content ?? "";
            };
            try {
                const ctx = await (0, context_check_js_1.runContextCheck)(sendFn);
                result = { probeId: probe.id, label: probe.label, group: probe.group, neutral: probe.neutral ?? false,
                    status: "done", ttftMs: null, durationMs: null, inputTokens: null, outputTokens: null, tps: null,
                    response: ctx.reason, passed: ctx.warning ? "warning" : ctx.passed ? true : false, passReason: ctx.reason, error: null };
            }
            catch (e) {
                result = { probeId: probe.id, label: probe.label, group: probe.group, neutral: probe.neutral ?? false,
                    status: "error", passed: null, passReason: null, ttftMs: null, durationMs: null, inputTokens: null, outputTokens: null, tps: null, response: null, error: e.message?.slice(0, 300) ?? "Unknown error" };
            }
            results.push(result);
            onProgress?.(result, idx, probes.length);
            continue;
        }
        // ── Standard probes (stream or non-stream) ────────────────────────────
        const startTime = Date.now();
        let ttftMs = null;
        try {
            const useStream = probe.scoring !== "header_check";
            const rawSseLines = [];
            let fullText = "";
            let responseHeaders = {};
            let inputTokens = null;
            let outputTokens = null;
            const res = await fetch(chatUrl, {
                method: "POST",
                headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: modelId,
                    messages: [{ role: "user", content: probe.prompt }],
                    stream: useStream,
                    ...(useStream ? { stream_options: { include_usage: true } } : {}),
                    max_tokens: probe.scoring === "exact_match" ? 512 : 4096,
                    temperature: probe.scoring === "exact_match" ? 0 : 0.3,
                }),
                signal: AbortSignal.timeout(timeoutMs),
            });
            if (!res.ok) {
                const errText = await res.text();
                result = { probeId: probe.id, label: probe.label, group: probe.group, neutral: probe.neutral ?? false,
                    status: "error", passed: null, passReason: null, ttftMs: null, durationMs: Date.now() - startTime,
                    inputTokens: null, outputTokens: null, tps: null, response: null, error: `HTTP ${res.status}: ${errText.slice(0, 200)}` };
                results.push(result);
                onProgress?.(result, idx, probes.length);
                continue;
            }
            // Capture response headers
            res.headers.forEach((val, key) => { responseHeaders[key.toLowerCase()] = val; });
            if (useStream && res.body) {
                const reader = res.body.getReader();
                const decoder = new TextDecoder();
                let buf = "";
                while (true) {
                    const { done, value } = await reader.read();
                    if (done)
                        break;
                    if (ttftMs === null)
                        ttftMs = Date.now() - startTime;
                    buf += decoder.decode(value, { stream: true });
                    const lines = buf.split("\n");
                    buf = lines.pop() ?? "";
                    for (const line of lines) {
                        if (!line.startsWith("data: "))
                            continue;
                        const payload = line.slice(6).trim();
                        rawSseLines.push(payload);
                        if (payload === "[DONE]")
                            continue;
                        try {
                            const chunk = JSON.parse(payload);
                            if (chunk.choices?.[0]?.delta?.content)
                                fullText += chunk.choices[0].delta.content;
                            if (chunk.usage) {
                                inputTokens = chunk.usage.prompt_tokens ?? null;
                                outputTokens = chunk.usage.completion_tokens ?? null;
                            }
                        }
                        catch { /* ignore */ }
                    }
                }
            }
            else {
                const data = await res.json();
                fullText = data.choices?.[0]?.message?.content ?? "";
                inputTokens = data.usage?.prompt_tokens ?? null;
                outputTokens = data.usage?.completion_tokens ?? null;
            }
            const durationMs = Date.now() - startTime;
            const tps = (outputTokens && durationMs > 0) ? Math.round(outputTokens / (durationMs / 1000)) : null;
            // ── token_check ──────────────────────────────────────────────────────
            if (probe.scoring === "token_check") {
                const inflation = inputTokens !== null ? (0, token_inflation_js_1.detectTokenInflation)(inputTokens, token_inflation_js_1.TOKEN_INFLATION_THRESHOLD) : null;
                result = { probeId: probe.id, label: probe.label, group: probe.group, neutral: probe.neutral ?? false,
                    status: "done", ttftMs: ttftMs ?? durationMs, durationMs, inputTokens, outputTokens, tps,
                    response: fullText.slice(0, 1000), error: null,
                    passed: inflation ? (inflation.detected ? false : true) : "warning",
                    passReason: inflation
                        ? (inflation.detected ? `Token inflation detected: prompt_tokens=${inflation.actualPromptTokens} (threshold: ${token_inflation_js_1.TOKEN_INFLATION_THRESHOLD}) — probable hidden system prompt injection` : `No inflation: prompt_tokens=${inflation.actualPromptTokens}`)
                        : "Token count not available" };
                results.push(result);
                onProgress?.(result, idx, probes.length);
                continue;
            }
            // ── sse_compliance ───────────────────────────────────────────────────
            if (probe.scoring === "sse_compliance") {
                const compliance = (0, sse_compliance_js_1.checkSSECompliance)(rawSseLines);
                result = { probeId: probe.id, label: probe.label, group: probe.group, neutral: probe.neutral ?? false,
                    status: "done", ttftMs: ttftMs ?? durationMs, durationMs, inputTokens, outputTokens, tps,
                    response: fullText.slice(0, 500), error: null,
                    passed: compliance.passed ? true : (compliance.warning ? "warning" : false),
                    passReason: compliance.passed
                        ? `SSE format OK (${compliance.dataLines} chunks, [DONE] confirmed)${compliance.warning ? ` — ${compliance.missingChoicesCount} chunks missing choices field` : ""}`
                        : compliance.issues.join("; ") };
                results.push(result);
                onProgress?.(result, idx, probes.length);
                continue;
            }
            // ── Auto-scoreable (exact_match, keyword_match, header_check) ────────
            const autoResult = (0, probe_suite_js_1.autoScore)(probe, fullText, responseHeaders);
            let passed = null;
            let passReason = null;
            if (autoResult) {
                passed = autoResult.passed;
                passReason = autoResult.reason;
            }
            else if (probe.scoring === "feature_extract") {
                passed = null;
                passReason = "identity feature probe — response collected for fingerprint analysis";
            }
            else if (probe.scoring === "llm_judge") {
                // Use judge endpoint + baseline for similarity scoring
                if (judge && baseline && baseline[probe.id]) {
                    const judged = await runJudgeWithBaseline(judge.baseUrl, judge.apiKey, judge.modelId, probe, fullText, baseline[probe.id], judge.threshold ?? 7, timeoutMs);
                    passed = judged.passed === null ? null : judged.passed ? true : false;
                    passReason = judged.reason;
                }
                else if (judge && !baseline) {
                    passed = null;
                    passReason = "llm_judge: no baseline provided — pass --baseline <file> or --fetch-baseline <url> to enable similarity scoring";
                }
                else if (!judge) {
                    passed = null;
                    passReason = "llm_judge: no judge endpoint configured — pass --judge-base-url to enable auto-scoring";
                }
                else {
                    passed = null;
                    passReason = `llm_judge: no baseline entry for probe '${probe.id}' — run collect-baseline to build one`;
                }
            }
            result = { probeId: probe.id, label: probe.label, group: probe.group, neutral: probe.neutral ?? false,
                status: "done", ttftMs: ttftMs ?? durationMs, durationMs, inputTokens, outputTokens, tps,
                response: fullText.slice(0, 4000), passed, passReason, error: null };
        }
        catch (err) {
            result = { probeId: probe.id, label: probe.label, group: probe.group, neutral: probe.neutral ?? false,
                status: "error", passed: null, passReason: null, ttftMs: null, durationMs: null,
                inputTokens: null, outputTokens: null, tps: null, response: null,
                error: (err.message ?? "Unknown error").slice(0, 300) };
        }
        results.push(result);
        onProgress?.(result, idx, probes.length);
    }
    // ── Identity Phase ────────────────────────────────────────────────────────
    let identityAssessment;
    {
        const featureResponses = {};
        for (const r of results) {
            if (r.status === "done" && r.response) {
                const probe = probes.find(p => p.id === r.probeId);
                if (probe?.scoring === "feature_extract") {
                    featureResponses[r.probeId] = r.response;
                }
            }
        }
        const riskFlags = [];
        for (const r of results) {
            if (r.passed === false) {
                const probe = probes.find(p => p.id === r.probeId);
                if (probe && (probe.group === "integrity" || probe.group === "security")) {
                    riskFlags.push(`${r.label}: ${r.passReason ?? r.error ?? "failed"}`);
                }
            }
            if (r.passed === "warning" && r.probeId === "consistency_check") {
                riskFlags.push("consistency_check warning: possible cache hit — fingerprint confidence reduced");
            }
        }
        if (Object.keys(featureResponses).length > 0) {
            const features = (0, fingerprint_extractor_js_1.extractFingerprint)(featureResponses);
            const candidates = (0, candidate_matcher_js_1.matchCandidates)(features);
            const { status, confidence, evidence, predictedFamily } = (0, candidate_matcher_js_1.deriveVerdictFromClaimedModel)(candidates, options.claimedModel);
            const adjustedConfidence = riskFlags.length > 0
                ? Math.max(0, confidence - 0.15 * Math.min(riskFlags.length, 3))
                : confidence;
            identityAssessment = {
                status,
                confidence: Math.round(adjustedConfidence * 100) / 100,
                claimedModel: options.claimedModel,
                predictedFamily,
                predictedCandidates: candidates,
                riskFlags,
                evidence,
            };
        }
    }
    // ── Finalize ──────────────────────────────────────────────────────────────
    const completedAt = new Date().toISOString();
    const { low, high } = (0, probe_score_js_1.computeProbeScore)(results.map(r => ({ status: r.status, passed: r.passed, neutral: r.neutral })));
    const totalIn = results.reduce((s, r) => s + (r.inputTokens ?? 0), 0);
    const totalOut = results.reduce((s, r) => s + (r.outputTokens ?? 0), 0);
    return {
        baseUrl,
        modelId,
        claimedModel: options.claimedModel,
        startedAt,
        completedAt,
        score: low,
        scoreMax: high,
        totalInputTokens: totalIn > 0 ? totalIn : null,
        totalOutputTokens: totalOut > 0 ? totalOut : null,
        results,
        identityAssessment,
    };
}
//# sourceMappingURL=runner.js.map