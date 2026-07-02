// lib/sub-model/detection-config.ts
//
// Reversible registry of models that must NOT be offered as sub-model detection
// candidates. A model lands here when no working discriminator can separate it
// from a sibling — in which case any "detected as X" verdict is noise/false
// positive. To disable a model, add its id; to re-enable, remove it — no other
// code change needed.
//
// EMPTY as of 2026-07-02. Both prior entries were re-enabled:
//   • openai/gpt-5.3-codex (was disabled 2026-06-29 because V3F single-sample
//     could not tell it from gpt-5.5). The V3H border-probe policy
//     "openai-gpt55-codex53" now separates the pair with 0% cross-error
//     (gpt-5.5→codex 0.0%, codex→gpt-5.5 0.0%; validate-v3h-targets 98.8%), so
//     codex is a real, actionable substitution verdict — the discriminator the
//     old comment was waiting for.
//   • anthropic/claude-fable-5 (was disabled 2026-06-14 as suspended). Re-enabled
//     per explicit user directive 2026-07-02; the anthropic Claude-cluster V3H
//     policy separates it within-family at 97% recall / 0% wrong. NOTE: fable-5
//     remains suspended/not-servable, so a fable-5 verdict on a live relay is
//     still most likely a mislabel — re-enable was a deliberate accepted trade-off.
export const DETECTION_DISABLED_MODEL_IDS: ReadonlySet<string> = new Set<string>([]);

export function isDetectionDisabled(modelId: string | null | undefined): boolean {
  return !!modelId && DETECTION_DISABLED_MODEL_IDS.has(modelId);
}

/** Drop entries whose modelId is a disabled detection target. Order-preserving. */
export function filterDetectable<T extends { modelId: string }>(items: T[]): T[] {
  if (DETECTION_DISABLED_MODEL_IDS.size === 0) return items;
  return items.filter((i) => !DETECTION_DISABLED_MODEL_IDS.has(i.modelId));
}
