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
