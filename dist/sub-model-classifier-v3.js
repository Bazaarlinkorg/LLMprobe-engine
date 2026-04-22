"use strict";
// src/sub-model-classifier-v3.ts — V3 deterministic sub-model classifier.
//
// Uses 3 probes (submodel_cutoff, submodel_capability, submodel_refusal) that
// produce a deterministic feature vector per sub-model. Cross-checks the
// implied family against the V2 family classifier to flag wrapper-spoof.
//
// Inputs:
//   - observedResponses: Record<probeId, raw response text>
// Outputs:
//   - extracted feature vector (for baseline matching)
//   - closest sub-model match + confidence
//   - V3-implied family (for cross-check with V2 family → wrapper-spoof flag)
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllFamilies = exports.getBaselinesForFamily = exports.V3_BASELINES = exports.TIE_BREAK_GAP = void 0;
exports.extractCutoff = extractCutoff;
exports.extractCapability = extractCapability;
exports.extractRefusal = extractRefusal;
exports.extractV3Features = extractV3Features;
exports.lengthScoreLogGaussian = lengthScoreLogGaussian;
exports.implyFamily = implyFamily;
exports.classifySubmodelV3 = classifySubmodelV3;
exports.scoreExtractedFeatures = scoreExtractedFeatures;
exports.verifyPairwiseUniqueness = verifyPairwiseUniqueness;
const sub_model_baselines_v3_js_1 = require("./sub-model-baselines-v3.js");
Object.defineProperty(exports, "V3_BASELINES", { enumerable: true, get: function () { return sub_model_baselines_v3_js_1.V3_BASELINES; } });
Object.defineProperty(exports, "getBaselinesForFamily", { enumerable: true, get: function () { return sub_model_baselines_v3_js_1.getBaselinesForFamily; } });
Object.defineProperty(exports, "getAllFamilies", { enumerable: true, get: function () { return sub_model_baselines_v3_js_1.getAllFamilies; } });
const sub_model_v3_uniqueness_js_1 = require("./sub-model-v3-uniqueness.js");
// The public engine ships with a fixed V3_BASELINES list. Downstream users
// who need runtime-updatable baselines (e.g. hot-swap from a DB) can pass
// `baselines` explicitly to classifySubmodelV3 / scoreExtractedFeatures.
function currentBaselines(override) {
    return override ?? sub_model_baselines_v3_js_1.V3_BASELINES;
}
// Pre-computed at module load against the seed list. scoreMatch re-derives
// from the runtime pool per call when an override is used.
const UNIQUENESS_MAP = (0, sub_model_v3_uniqueness_js_1.buildUniquenessMap)(sub_model_baselines_v3_js_1.V3_BASELINES);
/** Score gap below which the scorer abstains. Opus 4.5 / 4.7 can tie within
 * 2-3% due to shared capability + refusal lead prefix. 5% is generous enough
 * to catch these cases without suppressing legitimate-but-close winners. */
exports.TIE_BREAK_GAP = 0.05;
// ── Feature extractors ────────────────────────────────────────────────────
function extractCutoff(text) {
    if (!text)
        return null;
    const m = text.match(/(\d{4})[-年\s\/\.]*(\d{1,2})/);
    return m ? `${m[1]}-${String(m[2]).padStart(2, "0")}` : null;
}
function extractCapability(text) {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const keys = ["q1_strawberry", "q2_1000days", "q3_apples", "q4_prime", "q5_backwards"];
    const out = {
        q1_strawberry: null, q2_1000days: null, q3_apples: null, q4_prime: null, q5_backwards: null,
    };
    for (const line of lines) {
        const m = line.match(/^(\d)[\.、:)]\s*(.+?)$/);
        if (m) {
            const idx = parseInt(m[1], 10) - 1;
            if (idx >= 0 && idx < keys.length) {
                out[keys[idx]] = m[2].trim().toLowerCase().replace(/[。\.!?]+$/, "");
            }
        }
    }
    return out;
}
function extractRefusal(text) {
    // Anthropic models often prefix with empty newlines ("\n\nI can't ...").
    // Skip leading blanks so refusal lead + starts_with_* flags reflect the
    // actual first content line.
    const firstLine = (text.split(/\r?\n/).find(l => l.trim()) ?? "").trim();
    return {
        lead: firstLine.slice(0, 40),
        starts_with_no: /^no[\.\s,]/i.test(firstLine),
        starts_with_sorry: /^(i'?m\s+)?sorry|^抱歉/i.test(firstLine),
        starts_with_cant: /^i\s*(can'?t|can’t|cannot)/i.test(firstLine),
        cites_18_usc: /18\s*U\.?S\.?C\.?\s*§?\s*842/i.test(text),
        mentions_988: /\b988\b/.test(text),
        mentions_virtually_all: /virtually\s+all\s+jurisdictions/i.test(text),
        mentions_history_alt: /chemistry,?\s*engineering,?\s*or\s*history/i.test(text),
        mentions_pyrotechnics: /pyrotechnics/i.test(text),
        mentions_policies: /(openai.{0,20}polic|content\s*polic|use\s*case\s*polic)/i.test(text),
        mentions_guidelines: /guidelines?/i.test(text),
        mentions_illegal: /illegal|unlawful|against\s+the\s+law/i.test(text),
        mentions_harmful: /harmful|dangerous|harm/i.test(text),
        length: text.length,
    };
}
function extractV3Features(responses, rejectsTemperature = null) {
    return {
        cutoff: extractCutoff(responses.submodel_cutoff ?? ""),
        capability: extractCapability(responses.submodel_capability ?? ""),
        refusal: extractRefusal(responses.submodel_refusal ?? ""),
        rejectsTemperature,
    };
}
// ── Match scoring ─────────────────────────────────────────────────────────
/** Log-Gaussian length-similarity kernel.
 * Score decays smoothly with |log(obs/ref)|. Symmetric and scale-invariant:
 * a 2× overshoot scores the same as a 2× undershoot. sigma=0.5 → 20% drift ≈
 * 0.94, 2× drift ≈ 0.38. */
function lengthScoreLogGaussian(obs, ref) {
    if (obs <= 0 || ref <= 0)
        return 0;
    const sigma = 0.5;
    const logRatio = Math.log(obs / ref);
    return Math.exp(-0.5 * (logRatio / sigma) ** 2);
}
function scoreMatch(obs, ref, uniquenessMap = UNIQUENESS_MAP) {
    const matched = [];
    const divergent = [];
    // cutoff
    let cutoffScore = 0;
    if (obs.cutoff && obs.cutoff === ref.cutoff) {
        cutoffScore = 1;
        matched.push("cutoff");
    }
    else
        divergent.push(`cutoff (${obs.cutoff} vs ${ref.cutoff})`);
    // capability
    const capKeys = ["q1_strawberry", "q2_1000days", "q3_apples", "q4_prime", "q5_backwards"];
    let capHits = 0;
    for (const k of capKeys) {
        if (obs.capability[k] && obs.capability[k] === ref.capability[k]) {
            capHits++;
            matched.push(`cap.${k}`);
        }
        else
            divergent.push(`cap.${k}`);
    }
    const capScore = capHits / capKeys.length;
    // refusal lead
    const leadMatch = obs.refusal.lead && ref.refusal.lead &&
        obs.refusal.lead.slice(0, 20).toLowerCase() === ref.refusal.lead.slice(0, 20).toLowerCase();
    if (leadMatch)
        matched.push("refusal.lead");
    else
        divergent.push("refusal.lead");
    const flagKeys = [
        "starts_with_no", "starts_with_sorry", "starts_with_cant",
        "cites_18_usc", "mentions_988", "mentions_virtually_all",
        "mentions_history_alt", "mentions_pyrotechnics", "mentions_policies",
        "mentions_guidelines", "mentions_illegal", "mentions_harmful",
    ];
    let flagHits = 0;
    for (const k of flagKeys) {
        if (obs.refusal[k] === ref.refusal[k]) {
            flagHits++;
            matched.push(`refusal.${k}`);
        }
        else
            divergent.push(`refusal.${k}`);
    }
    const refusalScore = (leadMatch ? 0.5 : 0) + 0.5 * (flagHits / flagKeys.length);
    const lengthScore = lengthScoreLogGaussian(obs.refusal.length, ref.refusal.length_avg);
    if (lengthScore >= 0.80)
        matched.push("refusal.length");
    else
        divergent.push(`refusal.length (${obs.refusal.length} vs avg ${ref.refusal.length_avg})`);
    // temperature signal: asymmetric — only obs=true carries information.
    let tempBoost = 0;
    if (obs.rejectsTemperature === true) {
        if (ref.rejectsTemperature) {
            tempBoost = 0.10;
            matched.push("rejectsTemperature");
        }
        else {
            tempBoost = -0.10;
            divergent.push("rejectsTemperature (obs=true ref=false → excluded)");
        }
    }
    const baseScore = 0.20 * cutoffScore + 0.25 * capScore + 0.35 * refusalScore + 0.20 * lengthScore;
    const boost = (0, sub_model_v3_uniqueness_js_1.uniquenessBoost)(obs, ref, uniquenessMap);
    if (boost > 0)
        matched.push(`uniqueness+${boost.toFixed(2)}`);
    const score = Math.min(1.0, Math.max(0, baseScore + boost + tempBoost));
    return { score, matched, divergent };
}
// ── V3-implied family (used for cross-check vs V2 family) ─────────────────
function implyFamily(features) {
    const r = features.refusal;
    const lead = r.lead.toLowerCase();
    if (/i understand you['’]?re asking about/i.test(lead))
        return "deepseek";
    // Curly apostrophe U+2019 is unique to GPT-5 family in our fixture.
    const hasCurly = lead.includes("’");
    if (hasCurly && /^i\s*can’t/i.test(lead))
        return "openai";
    if (hasCurly && /^sorry\s*[—\-]/i.test(lead))
        return "openai";
    if (r.cites_18_usc)
        return "anthropic";
    if (r.mentions_history_alt)
        return "anthropic";
    if (r.mentions_virtually_all)
        return "anthropic";
    if (r.mentions_pyrotechnics && lead.includes("i can"))
        return "anthropic";
    if (/^no[\.,]/i.test(lead))
        return "anthropic";
    if (/^i can['’]?t\s+help\s+with/i.test(lead))
        return "anthropic";
    if (/^i can['’]?t\s+provide/i.test(lead))
        return "anthropic";
    if (/^i['’]?m\s+not\s+going\s+to/i.test(lead))
        return "anthropic";
    if (/^i['’]?m\s+sorry/i.test(lead) && !r.mentions_harmful)
        return "openai";
    if (/^i\s+cannot\s+(answer|fulfill|help)/i.test(lead))
        return "google";
    if (/^i['’]?m\s+sorry.{0,5}but.{0,5}i\s+can['’]?t\s+provide/i.test(lead))
        return "qwen";
    if (/^i\s+cannot\s+provide/i.test(lead))
        return "qwen";
    return null;
}
function classifySubmodelV3(responses, options = {}) {
    const features = extractV3Features(responses, options.rejectsTemperature ?? null);
    const familyImplied = implyFamily(features);
    const threshold = options.confidenceThreshold ?? 0.60;
    const allBaselines = currentBaselines(options.baselines);
    const pool = options.predictedFamily
        ? allBaselines.filter(b => b.family === options.predictedFamily)
        : allBaselines;
    const uniquenessMap = (0, sub_model_v3_uniqueness_js_1.buildUniquenessMap)(allBaselines);
    if (pool.length === 0) {
        return {
            features, top: null, candidates: [],
            familyImplied, familyMismatch: false, abstained: false,
        };
    }
    const scored = pool.map(ref => {
        const { score, matched, divergent } = scoreMatch(features, ref, uniquenessMap);
        return {
            modelId: ref.modelId,
            family: ref.family,
            displayName: ref.displayName,
            score,
            matchedFeatures: matched,
            divergentFeatures: divergent,
        };
    });
    scored.sort((a, b) => b.score - a.score);
    const candidates = scored.slice(0, 3);
    const firstMatch = scored[0] ?? null;
    const runnerUp = scored[1];
    const gap = firstMatch && runnerUp ? firstMatch.score - runnerUp.score : Infinity;
    const abstained = firstMatch !== null && gap < exports.TIE_BREAK_GAP;
    const top = (firstMatch && firstMatch.score >= threshold && !abstained) ? firstMatch : null;
    const familyMismatch = Boolean(options.predictedFamily && familyImplied && familyImplied !== options.predictedFamily);
    return { features, top, candidates, familyImplied, familyMismatch, abstained };
}
/** Re-score a previously-extracted V3Features vector (e.g. from probe history
 * JSON) against the baseline pool. Useful for replay / backtesting without
 * re-calling upstream. */
function scoreExtractedFeatures(features, options = {}) {
    const familyImplied = implyFamily(features);
    const baselines = currentBaselines(options.baselines);
    const pool = familyImplied ? baselines.filter(b => b.family === familyImplied) : baselines;
    const uniquenessMap = (0, sub_model_v3_uniqueness_js_1.buildUniquenessMap)(baselines);
    const matches = pool.map(ref => {
        const { score, matched, divergent } = scoreMatch(features, ref, uniquenessMap);
        return {
            modelId: ref.modelId, family: ref.family, displayName: ref.displayName,
            score, matchedFeatures: matched, divergentFeatures: divergent,
        };
    });
    const sorted = [...matches].sort((a, b) => b.score - a.score);
    const candidates = sorted.slice(0, 3);
    const firstMatch = sorted[0] ?? null;
    const runnerUp = sorted[1];
    const gap = firstMatch && runnerUp ? firstMatch.score - runnerUp.score : Infinity;
    const abstained = firstMatch !== null && gap < exports.TIE_BREAK_GAP;
    return {
        features,
        top: abstained ? null : firstMatch,
        candidates,
        familyImplied,
        familyMismatch: false,
        abstained,
    };
}
/** Test helper: assert pairwise uniqueness across the baseline fixture. */
function verifyPairwiseUniqueness() {
    const collisions = [];
    for (let i = 0; i < sub_model_baselines_v3_js_1.V3_BASELINES.length; i++) {
        for (let j = i + 1; j < sub_model_baselines_v3_js_1.V3_BASELINES.length; j++) {
            const a = sub_model_baselines_v3_js_1.V3_BASELINES[i];
            const b = sub_model_baselines_v3_js_1.V3_BASELINES[j];
            if (a.family !== b.family)
                continue;
            const sigA = JSON.stringify({ c: a.cutoff, q: a.capability, r: a.refusal });
            const sigB = JSON.stringify({ c: b.cutoff, q: b.capability, r: b.refusal });
            if (sigA === sigB)
                collisions.push([a.modelId, b.modelId]);
        }
    }
    return { unique: collisions.length === 0, collisions };
}
//# sourceMappingURL=sub-model-classifier-v3.js.map