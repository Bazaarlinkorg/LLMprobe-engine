"use strict";
// src/sub-model-classifier-ikp.ts — Inherent Knowledge Probe classifier.
// Uses 5 short-answer factual probes whose correct answers are stable but
// model-version-specific. Used as a knowledge-anchor cross-check for V3.
Object.defineProperty(exports, "__esModule", { value: true });
exports.IKP_PROBE_IDS = void 0;
exports.classifySubmodelIKP = classifySubmodelIKP;
exports.fuseV3WithIKP = fuseV3WithIKP;
const backtest_scorer_js_1 = require("./backtest-scorer.js");
exports.IKP_PROBE_IDS = [
    "ikp_t3_domain_fact",
    "ikp_t4_obscure_fact",
    "ikp_t4_bio_fact",
    "ikp_t5_deep_fact",
    "ikp_t5_codegen_edge",
];
const IKP_PROBES = [
    { id: "ikp_t3_domain_fact", aliases: ["certificate", "server certificate", "certificate message"] },
    { id: "ikp_t4_obscure_fact", aliases: ["leader completeness", "leader completeness property"] },
    { id: "ikp_t4_bio_fact", aliases: ["serine", "histidine", "aspartate", "asp", "his", "ser"] },
    { id: "ikp_t5_deep_fact", aliases: ["p2", "p2b", "p2c", "safety", "chosen", "higher numbered"] },
    { id: "ikp_t5_codegen_edge", aliases: ["not viable", "non viable", "viable", "constraints", "constraint satisfaction"] },
];
function displayName(modelId) {
    const raw = modelId.split("/").pop() ?? modelId;
    return raw
        .replace(/^claude-/, "Claude ")
        .replace(/^gpt-/, "GPT-")
        .replace(/^deepseek-/, "DeepSeek ")
        .replace(/-/g, " ")
        .replace(/\b\w/g, (m) => m.toUpperCase())
        .replace("Gpt", "GPT");
}
function norm(text) {
    return text
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[`*_#>\[\]().,;:!?'"-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}
function tokens(text) {
    return new Set(norm(text).split(" ").filter((t) => t.length >= 3).slice(0, 80));
}
function jaccard(a, b) {
    if (a.size === 0 && b.size === 0)
        return 1;
    let inter = 0;
    for (const x of a)
        if (b.has(x))
            inter++;
    return inter / (a.size + b.size - inter || 1);
}
function stanceFor(probe, response) {
    const n = norm(response);
    if (!n)
        return "empty";
    if (/\b(i don t know|i do not know|unknown|not certain|not sure|cannot determine|no reliable|unable to verify)\b/.test(n)) {
        return "unknown";
    }
    if (/\b(can t|cannot|unable|won t|sorry)\b/.test(n) && n.length < 260)
        return "refused";
    if (probe.aliases.some((a) => n.includes(norm(a))))
        return "correct";
    return "other";
}
function extractIkp(responses) {
    const out = {};
    for (const probe of IKP_PROBES) {
        const text = responses[probe.id] ?? "";
        out[probe.id] = {
            stance: stanceFor(probe, text),
            tokenSet: tokens(text),
            length: text.length,
        };
    }
    return out;
}
function probeSimilarity(obs, ref) {
    const stanceHit = obs.stance === ref.stance ? 1 : 0;
    const textSim = jaccard(obs.tokenSet, ref.tokenSet);
    const lenSim = obs.length > 0 && ref.length > 0
        ? Math.exp(-0.5 * (Math.log(obs.length / ref.length) / 0.7) ** 2)
        : 0.4;
    return 0.45 * stanceHit + 0.40 * textSim + 0.15 * lenSim;
}
function scoreIkp(obs, ref) {
    const scores = IKP_PROBES.map((probe) => probeSimilarity(obs[probe.id], ref[probe.id]));
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}
function pickTop(candidates, threshold, gapThreshold) {
    const first = candidates[0] ?? null;
    if (!first || first.score < threshold)
        return { top: null, abstained: false };
    const gap = candidates[1] ? first.score - candidates[1].score : Infinity;
    if (gap < gapThreshold)
        return { top: null, abstained: true };
    return { top: first, abstained: false };
}
function classifySubmodelIKP(responses, baselines, options = {}) {
    const observed = extractIkp(responses);
    const byModel = new Map();
    for (const row of baselines) {
        if (!exports.IKP_PROBE_IDS.includes(row.probeId))
            continue;
        const family = (0, backtest_scorer_js_1.modelIdToFamily)(row.modelId);
        if (options.predictedFamily && family !== options.predictedFamily)
            continue;
        const m = byModel.get(row.modelId) ?? {};
        m[row.probeId] = row.responseText;
        byModel.set(row.modelId, m);
    }
    const candidates = [...byModel.entries()]
        .filter(([, rows]) => exports.IKP_PROBE_IDS.every((id) => typeof rows[id] === "string" && rows[id].trim().length > 0))
        .map(([modelId, rows]) => {
        const family = (0, backtest_scorer_js_1.modelIdToFamily)(modelId) ?? "unknown";
        return {
            modelId,
            family,
            displayName: displayName(modelId),
            score: scoreIkp(observed, extractIkp(rows)),
        };
    })
        .filter((c) => c.family !== "unknown")
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
    const picked = pickTop(candidates, options.threshold ?? 0.52, options.gapThreshold ?? 0.025);
    return { top: picked.top, candidates, abstained: picked.abstained };
}
function fuseV3WithIKP(v3, ikp, family) {
    if (!ikp || !family || ikp.candidates.length === 0)
        return v3;
    if (!v3.subModelMatch || v3.abstained) {
        return {
            ...v3,
            subModelMatch: ikp.top,
            candidates: ikp.candidates,
            abstained: ikp.abstained || !ikp.top,
        };
    }
    if (!ikp.top)
        return v3;
    if (v3.subModelMatch.modelId === ikp.top.modelId)
        return v3;
    return {
        ...v3,
        subModelMatch: null,
        candidates: [
            { ...v3.subModelMatch, score: v3.subModelMatch.score },
            ...ikp.candidates.filter((c) => c.modelId !== v3.subModelMatch?.modelId),
        ].slice(0, 3),
        abstained: true,
    };
}
//# sourceMappingURL=sub-model-classifier-ikp.js.map