// src/identity-phase-gate.ts — Decide whether to run the identity phase
// at all. If every ling probe returned ERR and no single-run fallback
// exists, the identity phase cannot produce a meaningful answer and would
// fabricate a confident-looking wrong verdict.

export function hasUsableLingData(
  linguisticResults: Record<string, string[]>,
  singleRunFallbacks: Record<string, string>,
): boolean {
  for (const [probeId, answers] of Object.entries(linguisticResults)) {
    const hasReal = Array.isArray(answers)
      && answers.some(a => a !== "ERR" && typeof a === "string" && a.trim().length > 0);
    if (hasReal) return true;
    const fb = singleRunFallbacks[probeId];
    if (fb && fb !== "ERR" && fb.trim().length > 0) return true;
  }
  for (const [, fb] of Object.entries(singleRunFallbacks)) {
    if (fb && fb !== "ERR" && fb.trim().length > 0) return true;
  }
  return false;
}
