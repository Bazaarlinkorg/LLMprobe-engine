// src/sub-model-classifier-v3.ts — V3 deterministic sub-model classifier.
//
// Uses 3 probes (submodel_cutoff, submodel_capability, submodel_refusal) that
// produce a deterministic feature vector per sub-model. Cross-checks the
// implied family against the V2 family classifier to flag wrapper-spoof.
//
// Inputs:
//   - observedResponses: Record<probeId, raw response text>
// Outputs:
//   - extracted feature vector (for baseline matching)
//   - closest sub-model match + confidence
//   - V3-implied family (for cross-check with V2 family → wrapper-spoof flag)

import type { SubmodelBaselineV3 } from "./sub-model-baselines-v3.js";
import { V3_BASELINES, getBaselinesForFamily, getAllFamilies } from "./sub-model-baselines-v3.js";
import { buildUniquenessMap, uniquenessBoost } from "./sub-model-v3-uniqueness.js";
import { getCachedBaselines } from "./sub-model-baselines-v3-store.js";
import { inferFamilyVotesFromV3EResponses, type V3EFamilyVote } from "./sub-model-classifier-v3e.js";

// Returns the current baseline pool from the DB-backed cache (falls back to
// seed on cold start or DB error — classifier never breaks).
function currentBaselines(): SubmodelBaselineV3[] {
  return getCachedBaselines();
}

// Pre-computed once at module load — identifies per-baseline features that
// are unique across the 25-baseline pool. Used by scoreMatch to boost
// decisive signals (e.g., cutoff 2025-04 uniquely identifies Opus 4.6).
// NOTE: derived from seed only at module-load for initial scoring; scoreMatch
// re-derives from the runtime pool per call when pool changes.
const UNIQUENESS_MAP = buildUniquenessMap(V3_BASELINES);

export interface V3Features {
  cutoff: string | null;
  capability: {
    q1_strawberry: string | null;
    q2_1000days: string | null;
    q3_apples: string | null;
    q4_prime: string | null;
    q5_backwards: string | null;
  };
  refusal: {
    lead: string;
    starts_with_no: boolean;
    starts_with_sorry: boolean;
    starts_with_cant: boolean;
    cites_18_usc: boolean;
    mentions_988: boolean;
    mentions_virtually_all: boolean;
    mentions_history_alt: boolean;
    mentions_pyrotechnics: boolean;
    mentions_policies: boolean;
    mentions_guidelines: boolean;
    mentions_illegal: boolean;
    mentions_harmful: boolean;
    length: number;
  };
  /** null = not observed (no signal); true = model rejected temperature (HTTP 400);
   *  false = temperature was accepted — unreliable via gateways, treated as null. */
  rejectsTemperature: boolean | null;
}

export interface V3Match {
  modelId: string;
  family: string;
  displayName: string;
  score: number;              // 0..1 weighted match
  matchedFeatures: string[];
  divergentFeatures: string[];
}

/** Score gap below which the scorer abstains. Tuned from baseline analysis —
 * Opus 4.5 / 4.7 can tie within 2-3% due to shared capability + refusal lead
 * prefix. 5% is generous enough to catch these cases without suppressing
 * legitimate-but-close winners. */
export const TIE_BREAK_GAP = 0.05;

export interface V3Output {
  features: V3Features;
  /** Best sub-model match (family-scoped if predictedFamily given, else cross-family).
   * null when: (a) no candidates available, or (b) top-2 gap < TIE_BREAK_GAP (abstained). */
  top: V3Match | null;
  /** Top-3 candidates with scores — preserved even when abstained so UI can
   * show "closest candidates". Sorted by score descending. */
  candidates: V3Match[];
  /** V3-implied family derived from feature signatures (independent of V2) */
  familyImplied: string | null;
  /** true iff familyImplied !== predictedFamily and predictedFamily given */
  familyMismatch: boolean;
  /** true when top-2 gap < TIE_BREAK_GAP — scorer cannot confidently pick one.
   * UI should show "子模型無法區分". `top` is null when this is true. */
  abstained: boolean;
}

export interface FamilyVoteResult {
  family: string | null;
  votes: Record<string, number>;
  score: number;
  gap: number;
  reasons: string[];
}

// ── Feature extractors ────────────────────────────────────────────────────
export function extractCutoff(text: string): string | null {
  if (!text) return null;
  const m = text.match(/(\d{4})[-年\s\/\.]*(\d{1,2})/);
  return m ? `${m[1]}-${String(m[2]).padStart(2, "0")}` : null;
}

export function extractCapability(text: string): V3Features["capability"] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const keys = ["q1_strawberry", "q2_1000days", "q3_apples", "q4_prime", "q5_backwards"] as const;
  const out: Record<string, string | null> = {
    q1_strawberry: null, q2_1000days: null, q3_apples: null, q4_prime: null, q5_backwards: null,
  };
  for (const line of lines) {
    const m = line.match(/^(\d)[\.、:)]\s*(.+?)$/);
    if (m) {
      const idx = parseInt(m[1], 10) - 1;
      if (idx >= 0 && idx < keys.length) {
        out[keys[idx]] = m[2].trim().toLowerCase().replace(/[。\.!?]+$/, "");
      }
    }
  }
  return out as V3Features["capability"];
}

export function extractRefusal(text: string): V3Features["refusal"] {
  // Anthropic models often prefix with empty newlines ("\n\nI can't ...").
  // Skip leading blanks so refusal lead + starts_with_* flags reflect the
  // actual first content line. Otherwise lead becomes "" and Opus 4.x runs
  // miss leadMatch in scoring (observed run cmo6jbnc500ey0ky1vwszvf7q).
  const firstLine = (text.split(/\r?\n/).find(l => l.trim()) ?? "").trim();
  return {
    lead: firstLine.slice(0, 40),
    starts_with_no: /^no[\.\s,]/i.test(firstLine),
    starts_with_sorry: /^(i'?m\s+)?sorry|^抱歉/i.test(firstLine),
    starts_with_cant: /^i\s*(can'?t|can\u2019t|cannot)/i.test(firstLine),
    cites_18_usc: /18\s*U\.?S\.?C\.?\s*§?\s*842/i.test(text),
    mentions_988: /\b988\b/.test(text),
    mentions_virtually_all: /virtually\s+all\s+jurisdictions/i.test(text),
    mentions_history_alt: /chemistry,?\s*engineering,?\s*or\s*history/i.test(text),
    mentions_pyrotechnics: /pyrotechnics/i.test(text),
    mentions_policies: /(openai.{0,20}polic|content\s*polic|use\s*case\s*polic)/i.test(text),
    mentions_guidelines: /guidelines?/i.test(text),
    mentions_illegal: /illegal|unlawful|against\s+the\s+law/i.test(text),
    mentions_harmful: /harmful|dangerous|harm/i.test(text),
    length: text.length,
  };
}

export function extractV3Features(
  responses: Record<string, string>,
  rejectsTemperature: boolean | null = null,
): V3Features {
  return {
    cutoff: extractCutoff(responses.submodel_cutoff ?? ""),
    capability: extractCapability(responses.submodel_capability ?? ""),
    refusal: extractRefusal(responses.submodel_refusal ?? ""),
    rejectsTemperature,
  };
}

// ── Match scoring ─────────────────────────────────────────────────────────

/** Log-Gaussian length-similarity kernel.
 * Score decays smoothly with |log(obs/ref)|. Symmetric and scale-invariant:
 * a 2× overshoot scores the same as a 2× undershoot. sigma=0.5 → 20% drift ≈
 * 0.94, 2× drift ≈ 0.38 (tuned so Opus 4.5 ref=457 and Opus 4.7 ref=1023
 * clearly separate under a 700-char observation). */
export function lengthScoreLogGaussian(obs: number, ref: number): number {
  if (obs <= 0 || ref <= 0) return 0;
  const sigma = 0.5;
  const logRatio = Math.log(obs / ref);
  return Math.exp(-0.5 * (logRatio / sigma) ** 2);
}

// Weighted feature match: cutoff (0.20) + capability (0.25) + refusal (0.35) + length (0.20).
// Each sub-feature contributes proportionally within its group.
function scoreMatch(
  obs: V3Features,
  ref: SubmodelBaselineV3,
  uniquenessMap = UNIQUENESS_MAP,
): { score: number; matched: string[]; divergent: string[] } {
  const matched: string[] = [];
  const divergent: string[] = [];

  // cutoff (0.25)
  let cutoffScore = 0;
  if (obs.cutoff && obs.cutoff === ref.cutoff) { cutoffScore = 1; matched.push("cutoff"); }
  else divergent.push(`cutoff (${obs.cutoff} vs ${ref.cutoff})`);

  // capability (0.35 total, 0.07 per q)
  const capKeys: Array<keyof V3Features["capability"]> = ["q1_strawberry", "q2_1000days", "q3_apples", "q4_prime", "q5_backwards"];
  let capHits = 0;
  for (const k of capKeys) {
    if (obs.capability[k] && obs.capability[k] === ref.capability[k]) { capHits++; matched.push(`cap.${k}`); }
    else divergent.push(`cap.${k}`);
  }
  const capScore = capHits / capKeys.length;

  // refusal (0.40 total, lead 0.2 + 12 flags 0.20/12 each)
  const leadMatch = obs.refusal.lead && ref.refusal.lead &&
    obs.refusal.lead.slice(0, 20).toLowerCase() === ref.refusal.lead.slice(0, 20).toLowerCase();
  if (leadMatch) matched.push("refusal.lead"); else divergent.push("refusal.lead");

  // Boolean flag keys shared between observed V3Features.refusal and baseline
  // SubmodelBaselineV3.refusal (both have the same 12 boolean flags).
  type RefusalFlagKey =
    | "starts_with_no" | "starts_with_sorry" | "starts_with_cant"
    | "cites_18_usc" | "mentions_988" | "mentions_virtually_all"
    | "mentions_history_alt" | "mentions_pyrotechnics" | "mentions_policies"
    | "mentions_guidelines" | "mentions_illegal" | "mentions_harmful";
  const flagKeys: RefusalFlagKey[] = [
    "starts_with_no", "starts_with_sorry", "starts_with_cant",
    "cites_18_usc", "mentions_988", "mentions_virtually_all",
    "mentions_history_alt", "mentions_pyrotechnics", "mentions_policies",
    "mentions_guidelines", "mentions_illegal", "mentions_harmful",
  ];
  let flagHits = 0;
  for (const k of flagKeys) {
    if (obs.refusal[k] === ref.refusal[k]) { flagHits++; matched.push(`refusal.${k}`); }
    else divergent.push(`refusal.${k}`);
  }
  const refusalScore = (leadMatch ? 0.5 : 0) + 0.5 * (flagHits / flagKeys.length);

  // length (new — weight 0.20, log-Gaussian kernel)
  const lengthScore = lengthScoreLogGaussian(obs.refusal.length, ref.refusal.length_avg);
  if (lengthScore >= 0.80) matched.push("refusal.length");
  else divergent.push(`refusal.length (${obs.refusal.length} vs avg ${ref.refusal.length_avg})`);

  // temperature signal: asymmetric — only obs=true carries information.
  // obs=false is unreliable (gateways may silently absorb 400 and retry without temp).
  let tempBoost = 0;
  if (obs.rejectsTemperature === true) {
    if (ref.rejectsTemperature) {
      tempBoost = 0.10;
      matched.push("rejectsTemperature");
    } else {
      tempBoost = -0.10;
      divergent.push("rejectsTemperature (obs=true ref=false → excluded)");
    }
  }

  const baseScore = 0.20 * cutoffScore + 0.25 * capScore + 0.35 * refusalScore + 0.20 * lengthScore;
  const boost = uniquenessBoost(obs, ref, uniquenessMap);
  if (boost > 0) matched.push(`uniqueness+${boost.toFixed(2)}`);
  const score = Math.min(1.0, Math.max(0, baseScore + boost + tempBoost));
  return { score, matched, divergent };
}

// ── V3-implied family (used for cross-check vs V2 family) ─────────────────
// V2A is the original hard cascade. Kept for replay/evaluation so V2B can be
// compared against the exact previous behavior without relying on git history.
export function implyFamilyV2A(features: V3Features): string | null {
  const r = features.refusal;
  const lead = r.lead.toLowerCase();

  // Strongest family signatures (from iter3 per-family data).
  // Order matters — higher-specificity patterns first. The curly apostrophe
  // test must come BEFORE the "I can't ..." Anthropic matches because GPT-5
  // family uses "I can\u2019t help with..." which would otherwise collide.
  if (/i understand you['\u2019]?re asking about/i.test(lead)) return "deepseek";

  // Curly apostrophe U+2019 is unique to GPT-5 family in our fixture.
  const hasCurly = lead.includes("\u2019");
  if (hasCurly && /^i\s*can\u2019t/i.test(lead)) return "openai";
  if (hasCurly && /^sorry\s*[\u2014\-]/i.test(lead)) return "openai"; // "Sorry —" em-dash

  if (r.cites_18_usc) return "anthropic"; // opus-4.7 only
  if (r.mentions_history_alt) return "anthropic"; // haiku-4.5 only
  if (r.mentions_virtually_all) return "anthropic"; // opus-4.6 only
  if (r.mentions_pyrotechnics && lead.includes("i can")) return "anthropic"; // sonnet-4.5
  if (/^no[\.,]/i.test(lead)) return "anthropic"; // sonnet-4.6, opus-4.6 "No."
  if (/^i can['\u2019]?t\s+help\s+with/i.test(lead)) return "anthropic";
  if (/^i can['\u2019]?t\s+provide/i.test(lead)) return "anthropic";
  // Observed on opus-4.6 (run cmo62ge6502cu0kslx2j7a4mk, 2026-04-19):
  // "I'm not going to provide instructions ..." — distinct from OpenAI "I'm sorry".
  if (/^i['\u2019]?m\s+not\s+going\s+to/i.test(lead)) return "anthropic";

  // OpenAI 4.x uses "I'm sorry" (straight quote only — GPT-5 caught earlier)
  if (/^i['\u2019]?m\s+sorry/i.test(lead) && !r.mentions_harmful) return "openai";

  // Gemini: "I cannot answer" / "I cannot fulfill"
  if (/^i\s+cannot\s+(answer|fulfill|help)/i.test(lead)) return "google";

  // Qwen: "I'm sorry, but I can't provide" OR "I cannot provide instructions"
  if (/^i['\u2019]?m\s+sorry.{0,5}but.{0,5}i\s+can['\u2019]?t\s+provide/i.test(lead)) return "qwen";
  if (/^i\s+cannot\s+provide/i.test(lead)) return "qwen";

  return null;
}

function createFamilyVoteMap(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const f of getAllFamilies()) out[f] = 0;
  return out;
}

function addVote(
  votes: Record<string, number>,
  reasons: string[],
  family: string,
  amount: number,
  reason: string,
) {
  votes[family] = (votes[family] ?? 0) + amount;
  reasons.push(`${family}+${amount.toFixed(2)}:${reason}`);
}

function featureAffinity(obs: V3Features, ref: SubmodelBaselineV3): number {
  let score = 0;
  let weight = 0;

  if (obs.cutoff) {
    weight += 1.2;
    if (obs.cutoff === ref.cutoff) score += 1.2;
  }

  const capKeys: Array<keyof V3Features["capability"]> = [
    "q1_strawberry", "q2_1000days", "q3_apples", "q4_prime", "q5_backwards",
  ];
  for (const k of capKeys) {
    if (!obs.capability[k]) continue;
    weight += 0.45;
    if (obs.capability[k] === ref.capability[k]) score += 0.45;
  }

  type RefusalFlagKey =
    | "starts_with_no" | "starts_with_sorry" | "starts_with_cant"
    | "cites_18_usc" | "mentions_988" | "mentions_virtually_all"
    | "mentions_history_alt" | "mentions_pyrotechnics" | "mentions_policies"
    | "mentions_guidelines" | "mentions_illegal" | "mentions_harmful";
  const flagKeys: RefusalFlagKey[] = [
    "starts_with_no", "starts_with_sorry", "starts_with_cant",
    "cites_18_usc", "mentions_988", "mentions_virtually_all",
    "mentions_history_alt", "mentions_pyrotechnics", "mentions_policies",
    "mentions_guidelines", "mentions_illegal", "mentions_harmful",
  ];
  for (const k of flagKeys) {
    weight += 0.12;
    if (obs.refusal[k] === ref.refusal[k]) score += 0.12;
  }

  if (obs.refusal.lead && ref.refusal.lead) {
    weight += 0.65;
    const a = obs.refusal.lead.slice(0, 20).toLowerCase();
    const b = ref.refusal.lead.slice(0, 20).toLowerCase();
    if (a === b) score += 0.65;
    else if (a.slice(0, 10) === b.slice(0, 10)) score += 0.35;
  }

  return weight > 0 ? score / weight : 0;
}

function addBaselineAffinityVotes(
  features: V3Features,
  baselines: SubmodelBaselineV3[],
  votes: Record<string, number>,
  reasons: string[],
) {
  const bestByFamily = new Map<string, { modelId: string; score: number }>();
  for (const ref of baselines) {
    const score = featureAffinity(features, ref);
    const prev = bestByFamily.get(ref.family);
    if (!prev || score > prev.score) {
      bestByFamily.set(ref.family, { modelId: ref.modelId, score });
    }
  }

  for (const [family, best] of bestByFamily) {
    const q5 = features.capability.q5_backwards;
    const qwenSpecificQ5 = q5 === "etadommodacc" || q5 === "etatidomoca";
    const capQwenAmbiguity = family === "qwen" && q5 != null && !qwenSpecificQ5;
    if (best.score >= 0.78) {
      addVote(votes, reasons, family, capQwenAmbiguity ? 0.35 : 1.5, `nearest ${best.modelId} ${best.score.toFixed(2)}`);
    } else if (best.score >= 0.66) {
      addVote(votes, reasons, family, capQwenAmbiguity ? 0.25 : 0.8, `nearest ${best.modelId} ${best.score.toFixed(2)}`);
    } else if (best.score >= 0.58) {
      addVote(votes, reasons, family, 0.35, `nearest ${best.modelId} ${best.score.toFixed(2)}`);
    }
  }
}

// V2B replaces the fragile first-match cascade with weighted evidence. Strong
// refusal signatures can still decide quickly, while cutoff/capability only
// contribute weak supporting votes. A minimum score and winner gap keep ambiguous
// "I cannot provide..." style responses from becoming false family mismatches.
export function implyFamilyV2BWithVotes(
  features: V3Features,
  baselines: SubmodelBaselineV3[] = V3_BASELINES,
  extraVotes: V3EFamilyVote[] = [],
): FamilyVoteResult {
  const r = features.refusal;
  const leadRaw = r.lead;
  const lead = leadRaw.toLowerCase();
  const votes = createFamilyVoteMap();
  const reasons: string[] = [];
  const cap = features.capability;

  const hasCurly = leadRaw.includes("\u2019");
  if (/i understand you['\u2019]?re asking/i.test(lead)) {
    addVote(votes, reasons, "deepseek", 4.0, "deepseek refusal lead");
  }

  if (hasCurly && /^i\s*can\u2019t/i.test(lead)) {
    addVote(votes, reasons, "openai", 3.0, "curly i-can't lead");
  }
  if (hasCurly && /^sorry\s*[\u2014\-]/i.test(lead)) {
    addVote(votes, reasons, "openai", 3.0, "curly sorry em-dash lead");
  }
  if (/^i['\u2019]?m\s+sorry/i.test(lead) && !r.mentions_harmful) {
    addVote(votes, reasons, "openai", 1.8, "short OpenAI-style sorry");
  }

  if (r.cites_18_usc) addVote(votes, reasons, "anthropic", 4.0, "18 USC citation");
  if (r.mentions_history_alt) addVote(votes, reasons, "anthropic", 3.0, "history alternate offer");
  if (r.mentions_virtually_all) addVote(votes, reasons, "anthropic", 3.0, "virtually all jurisdictions");
  if (r.mentions_pyrotechnics && lead.includes("i can")) addVote(votes, reasons, "anthropic", 2.0, "pyrotechnics refusal");
  if (/^no[\.,]/i.test(lead)) addVote(votes, reasons, "anthropic", 2.2, "No. refusal lead");
  if (/^i can['\u2019]?t\s+help\s+with/i.test(lead) && !hasCurly) {
    addVote(votes, reasons, "anthropic", 1.4, "straight i-can't-help lead");
  }
  if (/^i can['\u2019]?t\s+provide/i.test(lead) && !hasCurly) {
    addVote(votes, reasons, "anthropic", 1.2, "straight i-can't-provide lead");
  }
  if (/^i['\u2019]?m\s+not\s+going\s+to/i.test(lead)) {
    addVote(votes, reasons, "anthropic", 2.5, "not going to provide lead");
  }

  if (/^i\s+cannot\s+(answer|fulfill|help)/i.test(lead)) {
    addVote(votes, reasons, "google", 3.2, "Gemini cannot answer/fulfill/help lead");
  }
  if (/^i\s+cannot\s+provide/i.test(lead)) {
    addVote(votes, reasons, "qwen", 0.8, "generic cannot provide lead");
    addVote(votes, reasons, "zhipu", 0.8, "generic cannot provide lead");
    addVote(votes, reasons, "google", 0.5, "generic cannot provide lead");
  }

  if (/^i['\u2019]?m\s+sorry.{0,5}but.{0,5}i\s+can['\u2019]?t\s+provide/i.test(lead)) {
    const qwenSpecificQ5 = cap.q5_backwards === "etadommodacc" || cap.q5_backwards === "etatidomoca";
    addVote(votes, reasons, "qwen", qwenSpecificQ5 ? 1.8 : 0.7, "Qwen sorry-but-can't-provide lead");
  }

  if (features.cutoff) {
    if (/^2025-(0[1-6])$/.test(features.cutoff)) {
      addVote(votes, reasons, "anthropic", 0.5, `cutoff ${features.cutoff}`);
    }
    if (/^2023-(0[1-4])$/.test(features.cutoff)) {
      addVote(votes, reasons, "google", 0.45, `cutoff ${features.cutoff}`);
    }
    if (features.cutoff === "2024-06" || features.cutoff === "2024-10" || features.cutoff === "2025-08") {
      addVote(votes, reasons, "openai", 0.45, `cutoff ${features.cutoff}`);
    }
    if ((features.cutoff === "2023-10" || features.cutoff === "2024-01") && /^i\s+cannot\s+provide/i.test(lead)) {
      addVote(votes, reasons, "zhipu", 0.7, `zhipu-like cutoff ${features.cutoff}`);
    }
  }

  if (cap.q2_1000days === "sunday") addVote(votes, reasons, "anthropic", 0.35, "q2=sunday");
  if (cap.q2_1000days === "friday") {
    addVote(votes, reasons, "anthropic", 0.2, "q2=friday");
    addVote(votes, reasons, "google", 0.2, "q2=friday");
  }
  if (cap.q2_1000days === "monday") {
    addVote(votes, reasons, "openai", 0.2, "q2=monday");
    addVote(votes, reasons, "deepseek", 0.2, "q2=monday");
  }
  if (cap.q5_backwards && cap.q5_backwards !== "etadommocca") {
    if (cap.q5_backwards === "etadommodacc" || cap.q5_backwards === "etatidomoca") {
      addVote(votes, reasons, "qwen", 0.6, `q5=${cap.q5_backwards}`);
    }
    if (cap.q5_backwards === "etadomocca") {
      addVote(votes, reasons, "google", 0.45, `q5=${cap.q5_backwards}`);
    }
  }
  if (cap.q3_apples === "9") addVote(votes, reasons, "google", 0.5, "q3=9");

  addBaselineAffinityVotes(features, baselines, votes, reasons);
  for (const vote of extraVotes) {
    if (!vote.family || vote.weight <= 0) continue;
    addVote(votes, reasons, vote.family, vote.weight, vote.reason);
  }

  const ranked = Object.entries(votes).sort((a, b) => b[1] - a[1]);
  const [winnerFamily, score] = ranked[0] ?? [null, 0];
  const runnerUp = ranked[1]?.[1] ?? 0;
  const gap = score - runnerUp;
  const family = winnerFamily && score >= 1.65 && gap >= 0.45 ? winnerFamily : null;

  return { family, votes, score, gap, reasons };
}

export function implyFamilyV2B(features: V3Features): string | null {
  return implyFamilyV2BWithVotes(features).family;
}

export function implyFamily(features: V3Features): string | null {
  return implyFamilyV2B(features);
}

// ── Main classifier entrypoint ────────────────────────────────────────────
export function classifySubmodelV3(
  responses: Record<string, string>,
  options: {
    predictedFamily?: string;        // from V2 step 1; scopes matching to this family
    confidenceThreshold?: number;    // default 0.60
    rejectsTemperature?: boolean | null;  // from probe-run observation
  } = {},
): V3Output {
  const features = extractV3Features(responses, options.rejectsTemperature ?? null);
  const baselines = currentBaselines();
  const familyImplied = implyFamilyV2BWithVotes(
    features,
    baselines,
    inferFamilyVotesFromV3EResponses(responses),
  ).family;

  const threshold = options.confidenceThreshold ?? 0.60;
  const pool = options.predictedFamily
    ? baselines.filter(b => b.family === options.predictedFamily)
    : baselines;
  const uniquenessMap = buildUniquenessMap(baselines);

  if (pool.length === 0) {
    return {
      features,
      top: null,
      candidates: [],
      familyImplied,
      familyMismatch: false,
      abstained: false,
    };
  }

  const scored = pool.map(ref => {
    const { score, matched, divergent } = scoreMatch(features, ref, uniquenessMap);
    return {
      modelId: ref.modelId,
      family: ref.family,
      displayName: ref.displayName,
      score,
      matchedFeatures: matched,
      divergentFeatures: divergent,
    };
  });

  scored.sort((a, b) => b.score - a.score);

  const candidates = scored.slice(0, 3);
  const firstMatch = scored[0] ?? null;
  const runnerUp = scored[1];
  const gap = firstMatch && runnerUp ? firstMatch.score - runnerUp.score : Infinity;
  const abstained = firstMatch !== null && gap < TIE_BREAK_GAP;
  const top = (firstMatch && firstMatch.score >= threshold && !abstained) ? firstMatch : null;
  const familyMismatch = Boolean(
    options.predictedFamily && familyImplied && familyImplied !== options.predictedFamily,
  );

  return {
    features,
    top,
    candidates,
    familyImplied,
    familyMismatch,
    abstained,
  };
}

/** Re-score a previously-extracted V3Features vector (e.g. from probe_history
 * JSON) against the current baselines. Used by scripts/v3-scorer-replay.mts
 * to compare old-scorer vs new-scorer results without re-calling upstream. */
export function scoreExtractedFeatures(features: V3Features): V3Output {
  const baselines = currentBaselines();
  const familyImplied = implyFamilyV2BWithVotes(features, baselines).family;
  const pool = familyImplied ? baselines.filter(b => b.family === familyImplied) : baselines;
  const uniquenessMap = buildUniquenessMap(baselines);

  const matches: V3Match[] = pool.map(ref => {
    const { score, matched, divergent } = scoreMatch(features, ref, uniquenessMap);
    return {
      modelId: ref.modelId, family: ref.family, displayName: ref.displayName,
      score, matchedFeatures: matched, divergentFeatures: divergent,
    };
  });

  const sorted = [...matches].sort((a, b) => b.score - a.score);
  const candidates = sorted.slice(0, 3);
  const firstMatch = sorted[0] ?? null;
  const runnerUp = sorted[1];
  const gap = firstMatch && runnerUp ? firstMatch.score - runnerUp.score : Infinity;
  const abstained = firstMatch !== null && gap < TIE_BREAK_GAP;

  return {
    features,
    top: abstained ? null : firstMatch,
    candidates,
    familyImplied,
    familyMismatch: false, // no claimed family context in replay mode
    abstained,
  };
}

// ── Test helper: assert pairwise uniqueness across the fixture ────────────
export function verifyPairwiseUniqueness(): { unique: boolean; collisions: Array<[string, string]> } {
  const collisions: Array<[string, string]> = [];
  for (let i = 0; i < V3_BASELINES.length; i++) {
    for (let j = i + 1; j < V3_BASELINES.length; j++) {
      const a = V3_BASELINES[i];
      const b = V3_BASELINES[j];
      // pairwise discrimination only required within same family
      if (a.family !== b.family) continue;
      const sigA = JSON.stringify({ c: a.cutoff, q: a.capability, r: a.refusal });
      const sigB = JSON.stringify({ c: b.cutoff, q: b.capability, r: b.refusal });
      if (sigA === sigB) collisions.push([a.modelId, b.modelId]);
    }
  }
  return { unique: collisions.length === 0, collisions };
}

export { V3_BASELINES, getAllFamilies };
