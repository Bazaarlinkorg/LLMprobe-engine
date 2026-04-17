// src/fingerprint-build-helpers.ts — Single source of truth for assembling
// the inputs to extractFingerprint(). Both the live probe runner
// (app/api/probe/run/route.ts) and the admin baseline build
// (app/api/admin/probe-baselines/build/route.ts) call this so feature
// shapes are byte-identical for the same model + probe data.

import { extractFingerprint } from "./fingerprint-extractor.js";
import type { FingerprintFeatureSet } from "./identity-report.js";
import type { ProbeItemLike } from "./performance-fingerprint.js";

/** Minimal shape required by the build helpers. Compatible with both
 *  the in-memory ProbeRunItem (live runner) and the per-probe state the
 *  admin baseline builder accumulates. */
export interface BuildItem {
  probeId: string;
  response?: string | null;
  ttftMs?: number | null;
  durationMs?: number | null;
  tps?: number | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  status?: string;
}

export interface FingerprintInputs {
  responses: Record<string, string>;
  linguisticResults: Record<string, string[]>;
  items: ProbeItemLike[];
  singleRunFallbacks: Record<string, string>;
}

/** All identity-group probes that feed extractLinguisticFeatures. Exported
 *  so the route handler can use the same set when building single-run
 *  fallbacks / deciding whether the identity phase has usable data. */
export const LING_PROBE_IDS = new Set<string>([
  "ling_kr_num", "ling_jp_pm", "ling_fr_pm", "ling_ru_pres",
  "ling_uk_pm", "ling_kr_crisis", "ling_de_chan",
  "tok_count_num", "tok_split_word", "tok_self_knowledge",
  "code_reverse_list", "code_comment_lang", "code_error_style",
  "comp_py_float", "comp_large_exp",
  "meta_context_len", "meta_thinking_mode", "meta_creator",
]);

/**
 * Canonical assembly policy:
 *   - responses: every probe item with a non-empty response string,
 *     regardless of probe group or scoring type. This ensures textStructure
 *     mining sees the maximum amount of text. The lexical extractors are
 *     pure regex over text — adding more probe responses cannot produce
 *     false positives, only more signal.
 *   - linguisticResults: passed through unchanged.
 *   - items: every item with both ttftMs and tps populated. Timing
 *     features (tps_bucket_*, ttft_bucket_*, out_len_*) require numeric
 *     timing data; items with null timings are filtered to avoid
 *     skewing the median calculations.
 *   - singleRunFallbacks: for each ling probe with a non-empty item.response,
 *     harvest it so the ling extractor can recover features when the 10×
 *     distribution is all-ERR.
 */
export function assembleFingerprintInputs(
  items: BuildItem[],
  linguisticResults: Record<string, string[]>,
): FingerprintInputs {
  const responses: Record<string, string> = {};
  const singleRunFallbacks: Record<string, string> = {};
  for (const item of items) {
    if (typeof item.response === "string" && item.response.length > 0) {
      responses[item.probeId] = item.response;
      if (LING_PROBE_IDS.has(item.probeId)) {
        singleRunFallbacks[item.probeId] = item.response;
      }
    }
  }

  const timedItems: ProbeItemLike[] = items
    .filter(i => typeof i.ttftMs === "number" && typeof i.tps === "number")
    .map(i => ({
      probeId: i.probeId,
      ttftMs: i.ttftMs ?? null,
      durationMs: i.durationMs ?? null,
      tps: i.tps ?? null,
      inputTokens: i.inputTokens ?? null,
      outputTokens: i.outputTokens ?? null,
    }));

  return { responses, linguisticResults, items: timedItems, singleRunFallbacks };
}

/** Convenience: assemble inputs and run the full extractor in one call.
 *  Both the live runner and the admin baseline build use this — never
 *  call extractFingerprint() directly from a route handler. */
export function extractFingerprintFromBuild(
  items: BuildItem[],
  linguisticResults: Record<string, string[]>,
): FingerprintFeatureSet {
  const inputs = assembleFingerprintInputs(items, linguisticResults);
  return extractFingerprint(inputs.responses, inputs.linguisticResults, inputs.items, inputs.singleRunFallbacks);
}
