"use strict";
// src/sub-model-classifier-v4.ts — V4 ensemble fuse.
//
// V4 = V3 Scoped + V3 Global + IKP, fused via 4-tier priority (D''').
// Replaces the V3F UI panel position (V3F still computed but no longer the
// primary spoof signal). Rationale: V3 Global has 27-model baseline coverage
// including qwen / gemini / glm — far broader than IKP's 9 models.
//
// Fusion rules (in priority order):
//   1. V3 Scoped hit + V3 Global same family → keep V3 Scoped
//        (protects honest claims from being downgraded by IKP/Global noise;
//         preserves V3F-style intra-family sibling discrimination)
//   2. V3 Scoped hit + V3 Global high-confidence cross-family → use V3 Global
//        (catches cross-family spoof where V3 Scoped was deceived by claim)
//   3. V3 Scoped abstain + V3 Global hit → use V3 Global
//        (cross-family rescue: qwen claiming opus-4.7 etc.)
//   4. V3 Scoped abstain + V3 Global abstain + IKP hit → use IKP
//        (last-resort defense in depth)
//   5. otherwise → abstain
//
// Validated against tmp/v3e-backtest 36 spoof runs + claim=gpt-5.5 simulation.
// See docs/reports/2026-05-10-v4-attack-accuracy.md.
Object.defineProperty(exports, "__esModule", { value: true });
exports.V3F_TIEBREAKER_GAP_MAX = exports.V3F_TIEBREAKER_THRESHOLD = exports.V4_GLOBAL_CONFIDENCE_THRESHOLD = void 0;
exports.fuseToV4 = fuseToV4;
exports.V4_GLOBAL_CONFIDENCE_THRESHOLD = 0.55;
exports.V3F_TIEBREAKER_THRESHOLD = 0.70;
exports.V3F_TIEBREAKER_GAP_MAX = 0.05;
/** Models whose V3 fingerprint overlaps so completely that V3F's isRoundRate
 *  signal is the only reliable discriminator. See v3f-consolidated-report §2.2. */
const V3F_AMBIGUOUS_PAIR = new Set(["openai/gpt-5.5", "openai/gpt-5.3-codex"]);
/**
 * Fuse V3 Scoped, V3 Global, IKP, and V3F into a single V4C verdict.
 * `claimedFamily` is informational only — V4 does not gate on it.
 *
 * @param v3f Optional V3F top match. Used as tiebreaker for gpt-5.5 vs
 *            gpt-5.3-codex (V3 features 100% overlap on these two; V3F's
 *            isRoundRate signal is the only V3-family discriminator).
 */
function applyV3FTiebreaker(picked, v3f) {
    const fallback = { overridden: false, top: picked.top, candidates: picked.candidates };
    if (!v3f || v3f.score < exports.V3F_TIEBREAKER_THRESHOLD || v3f.family !== "openai")
        return fallback;
    if (picked.top.family !== "openai")
        return fallback;
    const top2 = picked.candidates[1];
    if (!top2)
        return fallback;
    const gap = picked.top.score - top2.score;
    if (gap >= exports.V3F_TIEBREAKER_GAP_MAX)
        return fallback;
    // Only fire when the tie involves the gpt-5.5 / gpt-5.3-codex feature-overlap pair.
    const involvesAmbiguous = V3F_AMBIGUOUS_PAIR.has(picked.top.modelId) || V3F_AMBIGUOUS_PAIR.has(top2.modelId);
    if (!involvesAmbiguous)
        return fallback;
    // When V3F arbitrates this pair, V3's runner-up scores are MEANINGLESS for
    // ranking — V3's features are 100% overlapping on this pair, so its
    // "98% codex" reading is just "features look similar to codex too",
    // not a vote for codex. Returning only V3F as the candidate matches the
    // probe-report headline 結論 and avoids the misleading "#2 has higher
    // score than #1" visual the user reported on 2026-05-13.
    return { overridden: true, top: v3f, candidates: [v3f] };
}
function fuseToV4(v3Scoped, v3Global, ikp, _claimedFamily, v3f) {
    const scopedTop = v3Scoped?.subModelMatch ?? null;
    const scopedAbstain = !!(v3Scoped?.abstained || !scopedTop);
    const globalTop = v3Global?.subModelMatch ?? null;
    const globalAbstain = !!(v3Global?.abstained || !globalTop);
    const globalConfident = !!(globalTop && globalTop.score >= exports.V4_GLOBAL_CONFIDENCE_THRESHOLD);
    const ikpTop = ikp?.top ?? null;
    const crossFamilyDisagreement = !!(scopedTop && globalTop && scopedTop.family !== globalTop.family);
    // Helper: wrap any verdict with V3F tiebreaker (rule 1.5).
    // Only fires for openai gpt-5.5 ↔ gpt-5.3-codex feature-overlap pair.
    function withTiebreaker(out) {
        if (!out.subModelMatch)
            return out;
        const tb = applyV3FTiebreaker({ top: out.subModelMatch, candidates: out.candidates }, v3f);
        if (!tb.overridden)
            return out;
        return { ...out, subModelMatch: tb.top, candidates: tb.candidates, fuseSource: "v3f" };
    }
    // Rule 1 & 2: V3 Scoped hit
    if (scopedTop && !scopedAbstain) {
        if (globalConfident && globalTop.family !== scopedTop.family) {
            // Rule 2: cross-family override
            return withTiebreaker({
                subModelMatch: globalTop,
                candidates: v3Global?.candidates ?? [globalTop],
                abstained: false,
                fuseSource: "v3-global",
                crossFamilyDisagreement: true,
            });
        }
        // Rule 1: keep scoped (same family or low-conf disagreement)
        return withTiebreaker({
            subModelMatch: scopedTop,
            candidates: v3Scoped.candidates,
            abstained: false,
            fuseSource: "v3-scoped",
            crossFamilyDisagreement,
        });
    }
    // Rule 3: V3 Scoped abstain + V3 Global confident hit
    if (globalConfident) {
        return withTiebreaker({
            subModelMatch: globalTop,
            candidates: v3Global?.candidates ?? [globalTop],
            abstained: false,
            fuseSource: "v3-global",
            crossFamilyDisagreement: false,
        });
    }
    // Rule 3.5: V3 Global abstained at sub-model level but its top candidates
    // strongly point at one family (e.g. deepseek-chat-v3.1 0.93 vs deepseek-v3.2
    // 0.90 — both deepseek, gap below abstain threshold). Promote V3 Global's
    // top-1 if it has high score AND agrees with V3.familyImplied (or V3.familyImplied
    // is null but ≥2 of top-3 share family).
    const familyImplied = v3Scoped?.familyImplied ?? null;
    if (v3Global?.candidates && v3Global.candidates.length > 0) {
        const gTop = v3Global.candidates[0];
        const gTop2 = v3Global.candidates[1];
        const familyAgreeWith = familyImplied
            ? (c) => c.family === familyImplied
            : null;
        const familyConfident = gTop.score >= 0.70 &&
            ((familyAgreeWith && familyAgreeWith(gTop)) ||
                (!familyImplied && gTop2 && gTop.family === gTop2.family && gTop2.score >= 0.65));
        if (familyConfident) {
            return withTiebreaker({
                subModelMatch: gTop,
                candidates: v3Global.candidates,
                abstained: false,
                fuseSource: "v3-global",
                crossFamilyDisagreement: !!(scopedTop && gTop.family !== scopedTop.family),
            });
        }
    }
    // Rule 4 guard: when V3 Scoped's familyImplied disagrees with IKP top family,
    // distrust IKP (5 IKP probes are too sparse for cross-family discrimination).
    // Pick V3 Global's best candidate within familyImplied; abstain if none.
    if (familyImplied && ikpTop && ikpTop.family !== familyImplied) {
        const fallback = v3Global?.candidates.find((c) => c.family === familyImplied);
        if (fallback) {
            return {
                subModelMatch: fallback,
                candidates: v3Global.candidates,
                abstained: false,
                fuseSource: "v3-global",
                crossFamilyDisagreement: false,
            };
        }
        return {
            subModelMatch: null,
            candidates: v3Global?.candidates ?? [],
            abstained: true,
            fuseSource: "abstain",
            crossFamilyDisagreement: true,
        };
    }
    // Rule 4: V3 Scoped abstain + V3 Global abstain/low-conf + IKP hit (same family or no familyImplied)
    if (ikpTop) {
        return {
            subModelMatch: {
                modelId: ikpTop.modelId,
                displayName: ikpTop.displayName,
                family: ikpTop.family,
                score: ikpTop.score,
            },
            candidates: ikp.candidates.map((c) => ({
                modelId: c.modelId,
                displayName: c.displayName,
                family: c.family,
                score: c.score,
            })),
            abstained: false,
            fuseSource: "ikp",
            crossFamilyDisagreement: false,
        };
    }
    // Rule 5: all abstain
    return {
        subModelMatch: null,
        candidates: [],
        abstained: true,
        fuseSource: "abstain",
        crossFamilyDisagreement: false,
    };
}
//# sourceMappingURL=sub-model-classifier-v4.js.map