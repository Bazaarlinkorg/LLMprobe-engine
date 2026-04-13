// src/fingerprint-fusion.ts — Merge rule-based, judge, and vector signals (MIT)

import type { FamilyScore, IdentityCandidate } from "./identity-report.js";
import { FAMILY_BASELINES } from "./fingerprint-baseline.js";

// Weights must sum to 1.0 across active signals.
// When judge or vector are empty, their weight redistributes to rule.
const W_RULE   = 0.4;
const W_JUDGE  = 0.4;
const W_VECTOR = 0.2;

function getDisplayName(family: string): string {
  return FAMILY_BASELINES.find(b => b.family === family)?.displayName ?? family;
}

/**
 * Fuse three signal sources into a ranked IdentityCandidate[].
 *
 * - ruleScores:   from matchCandidatesRaw() — always present
 * - judgeScores:  from judgeFingerprint()   — empty [] if unavailable
 * - vectorScores: from pickTopVectorScores() — empty [] if unavailable
 *
 * Returns top-3 candidates with fused 0-1 score.
 */
export function fuseScores(
  ruleScores: FamilyScore[],
  judgeScores: FamilyScore[],
  vectorScores: FamilyScore[],
): IdentityCandidate[] {
  const hasJudge  = judgeScores.length > 0;
  const hasVector = vectorScores.length > 0;

  let wRule   = W_RULE;
  let wJudge  = hasJudge  ? W_JUDGE  : 0;
  let wVector = hasVector ? W_VECTOR : 0;
  const total = wRule + wJudge + wVector;
  wRule   = wRule   / total;
  wJudge  = wJudge  / total;
  wVector = wVector / total;

  const ruleMap:   Record<string, number> = Object.fromEntries(ruleScores.map(s => [s.family, s.score]));
  const judgeMap:  Record<string, number> = Object.fromEntries(judgeScores.map(s => [s.family, s.score]));
  const vectorMap: Record<string, number> = Object.fromEntries(vectorScores.map(s => [s.family, s.score]));

  const families = [...new Set([
    ...ruleScores.map(s => s.family),
    ...judgeScores.map(s => s.family),
    ...vectorScores.map(s => s.family),
  ])];

  const fused = families.map(family => {
    const score =
      wRule   * (ruleMap[family]   ?? 0) +
      wJudge  * (judgeMap[family]  ?? 0) +
      wVector * (vectorMap[family] ?? 0);
    return { family, score };
  });

  return fused
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(s => ({
      family: s.family,
      model: getDisplayName(s.family),
      score: Math.round(s.score * 1000) / 1000,
      reasons: [],
    }));
}
