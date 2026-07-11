"use strict";
// lib/sub-model/classifier-v4.ts — V4 ensemble fuse.
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
exports.FAMILY_VETO_CONFIDENCE = exports.V3F_TIEBREAKER_GAP_MAX = exports.V3F_TIEBREAKER_THRESHOLD = exports.V4_GLOBAL_CONFIDENCE_THRESHOLD = void 0;
exports.fuseToV4 = fuseToV4;
const sub_model_detection_config_1 = require("./sub-model-detection-config");
/** Intentionally LOWER than V3's own 0.60 gate (classifier-v3.ts confidenceThreshold):
 *  V4 only reaches this check after family corroboration from multiple signals
 *  (fuse rules 1-4), so a 0.55 sub-model score is safer here than a raw V3 0.55.
 *  Do NOT unify to 0.60 without re-running the v3e-backtest 36-spoof suite —
 *  see docs/reports/2026-05-10-v4-attack-accuracy.md. */
exports.V4_GLOBAL_CONFIDENCE_THRESHOLD = 0.55;
exports.V3F_TIEBREAKER_THRESHOLD = 0.70;
exports.V3F_TIEBREAKER_GAP_MAX = 0.05;
/** Models whose V3 fingerprint overlaps so completely that V3F's isRoundRate
 *  signal is the only reliable discriminator. See v3f-consolidated-report §2.2. */
const V3F_AMBIGUOUS_PAIR = new Set(["openai/gpt-5.5", "openai/gpt-5.3-codex"]);
/** Min family-classifier confidence to veto a contradicting empty-refusal pick.
 *  0.6: a non-anthropic TOP family at ≥0.6 is a clear "not Claude" signal, since
 *  genuine Fable always has anthropic as its top family (so it never contradicts
 *  at any threshold). Catches borderline cross-family relays (glm/google 0.67). */
exports.FAMILY_VETO_CONFIDENCE = 0.6;
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
function fuseToV4(v3Scoped, v3Global, ikp, _claimedFamily, v3f, emptyRefusal, v3eTop, behavioralFamily) {
    const scopedTop = v3Scoped?.subModelMatch ?? null;
    const scopedAbstain = !!(v3Scoped?.abstained || !scopedTop);
    const globalTop = v3Global?.subModelMatch ?? null;
    const globalAbstain = !!(v3Global?.abstained || !globalTop);
    const globalConfident = !!(globalTop && globalTop.score >= exports.V4_GLOBAL_CONFIDENCE_THRESHOLD);
    const ikpTop = ikp?.top ?? null;
    const crossFamilyDisagreement = !!(scopedTop && globalTop && scopedTop.family !== globalTop.family);
    // Abstain-path guard: when the fuse abstains but a confident behavioural
    // family exists, strip any cross-family V3-Global noise from `candidates` so
    // display surfaces never surface e.g. a stray glm/gemini as the "detected
    // family / sub-model". Confident picks are already family-consistent, so this
    // only touches abstained outputs. May leave `candidates` empty — that is
    // correct (family-only verdict).
    function scopeAbstainCandidates(out) {
        if (!out.abstained)
            return out;
        const fam = behavioralFamily && behavioralFamily.confidence >= exports.FAMILY_VETO_CONFIDENCE
            ? behavioralFamily.family
            : null;
        if (!fam)
            return out;
        const scoped = out.candidates.filter((c) => c.family === fam);
        return { ...out, candidates: scoped };
    }
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
    // Helper for V3-Global-sourced picks: tiebreaker + FAMILY CONSISTENCY guard.
    //
    // The behavioural family classifier is the reliable signal. Whenever the fused
    // sub-model pick CONTRADICTS a confident behavioural family, it is V3-Global
    // noise — e.g. a foreign gpt-5.5 that blanks the refusal probe gets scored
    // claude-fable-5 (anthropic) while family=openai 98% (runId cmqch9zci0…), or a
    // blank-heavy anthropic-98% endpoint gets a stray google/gemini global pick.
    // In both cases, drop to the best candidate WITHIN the behavioural family
    // (also excluding suspended/disabled detection targets); abstain (family-only)
    // if none. Never assert a sub-model from a family the classifier rejects.
    function finalize(out) {
        const t = withTiebreaker(out);
        if (!t.subModelMatch)
            return t;
        const familyContradicts = !!behavioralFamily &&
            behavioralFamily.confidence >= exports.FAMILY_VETO_CONFIDENCE &&
            behavioralFamily.family !== t.subModelMatch.family;
        if (!familyContradicts)
            return t;
        const fam = behavioralFamily?.family;
        const excluded = (id) => (0, sub_model_detection_config_1.isDetectionDisabled)(id) || !!emptyRefusal?.isEmptyRefusalModel(id);
        const candidates = [];
        if (v3eTop && !excluded(v3eTop.modelId))
            candidates.push({ m: v3eTop, src: "v3e" });
        if (v3f && !excluded(v3f.modelId))
            candidates.push({ m: v3f, src: "v3f" });
        for (const c of t.candidates)
            if (!excluded(c.modelId))
                candidates.push({ m: c, src: "v3-global" });
        // Stay within the confident behavioural family — never cross on global noise.
        const pool = fam ? candidates.filter((p) => p.m.family === fam) : candidates;
        const choose = pool.sort((a, b) => b.m.score - a.m.score)[0];
        if (choose) {
            return {
                subModelMatch: choose.m,
                candidates: t.candidates.length ? t.candidates : [choose.m],
                abstained: false,
                fuseSource: choose.src,
                crossFamilyDisagreement: true,
            };
        }
        // No in-family / detectable candidate to fall back to — abstain (family-only).
        return scopeAbstainCandidates({
            subModelMatch: null,
            candidates: t.candidates,
            abstained: true,
            fuseSource: "abstain",
            crossFamilyDisagreement: true,
        });
    }
    // Rule 1 & 2: V3 Scoped hit
    if (scopedTop && !scopedAbstain) {
        if (globalConfident && globalTop.family !== scopedTop.family) {
            // Rule 2: cross-family override
            return finalize({
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
    // Rule 2.5: native empty-refusal corroboration (Claude 5 / Mythos).
    // A structured empty refusal is unique to Claude 5. When the observation has
    // one AND V3 Global's top candidate is a baseline flagged nativeEmptyRefusal,
    // trust the feature classifier over a contradictory IKP-only pick (IKP's
    // codegen probes are blind to refusal behaviour — runId cmq7mlmma…: 4router.net
    // served fable-5 but IKP mislabelled it opus-4.8). Tightly gated:
    //   • only reached when V3 Scoped abstained (confident scoped wins above), and
    //   • only ever selects the flagged model, and only when V3 Global already
    //     ranked it #1 — so it cannot promote a non-Claude-5 model.
    if (emptyRefusal?.confirmed) {
        const gTop = globalTop ?? v3Global?.candidates?.[0] ?? null;
        if (gTop && emptyRefusal.isEmptyRefusalModel(gTop.modelId)) {
            return finalize({
                subModelMatch: gTop,
                candidates: v3Global?.candidates ?? [gTop],
                abstained: false,
                fuseSource: "v3-global",
                crossFamilyDisagreement: !!(scopedTop && gTop.family !== scopedTop.family),
            });
        }
    }
    // Rule 3: V3 Scoped abstain + V3 Global confident hit
    if (globalConfident) {
        return finalize({
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
            return finalize({
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
        return scopeAbstainCandidates({
            subModelMatch: null,
            candidates: v3Global?.candidates ?? [],
            abstained: true,
            fuseSource: "abstain",
            crossFamilyDisagreement: true,
        });
    }
    // Rule 4: V3 Scoped abstain + V3 Global abstain/low-conf + IKP hit (same family or no familyImplied)
    // Routed through finalize() so a confident behavioural family vetoes a cross-family IKP
    // pick — IKP's 5 obscure-fact probes are blind to family, so on a deepseek endpoint the
    // Chinese-axis override (deepseek 0.99) must override an anthropic IKP guess rather than
    // letting it surface as a false "已替換" sub-model (dev runId cmr1w7ts…).
    if (ikpTop) {
        return finalize({
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
        });
    }
    // Rule 5: all abstain
    return scopeAbstainCandidates({
        subModelMatch: null,
        candidates: [],
        abstained: true,
        fuseSource: "abstain",
        crossFamilyDisagreement: false,
    });
}
//# sourceMappingURL=sub-model-classifier-v4.js.map