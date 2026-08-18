"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DETECTION_DISABLED_MODEL_IDS = void 0;
exports.isDetectionDisabled = isDetectionDisabled;
exports.filterDetectable = filterDetectable;
// lib/sub-model/detection-config.ts
//
// Reversible registry of models that must NOT be offered as sub-model detection
// candidates. A model lands here when no working discriminator can separate it
// from a sibling — in which case any "detected as X" verdict is noise/false
// positive. To disable a model, add its id; to re-enable, remove it — no other
// code change needed.
//
// CURRENT ENTRY — anthropic/claude-opus-5 (disabled 2026-07-25):
//   Its V3 fingerprint has ZERO globally-unique features. cutoff (2025-01), all five
//   capability answers and every refusal boolean are each shared with a sibling, and
//   its refusal lead is byte-identical to opus-4.7 over the first 20 chars that
//   the pool-wide uniqueness check compares. What remains is `length_avg` (1243 vs
//   4.7's 1023) — so inside the V3 pool it wins on response length alone and vacuums
//   up siblings' traffic. V3H separates it cleanly (10-way held-out 100/100, 0 wrong
//   in offline validation), and this registry gates the V3 layer ONLY, so opus-5 is
//   still identified, just not by V3. Re-enable if it ever acquires a discriminating
//   V3 feature.
//
// CURRENT ENTRY — anthropic/claude-fable-5 (disabled 2026-08-10):
//   Same shape as opus-5: no discriminating V3 feature. Its only unique one was
//   `nativeEmptyRefusal` — the OLD submodel_refusal prompt (step-by-step pipe-bomb
//   instructions, see docs/reports/2026-08-10-v3-benign-probe-tradeoff.md) made
//   Claude 5 return an EMPTY string, and that emptiness WAS the fingerprint. That
//   prompt was removed 2026-08-10 for sending harmful content to whatever endpoint
//   this tool is pointed at, using that operator's own API key; benign prompts get a
//   normal answer back. Keeping the flag true would cost -0.25 on every fable-5 match
//   (scoring penalizes a text response against an empty-refusal baseline), so it is
//   now false — which leaves fable-5 with nothing globally unique inside the V3 pool.
//
//   This does NOT mean fable-5 became undetectable. Like opus-5, this registry gates
//   the V3 layer only, and fable-5 is a member of the anthropic-claude-cluster V3H
//   policy, which separates it within-family at 97% recall / 0% wrong (offline
//   validation). Detection moves down a layer; it does not disappear. Re-enable if a
//   new V3-unique feature is found — see the report above for the axes already
//   measured and rejected.
//
// Prior entries, both re-enabled 2026-07-02:
//   • openai/gpt-5.3-codex (was disabled 2026-06-29 because V3F single-sample
//     could not tell it from gpt-5.5). The V3H border-probe policy
//     "openai-gpt55-codex53" now separates the pair with 0% cross-error
//     (gpt-5.5→codex 0.0%, codex→gpt-5.5 0.0%; validate-v3h-targets 98.8%), so
//     codex is a real, actionable substitution verdict — the discriminator the
//     old comment was waiting for.
//   • anthropic/claude-fable-5 (was disabled 2026-06-14 as suspended, for an
//     unrelated reason — model availability, not a detection gap). Re-enabled
//     per explicit user directive 2026-07-02, then disabled again 2026-08-10
//     for the different, detection-accuracy reason documented above.
exports.DETECTION_DISABLED_MODEL_IDS = new Set([
    "anthropic/claude-opus-5",
    "anthropic/claude-fable-5",
]);
function isDetectionDisabled(modelId) {
    return !!modelId && exports.DETECTION_DISABLED_MODEL_IDS.has(modelId);
}
/** Drop entries whose modelId is a disabled detection target. Order-preserving. */
function filterDetectable(items) {
    if (exports.DETECTION_DISABLED_MODEL_IDS.size === 0)
        return items;
    return items.filter((i) => !exports.DETECTION_DISABLED_MODEL_IDS.has(i.modelId));
}
//# sourceMappingURL=sub-model-detection-config.js.map