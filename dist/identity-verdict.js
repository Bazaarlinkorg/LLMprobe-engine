"use strict";
// src/identity-verdict.ts — Pure function: cross-check three fingerprint
// signals (surface / behavior / v3) against the claimed family to produce a
// human-interpretable verdict. No I/O, no external dependencies.
//
// This is the "三向交叉" (tri-cross) verdict used by the probe engine's
// identity pipeline. It takes three independent signals:
//   ① surface  — what the endpoint self-claims (spoofable via system prompt)
//   ② behavior — family classifier with selfClaim zeroed (harder to spoof)
//   ③ v3       — deterministic sub-model classifier (cutoff + capability +
//                refusal fingerprint; very hard to spoof)
// and decides whether the signals agree or disagree with the claim.
Object.defineProperty(exports, "__esModule", { value: true });
exports.COVERAGE_GAP_DEMOTE_CONFIDENCE = exports.COVERAGE_GAP_FORCE_FAMILY_ONLY = exports.CLEAN_MATCH_MIN_SCORE = exports.V3_HIGH_CONFIDENCE = void 0;
exports.computeVerdict = computeVerdict;
/** V3 score at/above this is treated as a confident sub-model call. Below
 * this, we do not assert sub-model match or mismatch — the top pick is only
 * ~1% ahead of the runner-up in tie cases, which is not enough to claim
 * anything. */
exports.V3_HIGH_CONFIDENCE = 0.80;
/** Minimum signal score required for "complete match" (clean_match) verdict.
 *  Below this, family unanimity alone isn't strong enough to assert sub-model
 *  identity — falls back to clean_match_family_only. */
exports.CLEAN_MATCH_MIN_SCORE = 0.65;
/** Coverage gap (errors / total) above which the verdict is forced to
 *  family_only with low confidence regardless of signal strength. */
exports.COVERAGE_GAP_FORCE_FAMILY_ONLY = 0.15;
/** Coverage gap above which confidence is demoted by one band even if signals
 *  are otherwise strong. */
exports.COVERAGE_GAP_DEMOTE_CONFIDENCE = 0.05;
/** Normalize a model ID to a bare lowercase name for sub-model comparison.
 * Handles: dash↔dot version (`4-6` ↔ `4.6`), `-thinking` suffix, `[...]`
 * bracket prefix, and `org/` prefix. */
function bareName(modelId) {
    let s = modelId.toLowerCase();
    if (s.includes("/"))
        s = s.split("/").slice(1).join("/");
    s = s.replace(/^\[.*?\]/, "");
    s = s.replace(/-thinking$/, "");
    s = s.replace(/(\d+)-(\d+)/g, "$1.$2");
    return s;
}
function computeVerdict(input) {
    const { claimedFamily, surface, behavior, v3, v3f } = input;
    if (!surface && !behavior && !v3) {
        return {
            status: "insufficient_data", trueFamily: null, trueModel: null,
            spoofMethod: null, confidence: "low", reasoning: ["no fingerprints available"],
        };
    }
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
    if (signals.length >= 2) {
        const first = signals[0].family;
        const unanimous = signals.every(s => s.family === first);
        if (unanimous) {
            const claimAgrees = claimedFamily == null || claimedFamily === first;
            const trueModel = v3 && v3.family === first ? v3.displayName : null;
            if (claimAgrees) {
                const coverageGap = input.coverage && input.coverage.total > 0
                    ? input.coverage.errors / input.coverage.total
                    : 0;
                const minScore = Math.min(...signals.map(s => s.score));
                if (v3 &&
                    v3.family === first &&
                    v3.score >= 0.60 &&
                    input.claimedModel &&
                    bareName(v3.modelId) !== bareName(input.claimedModel)) {
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
                const v3Confirms = v3 != null
                    && v3.family === first
                    && (input.claimedModel ? bareName(v3.modelId) === bareName(input.claimedModel) : true);
                const v3Abstained = v3 == null;
                const signalsWeak = minScore < exports.CLEAN_MATCH_MIN_SCORE;
                const coverageHigh = coverageGap > exports.COVERAGE_GAP_FORCE_FAMILY_ONLY;
                const coverageMid = coverageGap > exports.COVERAGE_GAP_DEMOTE_CONFIDENCE;
                if (v3Abstained || signalsWeak || coverageHigh) {
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
    if (claimedFamily && signals.length >= 2) {
        const diverging = signals.filter(s => s.family !== claimedFamily);
        const matching = signals.filter(s => s.family === claimedFamily);
        if (diverging.length === 1 &&
            diverging[0].label === "behavior" &&
            diverging[0].score >= 0.70) {
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