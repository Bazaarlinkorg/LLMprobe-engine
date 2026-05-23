"use strict";
// src/baseline-match-votes.ts — "LLMmap" family voting via baseline matching.
//
// Each known model has recorded answers for the same probes the endpoint
// under test is running. By comparing the test endpoint's response to every
// known model's recorded response, we derive a per-family "match score" that
// is much harder to spoof than stylistic signals:
//   - System prompts can change tone, list format, smart quotes, etc.
//   - But they cannot easily make Claude answer "菅義偉" when GPT-3.5
//     answers "菅義偉" and real Claude answers "岸田文雄" / "石破茂".
//   - Capability probes (hanoi format, photosynthesis verbosity) are
//     tied to training data and model weights, not context.
//
// This module produces a category we mix into FingerprintFeatureSet:
//   baselineMatchVotes: { [family]: 0..1 }  — higher = more of the
//   endpoint's answers match that family's recorded baselines.
Object.defineProperty(exports, "__esModule", { value: true });
exports.responseSimilarity = responseSimilarity;
exports.baselineModelIdToFamily = baselineModelIdToFamily;
exports.computeBaselineMatchVotes = computeBaselineMatchVotes;
function normalize(s) {
    if (typeof s !== "string")
        return "";
    return s
        .replace(/```[a-z]*\n?/gi, "")
        .replace(/```/g, "")
        .replace(/[\s　]+/g, " ")
        .trim()
        .toLowerCase();
}
function tokenize(s) {
    const tokens = new Set();
    const norm = normalize(s);
    for (const w of norm.match(/[a-z0-9]+/g) ?? [])
        tokens.add(w);
    for (const ch of norm.match(/[一-鿿぀-ヿ가-힣]/g) ?? [])
        tokens.add(ch);
    return tokens;
}
/** Jaccard similarity on token sets, plus exact-match boost. */
function responseSimilarity(a, b) {
    if (!a || !b)
        return 0;
    const na = normalize(a);
    const nb = normalize(b);
    if (!na || !nb)
        return 0;
    if (na === nb)
        return 1.0;
    if (na.length <= 20 && nb.length <= 20) {
        if (na.includes(nb) || nb.includes(na))
            return 0.95;
    }
    const ta = tokenize(a);
    const tb = tokenize(b);
    if (ta.size === 0 || tb.size === 0)
        return 0;
    let inter = 0;
    for (const t of ta)
        if (tb.has(t))
            inter++;
    const union = ta.size + tb.size - inter;
    const jaccard = union > 0 ? inter / union : 0;
    if (na.length <= 200 && (na.includes(nb) || nb.includes(na))) {
        return Math.max(jaccard, 0.75);
    }
    return jaccard;
}
/**
 * Map an arbitrary modelId (e.g. "anthropic/claude-opus-4.6") to its family.
 * Accepts already-lowercase input.
 */
function baselineModelIdToFamily(modelId) {
    const m = modelId.toLowerCase();
    if (m.startsWith("anthropic/") || m.includes("claude"))
        return "anthropic";
    if (m.startsWith("openai/") || m.includes("gpt"))
        return "openai";
    if (m.startsWith("google/") || m.includes("gemini"))
        return "google";
    if (m.startsWith("z-ai/") || m.includes("glm"))
        return "zhipu";
    if (m.includes("qwen"))
        return "qwen";
    if (m.includes("deepseek"))
        return "deepseek";
    if (m.includes("mistral"))
        return "mistral";
    if (m.includes("llama"))
        return "meta";
    return "unknown";
}
/**
 * Winner-take-all voting: for each probe, find the family whose baselines
 * best match the observed response. Only cast a vote when the margin over
 * runner-up family exceeds `marginThreshold` (non-decisive probes are
 * skipped — they add noise otherwise).
 *
 * Uses MEAN-within-family similarity to avoid the family-size bias where
 * families with more baseline models have a higher "max" by chance.
 *
 * Output: { [family]: 0..1 } where the value is the fraction of decisive
 * probes this family won.
 */
function computeBaselineMatchVotes(observed, baselines, opts = {}) {
    var _a, _b;
    const minProbes = opts.minProbes ?? 3;
    const marginThreshold = opts.marginThreshold ?? 0.10;
    const useMax = opts.useMax ?? false;
    const byProbe = {};
    for (const b of baselines) {
        if (!b.responseText || !b.responseText.trim())
            continue;
        const fam = baselineModelIdToFamily(b.modelId);
        if (fam === "unknown")
            continue;
        (byProbe[_a = b.probeId] ?? (byProbe[_a] = {}));
        ((_b = byProbe[b.probeId])[fam] ?? (_b[fam] = [])).push(b.responseText);
    }
    const familyVotes = {};
    let decisiveProbes = 0;
    for (const [probeId, obs] of Object.entries(observed)) {
        const probeFamilies = byProbe[probeId];
        if (!probeFamilies)
            continue;
        if (!obs || !obs.trim())
            continue;
        const families = Object.keys(probeFamilies);
        if (families.length < 2)
            continue;
        const famScores = [];
        for (const fam of families) {
            const refs = probeFamilies[fam];
            const sims = refs.map(ref => responseSimilarity(obs, ref));
            const score = useMax
                ? Math.max(...sims, 0)
                : sims.reduce((a, b) => a + b, 0) / sims.length;
            famScores.push({ fam, score });
        }
        famScores.sort((a, b) => b.score - a.score);
        const winner = famScores[0];
        const runnerUp = famScores[1] ?? { fam: "", score: 0 };
        const margin = winner.score - runnerUp.score;
        if (margin >= marginThreshold && winner.score >= 0.3) {
            familyVotes[winner.fam] = (familyVotes[winner.fam] ?? 0) + 1;
            decisiveProbes++;
        }
    }
    if (decisiveProbes < minProbes)
        return {};
    const votes = {};
    for (const [fam, count] of Object.entries(familyVotes)) {
        votes[fam] = Math.round((count / decisiveProbes) * 1000) / 1000;
    }
    return votes;
}
//# sourceMappingURL=baseline-match-votes.js.map