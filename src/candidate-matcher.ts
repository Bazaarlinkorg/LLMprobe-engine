// src/candidate-matcher.ts — Weighted family scoring and verdict derivation (MIT)

import { FAMILY_BASELINES, claimedModelToFamily } from "./fingerprint-baseline.js";
import type { FingerprintFeatureSet, IdentityCandidate, IdentityStatus } from "./identity-report.js";

/**
 * Score each family baseline against the observed feature set.
 * Returns top-3 candidates sorted by score descending, normalized to 0-1.
 */
export function matchCandidates(features: FingerprintFeatureSet): IdentityCandidate[] {
  const rawScores: Array<{ family: string; displayName: string; raw: number; reasons: string[] }> = [];

  for (const baseline of FAMILY_BASELINES) {
    let raw = 0;
    const reasons: string[] = [];

    for (const [category, key, weight] of baseline.signals) {
      const value = (features[category] as Record<string, number>)[key] ?? 0;
      if (value === 0) continue;
      raw += weight * value;
      if (weight > 0) {
        reasons.push(`${key.replace(/_/g, " ")} detected (+${weight.toFixed(1)})`);
      } else {
        reasons.push(`${key.replace(/_/g, " ")} contradicts ${baseline.family} (${weight.toFixed(1)})`);
      }
    }

    rawScores.push({ family: baseline.family, displayName: baseline.displayName, raw, reasons });
  }

  const maxRaw = Math.max(...rawScores.map(s => s.raw), 1);
  return rawScores
    .filter(s => s.raw > 0)
    .sort((a, b) => b.raw - a.raw)
    .slice(0, 3)
    .map(s => ({
      model: s.displayName,
      family: s.family,
      score: Math.min(1, Math.max(0, s.raw / maxRaw)),
      reasons: s.reasons.slice(0, 5),
    }));
}

/**
 * Given top candidates and a claimed family, derive the overall verdict.
 * - "match": top candidate matches claimed family with confidence > 0.5
 * - "mismatch": top candidate is a different known family with high score
 * - "uncertain": no clear signal, no claimed family, or scores too close
 */
export function deriveVerdict(
  candidates: IdentityCandidate[],
  claimedFamily: string | undefined,
): { status: IdentityStatus; confidence: number; evidence: string[] } {
  if (candidates.length === 0) {
    return { status: "uncertain", confidence: 0, evidence: ["No behavioral signals detected"] };
  }

  const top = candidates[0];
  const evidence = top.reasons.slice(0, 3);

  if (!claimedFamily) {
    return { status: "uncertain", confidence: top.score * 0.7, evidence };
  }

  if (top.family === claimedFamily && top.score > 0.5) {
    const secondScore = candidates[1]?.score ?? 0;
    const margin = top.score - secondScore;
    const confidence = Math.min(1, top.score * (0.6 + margin * 0.4));
    return { status: "match", confidence, evidence };
  }

  if (top.family !== claimedFamily && top.score > 0.4) {
    return {
      status: "mismatch",
      confidence: top.score,
      evidence: [
        `Behavior most consistent with ${top.model} (score: ${top.score.toFixed(2)})`,
        `Claimed family ${claimedFamily} not in top candidates`,
        ...evidence,
      ],
    };
  }

  return { status: "uncertain", confidence: top.score * 0.5, evidence };
}

/** Convenience: resolve claimedModel string to family, then derive verdict. */
export function deriveVerdictFromClaimedModel(
  candidates: IdentityCandidate[],
  claimedModel: string | undefined,
): { status: IdentityStatus; confidence: number; evidence: string[]; predictedFamily: string | undefined } {
  const claimedFamily = claimedModel ? claimedModelToFamily(claimedModel) : undefined;
  const verdict = deriveVerdict(candidates, claimedFamily);
  return { ...verdict, predictedFamily: candidates[0]?.family };
}
