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

export type VerdictStatus =
  | "clean_match"                    // 三向與 claim 一致
  | "clean_match_submodel_mismatch"  // 家族相符但 V3 高信心指向不同子模型
  | "plain_mismatch"                 // 三向一致但都跟 claim 不同（沒偽裝，只是換模型）
  | "spoof_behavior_induced"         // surface/v3 洩漏真相，behavior 被 prompt 誘導成 claim 家族
  | "spoof_selfclaim_forged"         // behavior 洩漏真相，surface 被 prompt 偽裝成 claim 家族
  | "ambiguous"                      // 訊號互相矛盾，沒有穩定多數
  | "insufficient_data";             // 缺資料無法判斷

/** V3 score at/above this is treated as a confident sub-model call. Below
 * this, we do not assert sub-model match or mismatch — the top pick is only
 * ~1% ahead of the runner-up in tie cases, which is not enough to claim
 * anything. Surfaces to UI as "信心不足，僅供參考". */
export const V3_HIGH_CONFIDENCE = 0.80;

export type ConfidenceBand = "high" | "medium" | "low";

export interface VerdictInput {
  claimedFamily: string | null;
  claimedModel: string | undefined;
  surface: { family: string; score: number } | null;
  behavior: { family: string; score: number } | null;
  v3: { family: string; modelId: string; displayName: string; score: number } | null;
}

export interface VerdictResult {
  status: VerdictStatus;
  trueFamily: string | null;
  trueModel: string | null;
  spoofMethod: "behavior_induced" | "selfclaim_forged" | null;
  confidence: ConfidenceBand;
  reasoning: string[];
}

/** Normalize a model ID to a bare lowercase name for sub-model comparison.
 * Handles: dash↔dot version (`4-6` ↔ `4.6`), `-thinking` suffix, `[...]`
 * bracket prefix, and `org/` prefix. */
function bareName(modelId: string): string {
  let s = modelId.toLowerCase();
  if (s.includes("/")) s = s.split("/").slice(1).join("/");
  s = s.replace(/^\[.*?\]/, "");
  s = s.replace(/-thinking$/, "");
  s = s.replace(/(\d+)-(\d+)/g, "$1.$2");
  return s;
}

export function computeVerdict(input: VerdictInput): VerdictResult {
  const { claimedFamily, surface, behavior, v3 } = input;

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

  const signals: Array<{ id: "①" | "②" | "③"; label: string; family: string; score: number }> = [];
  if (surface && surface.score >= USABLE_SURFACE) {
    signals.push({ id: "①", label: "surface", family: surface.family, score: surface.score });
  }
  if (behavior && behavior.score >= USABLE_BEHAVIOR) {
    signals.push({ id: "②", label: "behavior", family: behavior.family, score: behavior.score });
  }
  if (v3 && v3.score >= USABLE_V3) {
    signals.push({ id: "③", label: "v3", family: v3.family, score: v3.score });
  }

  const reasoning: string[] = [];
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
        // Sub-model mismatch detection: family matches but V3 is confident
        // enough AND points to a different sub-model than the one claimed.
        if (
          v3 &&
          v3.family === first &&
          v3.score >= V3_HIGH_CONFIDENCE &&
          input.claimedModel &&
          bareName(v3.modelId) !== bareName(input.claimedModel)
        ) {
          reasoning.push(
            `sub-model mismatch: claim=${bareName(input.claimedModel)} v3=${bareName(v3.modelId)} @${Math.round(v3.score * 100)}%`,
          );
          return {
            status: "clean_match_submodel_mismatch",
            trueFamily: first,
            trueModel,
            spoofMethod: null,
            confidence: signals.length >= 3 ? "high" : "medium",
            reasoning,
          };
        }
        // Borderline V3: family confirmed but sub-model match is weak (just
        // over the 60% threshold). Common pattern is "wrapper relay using
        // real model X but injecting a system prompt that nudges refusal
        // tone / vocabulary, which lowers our V3 lead-match score".
        if (v3 && v3.family === first && v3.score >= 0.60 && v3.score < 0.75) {
          reasoning.push(
            `wrapper-hint: V3 sub-model match is borderline (${Math.round(v3.score * 100)}%) — possibly real ${v3.displayName} with system-prompt-modified refusal style`,
          );
        }
        return {
          status: "clean_match", trueFamily: first, trueModel,
          spoofMethod: null, confidence: signals.length >= 3 ? "high" : "medium",
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
    const matching  = signals.filter(s => s.family === claimedFamily);

    // Special case: only behavior diverges. Classic selfclaim-forgery —
    // surface and v3 can be manipulated via prompt (self-claim / formatting /
    // speed), but ling_* factual probes are hard to fake. When behavior is
    // confident enough (>= 0.70), trust it as the truth signal.
    if (
      diverging.length === 1 &&
      diverging[0].label === "behavior" &&
      diverging[0].score >= 0.70
    ) {
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
    if (
      diverging.length === 1 &&
      diverging[0].label === "surface" &&
      diverging[0].score >= 0.50
    ) {
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

        const spoofMethod: "behavior_induced" | "selfclaim_forged" =
          behaviorDiverged ? "selfclaim_forged" : "behavior_induced";
        const status: VerdictStatus =
          behaviorDiverged ? "spoof_selfclaim_forged" : "spoof_behavior_induced";
        const trueModel = v3 && v3.family === firstDiv ? v3.displayName : null;
        const confidence: ConfidenceBand =
          diverging.length >= 3 ? "high" :
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
