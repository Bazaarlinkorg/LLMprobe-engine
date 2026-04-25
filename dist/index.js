"use strict";
// src/index.ts — Public API for @bazaarlink/probe-engine (MIT)
Object.defineProperty(exports, "__esModule", { value: true });
exports.UNIQUENESS_BOOST_PER_MATCH = exports.uniquenessBoost = exports.buildUniquenessMap = exports.TIE_BREAK_GAP = exports.getAllFamilies = exports.getBaselinesForFamily = exports.V3_BASELINES = exports.verifyPairwiseUniqueness = exports.lengthScoreLogGaussian = exports.implyFamilyV3 = exports.extractV3Refusal = exports.extractV3Capability = exports.extractV3Cutoff = exports.extractV3Features = exports.scoreExtractedFeatures = exports.classifySubmodelV3 = exports.V3_HIGH_CONFIDENCE = exports.computeVerdict = exports.matchSubModels = exports.flattenSubModelSignals = exports.flattenFeatures = exports.resolveJudgeConfig = exports.parseJudgeThreshold = exports.runCanary = exports.scoreCanaryAnswer = exports.CANARY_BENCH = exports.fuseScores = exports.pickTopVectorScores = exports.embedProbeResponses = exports.cosineSimilarity = exports.judgeFingerprint = exports.verifySignatureRoundtrip = exports.extractThinkingBlock = exports.classifyChannelSignature = exports.claimedModelToFamily = exports.FAMILY_BASELINES = exports.deriveVerdictFromClaimedModel = exports.deriveVerdict = exports.matchCandidates = exports.extractFingerprint = exports.runContextCheck = exports.checkSSECompliance = exports.TOKEN_INFLATION_THRESHOLD = exports.detectTokenInflation = exports.classifyPreflightResult = exports.computeProbeScore = exports.generateCanary = exports.autoScore = exports.PROBE_SUITE = exports.runProbes = void 0;
exports.clearV3ECache = exports.getCachedV3EBaselines = exports.setV3EBaselines = exports.loadV3EBaselinesFromSnapshot = exports.scoreV3FMatch = exports.classifySubmodelV3F = exports.DEFAULT_V3E_WEIGHTS = exports.extractUncertainty = exports.extractFormatting = exports.extractRefusalLadder = exports.scoreV3EMatch = exports.classifySubmodelV3E = exports.hasUsableLingData = exports.shouldAbstainSubModel = exports.UNIQUENESS_BOOST_CAP = void 0;
var runner_js_1 = require("./runner.js");
Object.defineProperty(exports, "runProbes", { enumerable: true, get: function () { return runner_js_1.runProbes; } });
var probe_suite_js_1 = require("./probe-suite.js");
Object.defineProperty(exports, "PROBE_SUITE", { enumerable: true, get: function () { return probe_suite_js_1.PROBE_SUITE; } });
Object.defineProperty(exports, "autoScore", { enumerable: true, get: function () { return probe_suite_js_1.autoScore; } });
Object.defineProperty(exports, "generateCanary", { enumerable: true, get: function () { return probe_suite_js_1.generateCanary; } });
var probe_score_js_1 = require("./probe-score.js");
Object.defineProperty(exports, "computeProbeScore", { enumerable: true, get: function () { return probe_score_js_1.computeProbeScore; } });
var probe_preflight_js_1 = require("./probe-preflight.js");
Object.defineProperty(exports, "classifyPreflightResult", { enumerable: true, get: function () { return probe_preflight_js_1.classifyPreflightResult; } });
var token_inflation_js_1 = require("./token-inflation.js");
Object.defineProperty(exports, "detectTokenInflation", { enumerable: true, get: function () { return token_inflation_js_1.detectTokenInflation; } });
Object.defineProperty(exports, "TOKEN_INFLATION_THRESHOLD", { enumerable: true, get: function () { return token_inflation_js_1.TOKEN_INFLATION_THRESHOLD; } });
var sse_compliance_js_1 = require("./sse-compliance.js");
Object.defineProperty(exports, "checkSSECompliance", { enumerable: true, get: function () { return sse_compliance_js_1.checkSSECompliance; } });
var context_check_js_1 = require("./context-check.js");
Object.defineProperty(exports, "runContextCheck", { enumerable: true, get: function () { return context_check_js_1.runContextCheck; } });
var fingerprint_extractor_js_1 = require("./fingerprint-extractor.js");
Object.defineProperty(exports, "extractFingerprint", { enumerable: true, get: function () { return fingerprint_extractor_js_1.extractFingerprint; } });
var candidate_matcher_js_1 = require("./candidate-matcher.js");
Object.defineProperty(exports, "matchCandidates", { enumerable: true, get: function () { return candidate_matcher_js_1.matchCandidates; } });
Object.defineProperty(exports, "deriveVerdict", { enumerable: true, get: function () { return candidate_matcher_js_1.deriveVerdict; } });
Object.defineProperty(exports, "deriveVerdictFromClaimedModel", { enumerable: true, get: function () { return candidate_matcher_js_1.deriveVerdictFromClaimedModel; } });
var fingerprint_baseline_js_1 = require("./fingerprint-baseline.js");
Object.defineProperty(exports, "FAMILY_BASELINES", { enumerable: true, get: function () { return fingerprint_baseline_js_1.FAMILY_BASELINES; } });
Object.defineProperty(exports, "claimedModelToFamily", { enumerable: true, get: function () { return fingerprint_baseline_js_1.claimedModelToFamily; } });
// ── New v0.3.0 modules ────────────────────────────────────────────────────
var channel_signature_js_1 = require("./channel-signature.js");
Object.defineProperty(exports, "classifyChannelSignature", { enumerable: true, get: function () { return channel_signature_js_1.classifyChannelSignature; } });
var signature_probe_js_1 = require("./signature-probe.js");
Object.defineProperty(exports, "extractThinkingBlock", { enumerable: true, get: function () { return signature_probe_js_1.extractThinkingBlock; } });
Object.defineProperty(exports, "verifySignatureRoundtrip", { enumerable: true, get: function () { return signature_probe_js_1.verifySignatureRoundtrip; } });
var fingerprint_judge_js_1 = require("./fingerprint-judge.js");
Object.defineProperty(exports, "judgeFingerprint", { enumerable: true, get: function () { return fingerprint_judge_js_1.judgeFingerprint; } });
var fingerprint_vectors_js_1 = require("./fingerprint-vectors.js");
Object.defineProperty(exports, "cosineSimilarity", { enumerable: true, get: function () { return fingerprint_vectors_js_1.cosineSimilarity; } });
Object.defineProperty(exports, "embedProbeResponses", { enumerable: true, get: function () { return fingerprint_vectors_js_1.embedProbeResponses; } });
Object.defineProperty(exports, "pickTopVectorScores", { enumerable: true, get: function () { return fingerprint_vectors_js_1.pickTopVectorScores; } });
var fingerprint_fusion_js_1 = require("./fingerprint-fusion.js");
Object.defineProperty(exports, "fuseScores", { enumerable: true, get: function () { return fingerprint_fusion_js_1.fuseScores; } });
// ── New v0.4.0 modules ────────────────────────────────────────────────────
var canary_bench_js_1 = require("./canary-bench.js");
Object.defineProperty(exports, "CANARY_BENCH", { enumerable: true, get: function () { return canary_bench_js_1.CANARY_BENCH; } });
Object.defineProperty(exports, "scoreCanaryAnswer", { enumerable: true, get: function () { return canary_bench_js_1.scoreCanaryAnswer; } });
var canary_runner_js_1 = require("./canary-runner.js");
Object.defineProperty(exports, "runCanary", { enumerable: true, get: function () { return canary_runner_js_1.runCanary; } });
var probe_judge_config_js_1 = require("./probe-judge-config.js");
Object.defineProperty(exports, "parseJudgeThreshold", { enumerable: true, get: function () { return probe_judge_config_js_1.parseJudgeThreshold; } });
Object.defineProperty(exports, "resolveJudgeConfig", { enumerable: true, get: function () { return probe_judge_config_js_1.resolveJudgeConfig; } });
var sub_model_matcher_js_1 = require("./sub-model-matcher.js");
Object.defineProperty(exports, "flattenFeatures", { enumerable: true, get: function () { return sub_model_matcher_js_1.flattenFeatures; } });
Object.defineProperty(exports, "flattenSubModelSignals", { enumerable: true, get: function () { return sub_model_matcher_js_1.flattenSubModelSignals; } });
Object.defineProperty(exports, "matchSubModels", { enumerable: true, get: function () { return sub_model_matcher_js_1.matchSubModels; } });
// ── v0.6.0: Three-way cross-check (surface / behavior / v3) ───────────────
// Identity verdict: the "三向交叉" logic that cross-checks three independent
// fingerprint signals against the claimed model family to flag spoofing.
var identity_verdict_js_1 = require("./identity-verdict.js");
Object.defineProperty(exports, "computeVerdict", { enumerable: true, get: function () { return identity_verdict_js_1.computeVerdict; } });
Object.defineProperty(exports, "V3_HIGH_CONFIDENCE", { enumerable: true, get: function () { return identity_verdict_js_1.V3_HIGH_CONFIDENCE; } });
// V3 deterministic sub-model classifier: uses submodel_cutoff / submodel_capability /
// submodel_refusal probes to identify the exact sub-model (e.g. Claude Opus 4.6 vs 4.7).
var sub_model_classifier_v3_js_1 = require("./sub-model-classifier-v3.js");
Object.defineProperty(exports, "classifySubmodelV3", { enumerable: true, get: function () { return sub_model_classifier_v3_js_1.classifySubmodelV3; } });
Object.defineProperty(exports, "scoreExtractedFeatures", { enumerable: true, get: function () { return sub_model_classifier_v3_js_1.scoreExtractedFeatures; } });
Object.defineProperty(exports, "extractV3Features", { enumerable: true, get: function () { return sub_model_classifier_v3_js_1.extractV3Features; } });
Object.defineProperty(exports, "extractV3Cutoff", { enumerable: true, get: function () { return sub_model_classifier_v3_js_1.extractCutoff; } });
Object.defineProperty(exports, "extractV3Capability", { enumerable: true, get: function () { return sub_model_classifier_v3_js_1.extractCapability; } });
Object.defineProperty(exports, "extractV3Refusal", { enumerable: true, get: function () { return sub_model_classifier_v3_js_1.extractRefusal; } });
Object.defineProperty(exports, "implyFamilyV3", { enumerable: true, get: function () { return sub_model_classifier_v3_js_1.implyFamily; } });
Object.defineProperty(exports, "lengthScoreLogGaussian", { enumerable: true, get: function () { return sub_model_classifier_v3_js_1.lengthScoreLogGaussian; } });
Object.defineProperty(exports, "verifyPairwiseUniqueness", { enumerable: true, get: function () { return sub_model_classifier_v3_js_1.verifyPairwiseUniqueness; } });
Object.defineProperty(exports, "V3_BASELINES", { enumerable: true, get: function () { return sub_model_classifier_v3_js_1.V3_BASELINES; } });
Object.defineProperty(exports, "getBaselinesForFamily", { enumerable: true, get: function () { return sub_model_classifier_v3_js_1.getBaselinesForFamily; } });
Object.defineProperty(exports, "getAllFamilies", { enumerable: true, get: function () { return sub_model_classifier_v3_js_1.getAllFamilies; } });
Object.defineProperty(exports, "TIE_BREAK_GAP", { enumerable: true, get: function () { return sub_model_classifier_v3_js_1.TIE_BREAK_GAP; } });
var sub_model_v3_uniqueness_js_1 = require("./sub-model-v3-uniqueness.js");
Object.defineProperty(exports, "buildUniquenessMap", { enumerable: true, get: function () { return sub_model_v3_uniqueness_js_1.buildUniquenessMap; } });
Object.defineProperty(exports, "uniquenessBoost", { enumerable: true, get: function () { return sub_model_v3_uniqueness_js_1.uniquenessBoost; } });
Object.defineProperty(exports, "UNIQUENESS_BOOST_PER_MATCH", { enumerable: true, get: function () { return sub_model_v3_uniqueness_js_1.UNIQUENESS_BOOST_PER_MATCH; } });
Object.defineProperty(exports, "UNIQUENESS_BOOST_CAP", { enumerable: true, get: function () { return sub_model_v3_uniqueness_js_1.UNIQUENESS_BOOST_CAP; } });
var submodel_abstain_js_1 = require("./submodel-abstain.js");
Object.defineProperty(exports, "shouldAbstainSubModel", { enumerable: true, get: function () { return submodel_abstain_js_1.shouldAbstainSubModel; } });
var identity_phase_gate_js_1 = require("./identity-phase-gate.js");
Object.defineProperty(exports, "hasUsableLingData", { enumerable: true, get: function () { return identity_phase_gate_js_1.hasUsableLingData; } });
// ── v0.7.0: Layer ④ — Behavioral-Vector Extension (V3E + V3F) ─────────────
// Refusal-boundary ladder + formatting + uncertainty channels for same-family
// sibling discrimination. See paper §3.6 in
// docs/reports/2026-04-26-llm-resale-substitution-measurement-paper.md.
var sub_model_classifier_v3e_js_1 = require("./sub-model-classifier-v3e.js");
Object.defineProperty(exports, "classifySubmodelV3E", { enumerable: true, get: function () { return sub_model_classifier_v3e_js_1.classifySubmodelV3E; } });
Object.defineProperty(exports, "scoreV3EMatch", { enumerable: true, get: function () { return sub_model_classifier_v3e_js_1.scoreV3EMatch; } });
Object.defineProperty(exports, "extractRefusalLadder", { enumerable: true, get: function () { return sub_model_classifier_v3e_js_1.extractRefusalLadder; } });
Object.defineProperty(exports, "extractFormatting", { enumerable: true, get: function () { return sub_model_classifier_v3e_js_1.extractFormatting; } });
Object.defineProperty(exports, "extractUncertainty", { enumerable: true, get: function () { return sub_model_classifier_v3e_js_1.extractUncertainty; } });
Object.defineProperty(exports, "DEFAULT_V3E_WEIGHTS", { enumerable: true, get: function () { return sub_model_classifier_v3e_js_1.DEFAULT_V3E_WEIGHTS; } });
var sub_model_classifier_v3f_js_1 = require("./sub-model-classifier-v3f.js");
Object.defineProperty(exports, "classifySubmodelV3F", { enumerable: true, get: function () { return sub_model_classifier_v3f_js_1.classifySubmodelV3F; } });
Object.defineProperty(exports, "scoreV3FMatch", { enumerable: true, get: function () { return sub_model_classifier_v3f_js_1.scoreV3FMatch; } });
var sub_model_baselines_v3e_store_js_1 = require("./sub-model-baselines-v3e-store.js");
Object.defineProperty(exports, "loadV3EBaselinesFromSnapshot", { enumerable: true, get: function () { return sub_model_baselines_v3e_store_js_1.loadV3EBaselinesFromSnapshot; } });
Object.defineProperty(exports, "setV3EBaselines", { enumerable: true, get: function () { return sub_model_baselines_v3e_store_js_1.setV3EBaselines; } });
Object.defineProperty(exports, "getCachedV3EBaselines", { enumerable: true, get: function () { return sub_model_baselines_v3e_store_js_1.getCachedV3EBaselines; } });
Object.defineProperty(exports, "clearV3ECache", { enumerable: true, get: function () { return sub_model_baselines_v3e_store_js_1.clearV3ECache; } });
//# sourceMappingURL=index.js.map