"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AMBIGUOUS_DOWNGRADE_MAX_BEHAVIOR_SCORE = exports.AMBIGUOUS_DOWNGRADE_MIN_FAMILY_CONFIDENCE = exports.COVERAGE_GAP_DEMOTE_CONFIDENCE = exports.COVERAGE_GAP_FORCE_FAMILY_ONLY = exports.CLEAN_MATCH_MIN_SCORE = exports.V3_HIGH_CONFIDENCE = void 0;
exports.resolveV3HVerdictPatch = resolveV3HVerdictPatch;
exports.recomputeVerdictAfterV3HOverride = recomputeVerdictAfterV3HOverride;
exports.computeVerdict = computeVerdict;
const model_id_normalize_1 = require("./model-id-normalize");
/** V3 score at/above this is treated as a confident sub-model call. Below
 * this, we do not assert sub-model match or mismatch — the top pick is only
 * ~1% ahead of the runner-up in tie cases, which is not enough to claim
 * anything. Surfaces to UI as "信心不足，僅供參考". */
exports.V3_HIGH_CONFIDENCE = 0.80;
/** Minimum signal score required for "complete match" (clean_match) verdict.
 *  Below this, family unanimity alone isn't strong enough to assert sub-model
 *  identity — falls back to clean_match_family_only. (2026-04-26: a 59%/59%
 *  surface+behavior pair was previously granted ✓ 相符, which over-promised.) */
exports.CLEAN_MATCH_MIN_SCORE = 0.65;
/** Coverage gap (errors / total) above which the verdict is forced to
 *  family_only with low confidence regardless of signal strength. */
exports.COVERAGE_GAP_FORCE_FAMILY_ONLY = 0.15;
/** Coverage gap above which confidence is demoted by one band even if signals
 *  are otherwise strong. */
exports.COVERAGE_GAP_DEMOTE_CONFIDENCE = 0.05;
/** Normalize a model ID to a bare lowercase name for sub-model comparison.
 * Handles: dash↔dot version (`4-6` ↔ `4.6`), `-thinking` suffix, `[...]`
 * bracket prefix, and `org/` prefix. Mirrors lib/probe-model-dropdown rules
 * but restricted to the bits relevant for sub-model equality. */
function bareName(modelId) {
    let s = modelId.toLowerCase();
    if (s.includes("/"))
        s = s.split("/").slice(1).join("/");
    s = s.replace(/^\[.*?\]/, "");
    s = s.replace(/-thinking$/, "");
    s = s.replace(/(\d+)-(\d+)/g, "$1.$2");
    return s;
}
/** Recompute the sub-model dimension of an existing clean-family verdict after a V3H
 *  authoritative override replaced V4's sub-model pick. The FAMILY dimension is untouched
 *  (V3H is same-family and only fires under a confident confirmed family). Only the
 *  sub-model verdict flips:
 *   • V3H top === claim → the family+submodel match is clean → `clean_match`.
 *   • V3H top !== claim → a same-family substitution is asserted → `clean_match_submodel_mismatch`.
 *  A no-op for verdicts that were not in the clean-family band (spoof/plain_mismatch/etc.) —
 *  V3H never contradicts those, and we don't want to launder a spoof into a clean match.
 *  `overrideModelId` is the V3H top; `overrideDisplayName` its readable name. */
/** The V3H post-run verdict-patch decision, extracted pure (2026-07-10).
 *
 *  Root cause of the dead path it replaces: the route builds `patch = { ...ia0, v3g, v3h }`,
 *  so `patch.verdict` already holds the PRE-V3H verdict from the spread — a `!patch.verdict`
 *  guard on the strong-pass assert (b621e1cb) was therefore never true, and a strong-pass
 *  V3H that AGREED with the fuse could never upgrade family_only → clean_match (dev repro:
 *  gpt-5.6-terra 2026-07-10). This helper takes what the guard actually meant — "did the
 *  PROMOTION branch set a verdict?" — as an explicit argument.
 *
 *  Returns the verdict to store, or null when nothing should change:
 *   • `promoted` non-null (promotion branch already recomputed) → return it unchanged.
 *   • V3H strong-pass with an in-family top → recompute vs the CLAIM; return it only
 *     when the status actually changes (avoids a no-op reasoning line).
 *   • anything else → null. */
/** Family-fusion confidence required before an `ambiguous` verdict may be downgraded. */
exports.AMBIGUOUS_DOWNGRADE_MIN_FAMILY_CONFIDENCE = 0.9;
/** A diverging behavior signal AT OR ABOVE this is a real disagreement — never downgrade.
 *  Below it, the signal was already too weak for computeVerdict's spoof bar (0.70) and too
 *  weak for CLEAN_MATCH_MIN_SCORE; it lost to a confident family fusion + a strong-pass V3H. */
exports.AMBIGUOUS_DOWNGRADE_MAX_BEHAVIOR_SCORE = exports.CLEAN_MATCH_MIN_SCORE;
// strictOpts is optional for backward compatibility; without it ambiguous verdicts remain untouched.
function resolveV3HVerdictPatch(prev, promoted, v3h, family, claimedModel, overrideDisplayName, strictOpts) {
    if (promoted)
        return promoted;
    if (!v3h.strongPass || !v3h.topModel || !family)
        return null;
    const topFamily = v3h.topModel.split("/")[0] ?? "";
    if ((0, model_id_normalize_1.canonicalFamily)(topFamily) !== (0, model_id_normalize_1.canonicalFamily)(family))
        return null;
    // STRICT ambiguous downgrade. `ambiguous` means computeVerdict saw a split vote it could
    // not resolve — usually a weakly-diverging behavior column (< the 0.70 spoof bar). When the
    // family fusion is confident AND that divergence is too weak to be a spoof call AND V3H
    // strong-passes an in-family sub-model, the split is stylistic noise, not an attack: treat
    // the run as clean-family so the V3H pick can settle the sub-model dimension. A STRONG
    // divergence (>= 0.65) or a shaky family keeps `ambiguous` — the spoof paths stay intact.
    // spoof_* / plain_mismatch are never touched here (recomputeVerdictAfterV3HOverride also
    // refuses them; this guard keeps the intent explicit at the call site).
    let base = prev;
    if (prev?.status === "ambiguous") {
        if (!strictOpts ||
            strictOpts.familyConfidence < exports.AMBIGUOUS_DOWNGRADE_MIN_FAMILY_CONFIDENCE ||
            strictOpts.divergingBehaviorScore >= exports.AMBIGUOUS_DOWNGRADE_MAX_BEHAVIOR_SCORE) {
            return null;
        }
        base = {
            ...prev,
            status: "clean_match_family_only",
            trueFamily: family,
            reasoning: [
                ...prev.reasoning,
                `ambiguous downgraded: family ${family} confirmed @${Math.round(strictOpts.familyConfidence * 100)}% and the diverging behavior signal (${Math.round(strictOpts.divergingBehaviorScore * 100)}%) is below the ${Math.round(exports.AMBIGUOUS_DOWNGRADE_MAX_BEHAVIOR_SCORE * 100)}% bar — stylistic, not spoof; V3H strong-pass settles the sub-model`,
            ],
        };
    }
    const recomputed = recomputeVerdictAfterV3HOverride(base, v3h.topModel, overrideDisplayName, claimedModel ?? undefined);
    return recomputed.status !== prev?.status ? recomputed : null;
}
function recomputeVerdictAfterV3HOverride(prev, overrideModelId, overrideDisplayName, claimedModel) {
    const base = prev ?? {
        status: "clean_match_family_only",
        trueFamily: overrideModelId.split("/")[0] ?? null,
        trueModel: null,
        spoofMethod: null,
        confidence: "medium",
        reasoning: [],
    };
    const cleanBand = base.status === "clean_match" ||
        base.status === "clean_match_family_only" ||
        base.status === "clean_match_submodel_mismatch";
    if (!cleanBand)
        return base; // don't rewrite spoof / plain_mismatch / ambiguous
    // bareName handles dash↔dot + -thinking, but NOT dated version tags
    // (claude-opus-4-5-20251101). modelIdsMatch strips those — without it an honest
    // date-suffixed claim would be asserted as 已替換 the moment V3H strong-passes.
    const claimMatches = claimedModel
        ? bareName(overrideModelId) === bareName(claimedModel) || (0, model_id_normalize_1.modelIdsMatch)(overrideModelId, claimedModel)
        : false;
    const status = claimMatches ? "clean_match" : "clean_match_submodel_mismatch";
    return {
        ...base,
        status,
        trueModel: overrideDisplayName,
        reasoning: [
            ...base.reasoning,
            `v3h override: sub-model=${bareName(overrideModelId)}${claimMatches ? " (= claim → clean_match)" : ` ≠ claim=${claimedModel ? bareName(claimedModel) : "?"} → submodel_mismatch`}`,
        ],
    };
}
function computeVerdict(input) {
    const { claimedFamily, surface, behavior, v3, v3f } = input;
    if (!surface && !behavior && !v3) {
        return {
            status: "insufficient_data", trueFamily: null, trueModel: null,
            spoofMethod: null, confidence: "low", reasoning: ["no fingerprints available"],
        };
    }
    // Collect "votes" from the three signals that have usable confidence.
    const USABLE_SURFACE = 0.30;
    const USABLE_BEHAVIOR = 0.40;
    const USABLE_V3 = 0.50;
    const signals = [];
    if (surface && surface.score >= USABLE_SURFACE) {
        signals.push({ id: "①", label: "surface", family: surface.family, score: surface.score });
    }
    if (behavior && behavior.score >= USABLE_BEHAVIOR) {
        signals.push({ id: "②", label: "behavior", family: behavior.family, score: behavior.score });
    }
    if (v3 && v3.score >= USABLE_V3) {
        signals.push({ id: "③", label: "v3", family: v3.family, score: v3.score });
    }
    const reasoning = [];
    for (const s of signals) {
        const tag = claimedFamily == null
            ? ""
            : s.family === claimedFamily ? "  ← matches claim" : "  ← diverges from claim";
        reasoning.push(`${s.id} ${s.label}: ${s.family} (${Math.round(s.score * 100)}%)${tag}`);
    }
    // Unanimous (≥2 signals agree on same family): clean_match or plain_mismatch.
    if (signals.length >= 2) {
        const first = signals[0].family;
        const unanimous = signals.every(s => s.family === first);
        if (unanimous) {
            const claimAgrees = claimedFamily == null || claimedFamily === first;
            const trueModel = v3 && v3.family === first ? v3.displayName : null;
            if (claimAgrees) {
                // Helper: compute coverage ratio if supplied.
                const coverageGap = input.coverage && input.coverage.total > 0
                    ? input.coverage.errors / input.coverage.total
                    : 0;
                // Invariant: signals.length >= 2 here, enforced by the outer `if`
                // at line ~109 — Math.min(...[]) would return Infinity, which would
                // silently route the empty case away from family_only. Don't relax.
                const minScore = Math.min(...signals.map(s => s.score));
                // ── Sub-model mismatch detection (UNCHANGED from yesterday) ─────
                // Family matches but V3 points to a different sub-model than claim.
                // Triggers at v3.score ≥ 0.60.
                if (v3 &&
                    v3.family === first &&
                    v3.score >= 0.60 &&
                    input.claimedModel &&
                    bareName(v3.modelId) !== bareName(input.claimedModel) &&
                    // Only assert a substitution when the sibling pair is actually
                    // separable. For clusters with no V3H border baseline (e.g. GLM
                    // 5/5.1/5.2) V3 routinely near-ties and a "different sibling" call is
                    // noise — suppress the accusation and let family_only fire below.
                    input.subModelSeparable !== false) {
                    const isHighConf = v3.score >= exports.V3_HIGH_CONFIDENCE;
                    reasoning.push(isHighConf
                        ? `sub-model mismatch: claim=${bareName(input.claimedModel)} v3=${bareName(v3.modelId)} @${Math.round(v3.score * 100)}%`
                        : `sub-model suspect: claim=${bareName(input.claimedModel)} v3=${bareName(v3.modelId)} @${Math.round(v3.score * 100)}% (low confidence — possibly real ${v3.displayName} with system-prompt-modified style)`);
                    return {
                        status: "clean_match_submodel_mismatch",
                        trueFamily: first,
                        trueModel: v3 && v3.family === first ? v3.displayName : null,
                        spoofMethod: null,
                        confidence: isHighConf
                            ? (signals.length >= 3 ? "high" : "medium")
                            : "low",
                        reasoning,
                    };
                }
                // ── NEW (2026-04-26): family_only branch ────────────────────────
                // Force family_only when ANY of:
                //   • V3 abstained (no usable sub-model signal)
                //   • Min signal < CLEAN_MATCH_MIN_SCORE (0.65)
                //   • Coverage gap > COVERAGE_GAP_FORCE_FAMILY_ONLY (0.15)
                const v3Confirms = v3 != null
                    && v3.family === first
                    && (input.claimedModel ? bareName(v3.modelId) === bareName(input.claimedModel) : true);
                const v3Abstained = v3 == null;
                const signalsWeak = minScore < exports.CLEAN_MATCH_MIN_SCORE;
                const coverageHigh = coverageGap > exports.COVERAGE_GAP_FORCE_FAMILY_ONLY;
                const coverageMid = coverageGap > exports.COVERAGE_GAP_DEMOTE_CONFIDENCE;
                // V3 confidently points to a DIFFERENT sibling than claim, but the
                // cluster has no V3H separator (subModelSeparable === false) so we
                // suppressed the substitution assertion above. Claim is therefore NOT
                // confirmed → this must land in family_only, never clean_match.
                const subModelUnverifiable = v3 != null && v3.family === first && v3.score >= 0.60
                    && input.claimedModel != null
                    && bareName(v3.modelId) !== bareName(input.claimedModel)
                    && input.subModelSeparable === false;
                if (subModelUnverifiable) {
                    reasoning.push(`sub-model mismatch suppressed: cluster has no V3H separator — V3 near-ties on siblings, not asserting substitution (claim=${bareName(input.claimedModel)} v3=${bareName(v3.modelId)} @${Math.round(v3.score * 100)}%)`);
                }
                if (v3Abstained || signalsWeak || coverageHigh || subModelUnverifiable) {
                    // Compute confidence band for family_only:
                    //   high   = all signals ≥ 0.80 AND coverage ≤ 0.05 AND NOT coverageHigh
                    //   medium = all signals ≥ 0.65 AND coverage ≤ 0.15
                    //   low    = anything else
                    const confidence = coverageHigh || signalsWeak ? "low"
                        : minScore >= 0.80 && !coverageMid ? "high"
                            : "medium";
                    if (v3Abstained) {
                        reasoning.push(`family_only: V3 abstained (no usable sub-model signal)`);
                    }
                    if (signalsWeak) {
                        reasoning.push(`family_only: min signal ${Math.round(minScore * 100)}% < ${Math.round(exports.CLEAN_MATCH_MIN_SCORE * 100)}% threshold`);
                    }
                    if (coverageHigh) {
                        reasoning.push(`family_only: coverage gap ${Math.round(coverageGap * 100)}% > ${Math.round(exports.COVERAGE_GAP_FORCE_FAMILY_ONLY * 100)}% threshold`);
                    }
                    return {
                        status: "clean_match_family_only",
                        trueFamily: first,
                        trueModel: v3 && v3.family === first ? v3.displayName : null,
                        spoofMethod: null,
                        confidence,
                        reasoning,
                    };
                }
                // ── clean_match (the original full-match path) ──────────────────
                // Reach here only when: V3 confirms sub-model match, all signals ≥ 0.65,
                // coverage gap ≤ 0.15. Confidence demoted by one band when coverage > 0.05.
                const baseConfidence = signals.length >= 3 ? "high" : "medium";
                const finalConfidence = coverageMid
                    ? (baseConfidence === "high" ? "medium" : "low")
                    : baseConfidence;
                return {
                    status: "clean_match",
                    trueFamily: first,
                    trueModel: v3Confirms && v3 ? v3.displayName : null,
                    spoofMethod: null,
                    confidence: finalConfidence,
                    reasoning,
                };
            }
            return {
                status: "plain_mismatch", trueFamily: first, trueModel,
                spoofMethod: null, confidence: signals.length >= 3 ? "high" : "medium",
                reasoning,
            };
        }
    }
    // Split vote: signals disagree. Apply "claim is the 4th signal" rule.
    if (claimedFamily && signals.length >= 2) {
        const diverging = signals.filter(s => s.family !== claimedFamily);
        const matching = signals.filter(s => s.family === claimedFamily);
        // Special case: only behavior diverges. Classic selfclaim-forgery —
        // surface and v3 can be manipulated via prompt (self-claim / formatting /
        // speed), but ling_* factual probes are hard to fake. When behavior is
        // confident enough (>= 0.70), trust it as the truth signal.
        if (diverging.length === 1 &&
            diverging[0].label === "behavior" &&
            diverging[0].score >= 0.70) {
            // Fix B (2026-04-25): when V3 confidently agrees with claim at the
            // V3_HIGH_CONFIDENCE bar, AND V3F (if available) also agrees, the
            // behavior signal is likely a stylistic similarity (e.g. refusal
            // phrasing convergence between OpenAI and Anthropic) rather than
            // an actual spoof. Demote to ambiguous instead of trusting behavior.
            const v3VetoesSpoof = v3 != null && v3.family === claimedFamily && v3.score >= exports.V3_HIGH_CONFIDENCE;
            const v3fOk = v3f == null ? true : (v3f.family === claimedFamily && v3f.score >= exports.V3_HIGH_CONFIDENCE);
            if (v3VetoesSpoof && v3fOk) {
                return {
                    status: "ambiguous",
                    trueFamily: null,
                    trueModel: null,
                    spoofMethod: null,
                    confidence: "low",
                    reasoning: [
                        ...reasoning,
                        `↳ v3+v3f both ≥${Math.round(exports.V3_HIGH_CONFIDENCE * 100)}% match claim → behavior-alone divergence treated as stylistic, not spoof`,
                    ],
                };
            }
            return {
                status: "spoof_selfclaim_forged",
                trueFamily: diverging[0].family,
                trueModel: null,
                spoofMethod: "selfclaim_forged",
                confidence: "medium",
                reasoning,
            };
        }
        // Special case: only surface diverges (behavior + any other signal match claim).
        // The behavior column is attack-resistant; if it agrees with claim but surface
        // doesn't, the surface self-claim is lying → behavior-induced spoof.
        if (diverging.length === 1 &&
            diverging[0].label === "surface" &&
            diverging[0].score >= 0.50) {
            return {
                status: "spoof_behavior_induced",
                trueFamily: diverging[0].family,
                trueModel: null,
                spoofMethod: "behavior_induced",
                confidence: "medium",
                reasoning,
            };
        }
        if (diverging.length >= 2) {
            const firstDiv = diverging[0].family;
            if (diverging.every(s => s.family === firstDiv)) {
                const divergedLabels = new Set(diverging.map(s => s.label));
                const behaviorDiverged = divergedLabels.has("behavior");
                const spoofMethod = behaviorDiverged ? "selfclaim_forged" : "behavior_induced";
                const status = behaviorDiverged ? "spoof_selfclaim_forged" : "spoof_behavior_induced";
                const trueModel = v3 && v3.family === firstDiv ? v3.displayName : null;
                const confidence = diverging.length >= 3 ? "high" :
                    matching.length === 0 ? "high" :
                        "medium";
                return {
                    status, trueFamily: firstDiv, trueModel, spoofMethod, confidence, reasoning,
                };
            }
        }
        return {
            status: "ambiguous", trueFamily: null, trueModel: null,
            spoofMethod: null, confidence: "low", reasoning,
        };
    }
    return {
        status: "insufficient_data", trueFamily: null, trueModel: null,
        spoofMethod: null, confidence: "low", reasoning,
    };
}
//# sourceMappingURL=identity-verdict.js.map