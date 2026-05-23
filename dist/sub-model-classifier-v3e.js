"use strict";
// src/sub-model-classifier-v3e.ts — V3E: V3 + refusal-ladder + formatting + uncertainty.
//
// Designed for same-family spoof resistance (sibling-size discrimination).
// Paper refs: Arditi 2406.11717 (refusal direction), McGovern 2405.14057
// (formatting fingerprint), Kadavath 2207.05221 (calibration).
//
// V3E runs alongside V3 — both classifiers score the same observed responses.
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_V3E_WEIGHTS = void 0;
exports.extractRefusalLadder = extractRefusalLadder;
exports.extractFormatting = extractFormatting;
exports.extractUncertainty = extractUncertainty;
exports.inferFamilyVotesFromV3EObserved = inferFamilyVotesFromV3EObserved;
exports.inferFamilyVotesFromV3EResponses = inferFamilyVotesFromV3EResponses;
exports.scoreV3EMatch = scoreV3EMatch;
exports.classifySubmodelV3E = classifySubmodelV3E;
const REFUSAL_LEAD_PATTERNS = [
    /^i\s*(can'?t|can’t|cannot)/i,
    /^i[’']?m\s+not\s+(going|able)/i,
    /^i[’']?m\s+sorry/i,
    /^sorry/i,
    /^no[\.,]/i,
];
function classifyRung(text) {
    if (!text || text.trim().length < 5)
        return 1; // empty/short -> treat as partial
    const first = (text.split(/\r?\n/).find((l) => l.trim()) ?? "").trim();
    for (const pat of REFUSAL_LEAD_PATTERNS) {
        if (pat.test(first))
            return 2;
    }
    // Partial-compliance heuristic: contains a refusal phrase later but also substantive content.
    if (/\b(illegal|unlawful|harmful|i can't|cannot provide)/i.test(text) && text.length > 400) {
        return 1;
    }
    return 0;
}
function extractRefusalLadder(responses) {
    const ids = [
        "v3e_refusal_l1_tame",
        "v3e_refusal_l2_mild",
        "v3e_refusal_l3_borderline_a",
        "v3e_refusal_l4_borderline_b",
        "v3e_refusal_l5_borderline_c",
        "v3e_refusal_l6_sensitive",
        "v3e_refusal_l7_strong",
        "v3e_refusal_l8_hard",
    ];
    const vector = ids.map((id) => classifyRung(responses[id] ?? ""));
    const refused = vector.filter((v) => v === 2).length;
    const partial = vector.filter((v) => v === 1).length;
    const firstRefusalRung = vector.findIndex((v) => v === 2);
    const joined = ids.map((id) => responses[id] ?? "").join(" ");
    const refusedTexts = ids.filter((_, i) => vector[i] === 2).map((id) => responses[id] ?? "");
    const avgLen = refusedTexts.length
        ? refusedTexts.reduce((s, t) => s + t.length, 0) / refusedTexts.length
        : 0;
    return {
        vector,
        refusedCount: refused,
        partialCount: partial,
        firstRefusalRung,
        citesLegal: /18\s*U\.?S\.?C\.?|§\s*842|criminal\s+code|prohibited\s+by\s+law/i.test(joined),
        cites988: /\b988\b/.test(joined),
        avgRefusalLength: avgLen,
    };
}
function extractFormatting(responses) {
    const bullets = responses.v3e_fmt_bullets ?? "";
    const lines = bullets.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const counts = { "-": 0, "*": 0, "bullet-dot": 0, "1.": 0 };
    for (const l of lines) {
        if (/^-\s/.test(l))
            counts["-"]++;
        else if (/^\*\s/.test(l))
            counts["*"]++;
        else if (/^•\s/.test(l))
            counts["bullet-dot"]++;
        else if (/^\d+\.\s/.test(l))
            counts["1."]++;
    }
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const bulletChar = sorted[0] && sorted[0][1] > 0 ? sorted[0][0] : "none";
    const explain = responses.v3e_fmt_explain_depth ?? "";
    const headerMatches = explain.match(/^(#{1,6})\s/gm) ?? [];
    const headerDepth = headerMatches.length
        ? Math.max(...headerMatches.map((h) => h.trim().length))
        : 0;
    const code = responses.v3e_fmt_code_lang_tag ?? "";
    const fenceMatch = code.match(/```([a-zA-Z0-9_+-]*)/);
    const codeLangTag = fenceMatch ? fenceMatch[1].toLowerCase() || "" : null;
    const anyText = bullets + explain + code;
    return {
        bulletChar,
        headerDepth,
        codeLangTag,
        usesEmDash: anyText.includes("—"),
    };
}
function extractUncertainty(responses) {
    const raw = responses.v3e_uncertainty_estimate ?? "";
    const m = raw.match(/\b(\d{1,3})\b/);
    if (!m)
        return { value: null, isRound: false };
    const n = Math.max(0, Math.min(100, parseInt(m[1], 10)));
    return { value: n, isRound: n % 5 === 0 };
}
exports.DEFAULT_V3E_WEIGHTS = {
    ladder: 0.50, formatting: 0.25, uncertainty: 0.15, citationBonus: 0.10,
};
function inferFamilyVotesFromV3EObserved(observed) {
    const v = observed.refusalLadder.vector;
    const votes = [];
    if (v.length < 8)
        return votes;
    // Claude Opus/Sonnet/Haiku baselines tend to refuse the mid-ladder pair
    // L3/L5 together. Treat this as weak family evidence only; V3 still needs
    // the normal refusal/cutoff/capability votes to clear its decision threshold.
    if (v[2] === 2 && v[4] === 2) {
        votes.push({ family: "anthropic", weight: 0.8, reason: "v3e L3+L5 refusal" });
    }
    else if ((v[2] === 2 || v[4] === 2) && observed.refusalLadder.firstRefusalRung <= 2) {
        votes.push({ family: "anthropic", weight: 0.35, reason: "v3e early mid-ladder refusal" });
    }
    if (observed.refusalLadder.citesLegal && v[2] === 2) {
        votes.push({ family: "anthropic", weight: 0.35, reason: "v3e legal citation with mid-ladder refusal" });
    }
    return votes;
}
function inferFamilyVotesFromV3EResponses(responses) {
    const observed = {
        refusalLadder: extractRefusalLadder(responses),
        formatting: extractFormatting(responses),
        uncertainty: extractUncertainty(responses),
    };
    return inferFamilyVotesFromV3EObserved(observed);
}
// L8 (v3e_refusal_l8_hard, index 7) is dropped for the anthropic family.
// Third-party relays pre-screen the ransomware prompt and return empty bodies
// for ~38.8% of Opus 4.7 runs, which would otherwise corrupt the ladder
// fingerprint. See plan 2026-05-12-pl-v3e-skip-l8-for-claude.md.
const ANTHROPIC_SKIP_LADDER_INDICES = [7];
function ladderSimilarity(obsVec, refVecAvg, skipIndices = []) {
    if (obsVec.length !== refVecAvg.length)
        return 0;
    const skip = new Set(skipIndices);
    // Normalizer /12 calibrated for the full 8-dim vector. When dimensions are
    // skipped we scale proportionally so the similarity curve stays consistent:
    //   - 1-rung disagreement (sumSq ~= 1-4) drops similarity to 0.67-0.92
    //   - ~2 rungs of disagreement in the decisive mid-band sends score below 0.70
    //   - identical vectors still score ~1.0
    let sumSq = 0;
    let active = 0;
    for (let i = 0; i < obsVec.length; i++) {
        if (skip.has(i))
            continue;
        sumSq += (obsVec[i] - refVecAvg[i]) ** 2;
        active++;
    }
    if (active === 0)
        return 1;
    const norm = (12 * active) / obsVec.length;
    return Math.max(0, 1 - sumSq / norm);
}
function formatSimilarity(obs, ref) {
    // Exponential falloff on header depth (|diff|=0 -> 1, 1 -> 0.61, 2 -> 0.37).
    // Bullet char and code tag are exact-match.
    const bulletHit = obs.bulletChar === ref.bulletCharMode ? 1 : 0;
    const headerHit = Math.exp(-Math.abs(obs.headerDepth - ref.headerDepthAvg) / 2);
    const codeHit = (obs.codeLangTag ?? "") === (ref.codeLangTagMode ?? "") ? 1 : 0;
    return (bulletHit + headerHit + codeHit) / 3;
}
function uncertaintySimilarity(obs, ref) {
    if (obs.value == null || ref.valueAvg == null)
        return 0.5;
    const sigma = Math.max(5, ref.valueStdDev ?? 10);
    const z = Math.abs(obs.value - ref.valueAvg) / sigma;
    return Math.max(0, Math.exp(-0.5 * z * z));
}
function scoreV3EMatch(obs, ref, weights = exports.DEFAULT_V3E_WEIGHTS) {
    const matched = [];
    const divergent = [];
    const skip = ref.family === "anthropic" ? ANTHROPIC_SKIP_LADDER_INDICES : [];
    const ladder = ladderSimilarity(obs.refusalLadder.vector, ref.refusalLadder.vectorAvg, skip);
    if (ladder >= 0.85)
        matched.push(`ladder(${ladder.toFixed(2)})`);
    else
        divergent.push(`ladder(${ladder.toFixed(2)})`);
    const fmt = formatSimilarity(obs.formatting, ref.formatting);
    if (fmt >= 0.67)
        matched.push(`fmt(${fmt.toFixed(2)})`);
    else
        divergent.push(`fmt(${fmt.toFixed(2)})`);
    const unc = uncertaintySimilarity(obs.uncertainty, ref.uncertainty);
    if (unc >= 0.5)
        matched.push(`unc(${unc.toFixed(2)})`);
    else
        divergent.push(`unc(${unc.toFixed(2)})`);
    // Citation bonus is only applied when the ladder already indicates a strong
    // match. Without this gate, a Sonnet-like vector that happens to cite 988
    // (common across many Anthropic-family sibs) would inflate the Opus score.
    let citationBonus = 0;
    if (ladder >= 0.75) {
        if (obs.refusalLadder.citesLegal && ref.refusalLadder.citesLegalRate >= 0.5) {
            citationBonus += 0.05;
            matched.push("cite.legal");
        }
        if (obs.refusalLadder.cites988 && ref.refusalLadder.cites988Rate >= 0.5) {
            citationBonus += 0.05;
            matched.push("cite.988");
        }
    }
    const base = weights.ladder * ladder +
        weights.formatting * fmt +
        weights.uncertainty * unc;
    const score = Math.min(1, base + weights.citationBonus * (citationBonus * 10));
    return { score, matched, divergent };
}
function classifySubmodelV3E(responses, baselines, options = {}) {
    const observed = {
        refusalLadder: extractRefusalLadder(responses),
        formatting: extractFormatting(responses),
        uncertainty: extractUncertainty(responses),
    };
    const threshold = options.confidenceThreshold ?? 0.60;
    const pool = options.predictedFamily
        ? baselines.filter((b) => b.family === options.predictedFamily)
        : baselines;
    const scored = pool
        .map((ref) => {
        const { score, matched, divergent } = scoreV3EMatch(observed, ref, options.weights);
        return {
            modelId: ref.modelId,
            family: ref.family,
            displayName: ref.displayName,
            score,
            matched,
            divergent,
        };
    })
        .sort((a, b) => b.score - a.score);
    const firstMatch = scored[0] ?? null;
    const runnerUp = scored[1];
    const gap = firstMatch && runnerUp ? firstMatch.score - runnerUp.score : Infinity;
    const abstained = firstMatch != null && gap < 0.05;
    const top = firstMatch && firstMatch.score >= threshold && !abstained ? firstMatch : null;
    return { observed, top, candidates: scored.slice(0, 3), abstained };
}
//# sourceMappingURL=sub-model-classifier-v3e.js.map