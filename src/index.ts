// src/index.ts — Public API for @bazaarlink/probe-engine (MIT)

export { runProbes } from "./runner.js";
export type { RunOptions, RunReport, ProbeResult, BaselineMap } from "./runner.js";

export { PROBE_SUITE, autoScore, generateCanary } from "./probe-suite.js";
export type { ProbeDefinition, ProbeGroup, ScoringMode } from "./probe-suite.js";

export { computeProbeScore } from "./probe-score.js";
export type { ProbeRunItemLike } from "./probe-score.js";

export { classifyPreflightResult } from "./probe-preflight.js";
export type { PreflightOutcome } from "./probe-preflight.js";

export { detectTokenInflation, TOKEN_INFLATION_THRESHOLD } from "./token-inflation.js";
export type { TokenInflationResult } from "./token-inflation.js";

export { checkSSECompliance } from "./sse-compliance.js";
export type { SSEComplianceResult } from "./sse-compliance.js";

export { runContextCheck } from "./context-check.js";
export type { ContextCheckResult } from "./context-check.js";

export { extractFingerprint } from "./fingerprint-extractor.js";
export type { FingerprintFeatureSet, IdentityAssessment, IdentityCandidate, IdentityStatus } from "./identity-report.js";
export { matchCandidates, deriveVerdict, deriveVerdictFromClaimedModel } from "./candidate-matcher.js";
export { FAMILY_BASELINES, claimedModelToFamily } from "./fingerprint-baseline.js";
export type { FamilyBaseline } from "./fingerprint-baseline.js";

// ── New v0.3.0 modules ────────────────────────────────────────────────────
export { classifyChannelSignature } from "./channel-signature.js";
export type { ChannelLabel, ChannelSignature, ChannelSignatureInput } from "./channel-signature.js";

export { extractThinkingBlock, verifySignatureRoundtrip } from "./signature-probe.js";
export type { AnthropicThinkingBlock, VerifyArgs, VerifyResult } from "./signature-probe.js";

export { judgeFingerprint } from "./fingerprint-judge.js";
export type { JudgeIdentityResult } from "./fingerprint-judge.js";

export { cosineSimilarity, embedProbeResponses, pickTopVectorScores } from "./fingerprint-vectors.js";
export type { ReferenceEmbedding } from "./fingerprint-vectors.js";

export { fuseScores } from "./fingerprint-fusion.js";

// ── New v0.4.0 modules ────────────────────────────────────────────────────
export { CANARY_BENCH, scoreCanaryAnswer } from "./canary-bench.js";
export type { CanaryItem, CanaryAnswerResult, CanaryCategory } from "./canary-bench.js";

export { runCanary } from "./canary-runner.js";
export type { CanaryInput, CanaryResult } from "./canary-runner.js";

export { parseJudgeThreshold, resolveJudgeConfig } from "./probe-judge-config.js";
export type { JudgeConfig } from "./probe-judge-config.js";

export { flattenFeatures, flattenSubModelSignals, matchSubModels } from "./sub-model-matcher.js";
export type { SubModelCandidate, StoredModelFingerprint } from "./sub-model-matcher.js";

// ── v0.6.0: Three-way cross-check (surface / behavior / v3) ───────────────
// Identity verdict: the "三向交叉" logic that cross-checks three independent
// fingerprint signals against the claimed model family to flag spoofing.
export { computeVerdict, V3_HIGH_CONFIDENCE } from "./identity-verdict.js";
export type {
  VerdictStatus,
  VerdictInput,
  VerdictResult,
  ConfidenceBand,
} from "./identity-verdict.js";

// V3 deterministic sub-model classifier: uses submodel_cutoff / submodel_capability /
// submodel_refusal probes to identify the exact sub-model (e.g. Claude Opus 4.6 vs 4.7).
export {
  classifySubmodelV3,
  scoreExtractedFeatures,
  extractV3Features,
  extractCutoff as extractV3Cutoff,
  extractCapability as extractV3Capability,
  extractRefusal as extractV3Refusal,
  implyFamily as implyFamilyV3,
  lengthScoreLogGaussian,
  verifyPairwiseUniqueness,
  V3_BASELINES,
  getBaselinesForFamily,
  getAllFamilies,
  TIE_BREAK_GAP,
} from "./sub-model-classifier-v3.js";
export type {
  V3Features,
  V3Match,
  V3Output,
  ClassifySubmodelV3Options,
} from "./sub-model-classifier-v3.js";
export type { SubmodelBaselineV3 } from "./sub-model-baselines-v3.js";

export {
  buildUniquenessMap,
  uniquenessBoost,
  UNIQUENESS_BOOST_PER_MATCH,
  UNIQUENESS_BOOST_CAP,
} from "./sub-model-v3-uniqueness.js";

export { shouldAbstainSubModel } from "./submodel-abstain.js";
export type { AbstainInput } from "./submodel-abstain.js";

export { hasUsableLingData } from "./identity-phase-gate.js";

// ── v0.7.0: Layer ④ — Behavioral-Vector Extension (V3E + V3F) ─────────────
// Refusal-boundary ladder + formatting + uncertainty channels for same-family
// sibling discrimination. See paper §3.6 in
// docs/reports/2026-04-26-llm-resale-substitution-measurement-paper.md.

export {
  classifySubmodelV3E,
  scoreV3EMatch,
  extractRefusalLadder,
  extractFormatting,
  extractUncertainty,
  DEFAULT_V3E_WEIGHTS,
} from "./sub-model-classifier-v3e.js";
export type {
  V3EObserved,
  V3EMatch,
  V3EOutput,
  V3EWeights,
  RefusalLadderFeatures,
  FormattingFeatures,
  UncertaintyFeatures,
} from "./sub-model-classifier-v3e.js";

export { classifySubmodelV3F, scoreV3FMatch } from "./sub-model-classifier-v3f.js";
export type { V3FMatch, V3FOutput } from "./sub-model-classifier-v3f.js";

export type { SubmodelBaselineV3E, V3EBaselineSnapshot } from "./sub-model-baselines-v3e.js";

export {
  loadV3EBaselinesFromSnapshot,
  setV3EBaselines,
  getCachedV3EBaselines,
  clearV3ECache,
} from "./sub-model-baselines-v3e-store.js";
