// src/sub-model-classifier-v3e.ts — V3E: refusal-ladder + formatting + uncertainty.
//
// Layer ④ of the four-layer detection methodology described in the paper
// "Model Substitution in the Black-Box LLM API Resale Market" (2026-04-26).
//
// Designed for same-family spoof resistance (sibling-tier discrimination),
// where Layer ③ (V3 sub-model deterministic match) abstains. V3E adds three
// independent fingerprint channels that resist system-prompt rewriting:
//   - refusal-boundary ladder (8 graduated probes)
//   - formatting idiosyncrasy (3 probes)
//   - calibrated uncertainty (1 probe)
//
// References: Arditi et al. 2406.11717 (refusal direction), McGovern 2405.14057
// (formatting fingerprint), Kadavath et al. 2207.05221 (calibration).

import type { SubmodelBaselineV3E } from "./sub-model-baselines-v3e.js";

export interface RefusalLadderFeatures {
  /** 8-rung compliance vector: 0=compliant, 1=partial, 2=refused. */
  vector: number[];
  refusedCount: number;
  partialCount: number;
  /** Lowest index of 2 (0-7), or -1 if none. */
  firstRefusalRung: number;
  citesLegal: boolean;
  cites988: boolean;
  /** Avg char count of refused rungs. */
  avgRefusalLength: number;
}

export interface FormattingFeatures {
  /** Dominant bullet char in v3e_fmt_bullets ("-", "*", "bullet-dot", "1." for ordered, or "none"). */
  bulletChar: string;
  /** Max markdown header depth (# = 1, ## = 2, 0 = none). */
  headerDepth: number;
  /** Code fence language tag ("python", "py", "", or null if no fence). */
  codeLangTag: string | null;
  usesEmDash: boolean;
}

export interface UncertaintyFeatures {
  /** Parsed integer 0-100, or null if not a valid number. */
  value: number | null;
  /** True if value ends in 0 or 5 (evidence of rounding bias). */
  isRound: boolean;
}

const REFUSAL_LEAD_PATTERNS = [
  /^i\s*(can'?t|can’t|cannot)/i,
  /^i[’']?m\s+not\s+(going|able)/i,
  /^i[’']?m\s+sorry/i,
  /^sorry/i,
  /^no[\.,]/i,
];

function classifyRung(text: string): 0 | 1 | 2 {
  if (!text || text.trim().length < 5) return 1;
  const first = (text.split(/\r?\n/).find((l) => l.trim()) ?? "").trim();
  for (const pat of REFUSAL_LEAD_PATTERNS) {
    if (pat.test(first)) return 2;
  }
  if (/\b(illegal|unlawful|harmful|i can't|cannot provide)/i.test(text) && text.length > 400) {
    return 1;
  }
  return 0;
}

export function extractRefusalLadder(responses: Record<string, string>): RefusalLadderFeatures {
  const ids = [
    "v3e_refusal_l1_tame",
    "v3e_refusal_l2_mild",
    "v3e_refusal_l3_borderline_a",
    "v3e_refusal_l4_borderline_b",
    "v3e_refusal_l5_borderline_c",
    "v3e_refusal_l6_sensitive",
    "v3e_refusal_l7_strong",
    "v3e_refusal_l8_hard",
  ];
  const vector = ids.map((id) => classifyRung(responses[id] ?? ""));
  const refused = vector.filter((v) => v === 2).length;
  const partial = vector.filter((v) => v === 1).length;
  const firstRefusalRung = vector.findIndex((v) => v === 2);
  const joined = ids.map((id) => responses[id] ?? "").join(" ");
  const refusedTexts = ids.filter((_, i) => vector[i] === 2).map((id) => responses[id] ?? "");
  const avgLen = refusedTexts.length
    ? refusedTexts.reduce((s, t) => s + t.length, 0) / refusedTexts.length
    : 0;
  return {
    vector,
    refusedCount: refused,
    partialCount: partial,
    firstRefusalRung,
    citesLegal: /18\s*U\.?S\.?C\.?|§\s*842|criminal\s+code|prohibited\s+by\s+law/i.test(joined),
    cites988: /\b988\b/.test(joined),
    avgRefusalLength: avgLen,
  };
}

export function extractFormatting(responses: Record<string, string>): FormattingFeatures {
  const bullets = responses.v3e_fmt_bullets ?? "";
  const lines = bullets.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const counts: Record<string, number> = { "-": 0, "*": 0, "bullet-dot": 0, "1.": 0 };
  for (const l of lines) {
    if (/^-\s/.test(l)) counts["-"]++;
    else if (/^\*\s/.test(l)) counts["*"]++;
    else if (/^•\s/.test(l)) counts["bullet-dot"]++;
    else if (/^\d+\.\s/.test(l)) counts["1."]++;
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const bulletChar = sorted[0] && sorted[0][1] > 0 ? sorted[0][0] : "none";

  const explain = responses.v3e_fmt_explain_depth ?? "";
  const headerMatches = explain.match(/^(#{1,6})\s/gm) ?? [];
  const headerDepth = headerMatches.length
    ? Math.max(...headerMatches.map((h) => h.trim().length))
    : 0;

  const code = responses.v3e_fmt_code_lang_tag ?? "";
  const fenceMatch = code.match(/```([a-zA-Z0-9_+-]*)/);
  const codeLangTag = fenceMatch ? fenceMatch[1].toLowerCase() || "" : null;

  const anyText = bullets + explain + code;
  return {
    bulletChar,
    headerDepth,
    codeLangTag,
    usesEmDash: anyText.includes("—"),
  };
}

export function extractUncertainty(responses: Record<string, string>): UncertaintyFeatures {
  const raw = responses.v3e_uncertainty_estimate ?? "";
  const m = raw.match(/\b(\d{1,3})\b/);
  if (!m) return { value: null, isRound: false };
  const n = Math.max(0, Math.min(100, parseInt(m[1], 10)));
  return { value: n, isRound: n % 5 === 0 };
}

// ── Scoring ───────────────────────────────────────────────────────────────

export interface V3EObserved {
  refusalLadder: RefusalLadderFeatures;
  formatting: FormattingFeatures;
  uncertainty: UncertaintyFeatures;
}

export interface V3EMatch {
  modelId: string;
  family: string;
  displayName: string;
  score: number;
  matched: string[];
  divergent: string[];
}

export interface V3EOutput {
  observed: V3EObserved;
  top: V3EMatch | null;
  candidates: V3EMatch[];
  abstained: boolean;
}

export interface V3EWeights {
  ladder: number;
  formatting: number;
  uncertainty: number;
  citationBonus: number;
}
export const DEFAULT_V3E_WEIGHTS: V3EWeights = {
  ladder: 0.50,
  formatting: 0.25,
  uncertainty: 0.15,
  citationBonus: 0.10,
};

function ladderSimilarity(obsVec: number[], refVecAvg: number[]): number {
  if (obsVec.length !== refVecAvg.length) return 0;
  let sumSq = 0;
  for (let i = 0; i < obsVec.length; i++) {
    sumSq += (obsVec[i] - refVecAvg[i]) ** 2;
  }
  return Math.max(0, 1 - sumSq / 12);
}

function formatSimilarity(obs: FormattingFeatures, ref: SubmodelBaselineV3E["formatting"]): number {
  const bulletHit = obs.bulletChar === ref.bulletCharMode ? 1 : 0;
  const headerHit = Math.exp(-Math.abs(obs.headerDepth - ref.headerDepthAvg) / 2);
  const codeHit = (obs.codeLangTag ?? "") === (ref.codeLangTagMode ?? "") ? 1 : 0;
  return (bulletHit + headerHit + codeHit) / 3;
}

function uncertaintySimilarity(obs: UncertaintyFeatures, ref: SubmodelBaselineV3E["uncertainty"]): number {
  if (obs.value == null || ref.valueAvg == null) return 0.5;
  const sigma = Math.max(5, ref.valueStdDev ?? 10);
  const z = Math.abs(obs.value - ref.valueAvg) / sigma;
  return Math.max(0, Math.exp(-0.5 * z * z));
}

export function scoreV3EMatch(
  obs: V3EObserved,
  ref: SubmodelBaselineV3E,
  weights: V3EWeights = DEFAULT_V3E_WEIGHTS,
): { score: number; matched: string[]; divergent: string[] } {
  const matched: string[] = [];
  const divergent: string[] = [];

  const ladder = ladderSimilarity(obs.refusalLadder.vector, ref.refusalLadder.vectorAvg);
  if (ladder >= 0.85) matched.push(`ladder(${ladder.toFixed(2)})`);
  else divergent.push(`ladder(${ladder.toFixed(2)})`);

  const fmt = formatSimilarity(obs.formatting, ref.formatting);
  if (fmt >= 0.67) matched.push(`fmt(${fmt.toFixed(2)})`);
  else divergent.push(`fmt(${fmt.toFixed(2)})`);

  const unc = uncertaintySimilarity(obs.uncertainty, ref.uncertainty);
  if (unc >= 0.5) matched.push(`unc(${unc.toFixed(2)})`);
  else divergent.push(`unc(${unc.toFixed(2)})`);

  let citationBonus = 0;
  if (ladder >= 0.75) {
    if (obs.refusalLadder.citesLegal && ref.refusalLadder.citesLegalRate >= 0.5) {
      citationBonus += 0.05;
      matched.push("cite.legal");
    }
    if (obs.refusalLadder.cites988 && ref.refusalLadder.cites988Rate >= 0.5) {
      citationBonus += 0.05;
      matched.push("cite.988");
    }
  }

  const base = weights.ladder * ladder + weights.formatting * fmt + weights.uncertainty * unc;
  const score = Math.min(1, base + weights.citationBonus * (citationBonus * 10));
  return { score, matched, divergent };
}

export function classifySubmodelV3E(
  responses: Record<string, string>,
  baselines: SubmodelBaselineV3E[],
  options: {
    predictedFamily?: string;
    confidenceThreshold?: number;
    weights?: V3EWeights;
  } = {},
): V3EOutput {
  const observed: V3EObserved = {
    refusalLadder: extractRefusalLadder(responses),
    formatting: extractFormatting(responses),
    uncertainty: extractUncertainty(responses),
  };
  const threshold = options.confidenceThreshold ?? 0.60;
  const pool = options.predictedFamily
    ? baselines.filter((b) => b.family === options.predictedFamily)
    : baselines;

  const scored = pool
    .map((ref) => {
      const { score, matched, divergent } = scoreV3EMatch(observed, ref, options.weights);
      return {
        modelId: ref.modelId,
        family: ref.family,
        displayName: ref.displayName,
        score,
        matched,
        divergent,
      };
    })
    .sort((a, b) => b.score - a.score);

  const firstMatch = scored[0] ?? null;
  const runnerUp = scored[1];
  const gap = firstMatch && runnerUp ? firstMatch.score - runnerUp.score : Infinity;
  const abstained = firstMatch != null && gap < 0.05;
  const top = firstMatch && firstMatch.score >= threshold && !abstained ? firstMatch : null;

  return { observed, top, candidates: scored.slice(0, 3), abstained };
}

export type { SubmodelBaselineV3E } from "./sub-model-baselines-v3e.js";
