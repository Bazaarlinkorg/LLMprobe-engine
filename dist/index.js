"use strict";
// src/index.ts — Public API for @bazaarlink/probe-engine (MIT)
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyPairwiseUniqueness = exports.lengthScoreLogGaussian = exports.implyFamilyV2BWithVotes = exports.implyFamilyV2B = exports.implyFamilyV2A = exports.implyFamilyV3 = exports.extractV3Refusal = exports.extractV3Capability = exports.extractV3Cutoff = exports.extractV3Features = exports.scoreExtractedFeatures = exports.classifySubmodelV3 = exports.AMBIGUOUS_DOWNGRADE_MAX_BEHAVIOR_SCORE = exports.AMBIGUOUS_DOWNGRADE_MIN_FAMILY_CONFIDENCE = exports.V3_HIGH_CONFIDENCE = exports.recomputeVerdictAfterV3HOverride = exports.resolveV3HVerdictPatch = exports.computeVerdict = exports.matchSubModels = exports.flattenSubModelSignals = exports.flattenFeatures = exports.resolveJudgeConfig = exports.parseJudgeThreshold = exports.runCanary = exports.scoreCanaryAnswer = exports.CANARY_BENCH = exports.fuseScores = exports.pickTopVectorScores = exports.embedProbeResponses = exports.cosineSimilarity = exports.judgeFingerprint = exports.verifySignatureRoundtrip = exports.extractThinkingBlock = exports.classifyChannelSignature = exports.claimedModelToFamily = exports.FAMILY_BASELINES = exports.deriveVerdictFromClaimedModel = exports.deriveVerdict = exports.matchCandidates = exports.extractFingerprint = exports.runContextCheck = exports.checkSSECompliance = exports.TOKEN_INFLATION_THRESHOLD = exports.detectTokenInflation = exports.classifyPreflightResult = exports.computeProbeScore = exports.generateCanary = exports.autoScore = exports.PROBE_SUITE = exports.runProbes = void 0;
exports.normalizeModelCore = exports.BIAS_BASELINES = exports.sampleV3HDistributionFingerprint = exports.sampleBiasFingerprint = exports.biasDisplayName = exports.candidateSiblingsForConfirmedFamily = exports.candidateSiblingsForFamily = exports.candidateSiblingsFor = exports.selectBiasProbesForCandidates = exports.policyForCandidates = exports.V3H_ACTIVE_PROMPT_POLICIES = exports.filterFreshBiasBaselines = exports.shouldFillSubModelFromV3G = exports.hasV3HSeparator = exports.regateV3HResult = exports.isFalseAbstain = exports.requiredStrongPassGap = exports.isStrongPassByPolicy = exports.shouldPromoteSubModelFromV3H = exports.scoreV3HDistributionFingerprint = exports.scoreBiasFingerprint = exports.normalizeBiasAnswer = exports.BIAS_PROBES = exports.FAMILY_VETO_CONFIDENCE = exports.V3F_TIEBREAKER_GAP_MAX = exports.V3F_TIEBREAKER_THRESHOLD = exports.V4_GLOBAL_CONFIDENCE_THRESHOLD = exports.fuseToV4 = exports.clearV3ECache = exports.getCachedV3EBaselines = exports.setV3EBaselines = exports.loadV3EBaselinesFromSnapshot = exports.scoreV3FMatch = exports.classifySubmodelV3F = exports.DEFAULT_V3E_WEIGHTS = exports.extractUncertainty = exports.extractFormatting = exports.extractRefusalLadder = exports.scoreV3EMatch = exports.classifySubmodelV3E = exports.hasUsableLingData = exports.shouldAbstainSubModel = exports.UNIQUENESS_BOOST_CAP = exports.UNIQUENESS_BOOST_PER_MATCH = exports.uniquenessBoost = exports.buildUniquenessMap = exports.getBaselinesForFamily = exports.TIE_BREAK_GAP = exports.getAllFamilies = exports.V3_BASELINES = void 0;
exports.bayesianScoreDisplayCalibrated = exports.baselinesFromDbRows = exports.identifySubModelBayesian = exports.matchSubModelsLinguistic = exports.flattenLinguisticFeatures = exports.extractPiDistributionFeatures = exports.extractSubModelFeatures = exports.invalidateBaselineCache = exports.getCachedFamilies = exports.getCachedBaselinesForFamily = exports.getCachedBaselines = exports.defaultBaselineStore = exports.createBaselineStore = exports.classifyIdentityV2B = exports.classifyIdentityV2A = exports.classifyIdentityV2 = exports.relativeCategoryFitness = exports.categoryHitRate = exports.computeAccuracy = exports.scoreFullFeatureSet = exports.scoreLinguisticOnly = exports.modelIdToFamily = exports.baselineModelIdToFamily = exports.responseSimilarity = exports.computeBaselineMatchVotes = exports.BAYESIAN_CONFIDENCE_THRESHOLD = exports.scoreSubModels = exports.IKP_PROBE_IDS = exports.fuseV3WithIKP = exports.classifySubmodelIKP = exports.fuseFamily = exports.detectNativeEmptyRefusal = exports.filterDetectable = exports.isDetectionDisabled = exports.DETECTION_DISABLED_MODEL_IDS = exports.injectBlanks = exports.thinBiasSamples = exports.wrapResponses = exports.blankRefusals = exports.baseModelId = exports.canonicalizeModelId = exports.modelIdsMatch = exports.canonicalFamily = void 0;
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
Object.defineProperty(exports, "resolveV3HVerdictPatch", { enumerable: true, get: function () { return identity_verdict_js_1.resolveV3HVerdictPatch; } });
Object.defineProperty(exports, "recomputeVerdictAfterV3HOverride", { enumerable: true, get: function () { return identity_verdict_js_1.recomputeVerdictAfterV3HOverride; } });
Object.defineProperty(exports, "V3_HIGH_CONFIDENCE", { enumerable: true, get: function () { return identity_verdict_js_1.V3_HIGH_CONFIDENCE; } });
Object.defineProperty(exports, "AMBIGUOUS_DOWNGRADE_MIN_FAMILY_CONFIDENCE", { enumerable: true, get: function () { return identity_verdict_js_1.AMBIGUOUS_DOWNGRADE_MIN_FAMILY_CONFIDENCE; } });
Object.defineProperty(exports, "AMBIGUOUS_DOWNGRADE_MAX_BEHAVIOR_SCORE", { enumerable: true, get: function () { return identity_verdict_js_1.AMBIGUOUS_DOWNGRADE_MAX_BEHAVIOR_SCORE; } });
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
Object.defineProperty(exports, "implyFamilyV2A", { enumerable: true, get: function () { return sub_model_classifier_v3_js_1.implyFamilyV2A; } });
Object.defineProperty(exports, "implyFamilyV2B", { enumerable: true, get: function () { return sub_model_classifier_v3_js_1.implyFamilyV2B; } });
Object.defineProperty(exports, "implyFamilyV2BWithVotes", { enumerable: true, get: function () { return sub_model_classifier_v3_js_1.implyFamilyV2BWithVotes; } });
Object.defineProperty(exports, "lengthScoreLogGaussian", { enumerable: true, get: function () { return sub_model_classifier_v3_js_1.lengthScoreLogGaussian; } });
Object.defineProperty(exports, "verifyPairwiseUniqueness", { enumerable: true, get: function () { return sub_model_classifier_v3_js_1.verifyPairwiseUniqueness; } });
Object.defineProperty(exports, "V3_BASELINES", { enumerable: true, get: function () { return sub_model_classifier_v3_js_1.V3_BASELINES; } });
Object.defineProperty(exports, "getAllFamilies", { enumerable: true, get: function () { return sub_model_classifier_v3_js_1.getAllFamilies; } });
Object.defineProperty(exports, "TIE_BREAK_GAP", { enumerable: true, get: function () { return sub_model_classifier_v3_js_1.TIE_BREAK_GAP; } });
var sub_model_baselines_v3_js_1 = require("./sub-model-baselines-v3.js");
Object.defineProperty(exports, "getBaselinesForFamily", { enumerable: true, get: function () { return sub_model_baselines_v3_js_1.getBaselinesForFamily; } });
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
// ── v0.8.0: V4 Ensemble Fuse + IKP knowledge probes ──────────────────────
// V4 fuses V3 Scoped + V3 Global + IKP + V3F via 4-tier priority.
// See docs/reports/2026-05-10-v4-attack-accuracy.md.
var sub_model_classifier_v4_js_1 = require("./sub-model-classifier-v4.js");
Object.defineProperty(exports, "fuseToV4", { enumerable: true, get: function () { return sub_model_classifier_v4_js_1.fuseToV4; } });
Object.defineProperty(exports, "V4_GLOBAL_CONFIDENCE_THRESHOLD", { enumerable: true, get: function () { return sub_model_classifier_v4_js_1.V4_GLOBAL_CONFIDENCE_THRESHOLD; } });
Object.defineProperty(exports, "V3F_TIEBREAKER_THRESHOLD", { enumerable: true, get: function () { return sub_model_classifier_v4_js_1.V3F_TIEBREAKER_THRESHOLD; } });
Object.defineProperty(exports, "V3F_TIEBREAKER_GAP_MAX", { enumerable: true, get: function () { return sub_model_classifier_v4_js_1.V3F_TIEBREAKER_GAP_MAX; } });
var sub_model_classifier_v4_js_2 = require("./sub-model-classifier-v4.js");
Object.defineProperty(exports, "FAMILY_VETO_CONFIDENCE", { enumerable: true, get: function () { return sub_model_classifier_v4_js_2.FAMILY_VETO_CONFIDENCE; } });
// ── V3G/V3H border-probe bias-fingerprint layer ──────────────────────────
var sub_model_bias_probes_js_1 = require("./sub-model-bias-probes.js");
Object.defineProperty(exports, "BIAS_PROBES", { enumerable: true, get: function () { return sub_model_bias_probes_js_1.BIAS_PROBES; } });
Object.defineProperty(exports, "normalizeBiasAnswer", { enumerable: true, get: function () { return sub_model_bias_probes_js_1.normalizeBiasAnswer; } });
var sub_model_v3g_bias_fingerprint_js_1 = require("./sub-model-v3g-bias-fingerprint.js");
Object.defineProperty(exports, "scoreBiasFingerprint", { enumerable: true, get: function () { return sub_model_v3g_bias_fingerprint_js_1.scoreBiasFingerprint; } });
Object.defineProperty(exports, "scoreV3HDistributionFingerprint", { enumerable: true, get: function () { return sub_model_v3g_bias_fingerprint_js_1.scoreV3HDistributionFingerprint; } });
Object.defineProperty(exports, "shouldPromoteSubModelFromV3H", { enumerable: true, get: function () { return sub_model_v3g_bias_fingerprint_js_1.shouldPromoteSubModelFromV3H; } });
Object.defineProperty(exports, "isStrongPassByPolicy", { enumerable: true, get: function () { return sub_model_v3g_bias_fingerprint_js_1.isStrongPassByPolicy; } });
Object.defineProperty(exports, "requiredStrongPassGap", { enumerable: true, get: function () { return sub_model_v3g_bias_fingerprint_js_1.requiredStrongPassGap; } });
Object.defineProperty(exports, "isFalseAbstain", { enumerable: true, get: function () { return sub_model_v3g_bias_fingerprint_js_1.isFalseAbstain; } });
Object.defineProperty(exports, "regateV3HResult", { enumerable: true, get: function () { return sub_model_v3g_bias_fingerprint_js_1.regateV3HResult; } });
Object.defineProperty(exports, "hasV3HSeparator", { enumerable: true, get: function () { return sub_model_v3g_bias_fingerprint_js_1.hasV3HSeparator; } });
Object.defineProperty(exports, "shouldFillSubModelFromV3G", { enumerable: true, get: function () { return sub_model_v3g_bias_fingerprint_js_1.shouldFillSubModelFromV3G; } });
Object.defineProperty(exports, "filterFreshBiasBaselines", { enumerable: true, get: function () { return sub_model_v3g_bias_fingerprint_js_1.filterFreshBiasBaselines; } });
Object.defineProperty(exports, "V3H_ACTIVE_PROMPT_POLICIES", { enumerable: true, get: function () { return sub_model_v3g_bias_fingerprint_js_1.V3H_ACTIVE_PROMPT_POLICIES; } });
Object.defineProperty(exports, "policyForCandidates", { enumerable: true, get: function () { return sub_model_v3g_bias_fingerprint_js_1.policyForCandidates; } });
Object.defineProperty(exports, "selectBiasProbesForCandidates", { enumerable: true, get: function () { return sub_model_v3g_bias_fingerprint_js_1.selectBiasProbesForCandidates; } });
Object.defineProperty(exports, "candidateSiblingsFor", { enumerable: true, get: function () { return sub_model_v3g_bias_fingerprint_js_1.candidateSiblingsFor; } });
Object.defineProperty(exports, "candidateSiblingsForFamily", { enumerable: true, get: function () { return sub_model_v3g_bias_fingerprint_js_1.candidateSiblingsForFamily; } });
Object.defineProperty(exports, "candidateSiblingsForConfirmedFamily", { enumerable: true, get: function () { return sub_model_v3g_bias_fingerprint_js_1.candidateSiblingsForConfirmedFamily; } });
Object.defineProperty(exports, "biasDisplayName", { enumerable: true, get: function () { return sub_model_v3g_bias_fingerprint_js_1.biasDisplayName; } });
Object.defineProperty(exports, "sampleBiasFingerprint", { enumerable: true, get: function () { return sub_model_v3g_bias_fingerprint_js_1.sampleBiasFingerprint; } });
Object.defineProperty(exports, "sampleV3HDistributionFingerprint", { enumerable: true, get: function () { return sub_model_v3g_bias_fingerprint_js_1.sampleV3HDistributionFingerprint; } });
var sub_model_bias_baselines_js_1 = require("./sub-model-bias-baselines.js");
Object.defineProperty(exports, "BIAS_BASELINES", { enumerable: true, get: function () { return sub_model_bias_baselines_js_1.BIAS_BASELINES; } });
// Canonical identity comparison shared by family/V3H consumers.
var model_id_normalize_js_1 = require("./model-id-normalize.js");
Object.defineProperty(exports, "normalizeModelCore", { enumerable: true, get: function () { return model_id_normalize_js_1.normalizeModelCore; } });
Object.defineProperty(exports, "canonicalFamily", { enumerable: true, get: function () { return model_id_normalize_js_1.canonicalFamily; } });
Object.defineProperty(exports, "modelIdsMatch", { enumerable: true, get: function () { return model_id_normalize_js_1.modelIdsMatch; } });
Object.defineProperty(exports, "canonicalizeModelId", { enumerable: true, get: function () { return model_id_normalize_js_1.canonicalizeModelId; } });
Object.defineProperty(exports, "baseModelId", { enumerable: true, get: function () { return model_id_normalize_js_1.baseModelId; } });
// Deterministic adversarial transforms for downstream regression gates.
var relay_noise_js_1 = require("./testing/relay-noise.js");
Object.defineProperty(exports, "blankRefusals", { enumerable: true, get: function () { return relay_noise_js_1.blankRefusals; } });
Object.defineProperty(exports, "wrapResponses", { enumerable: true, get: function () { return relay_noise_js_1.wrapResponses; } });
Object.defineProperty(exports, "thinBiasSamples", { enumerable: true, get: function () { return relay_noise_js_1.thinBiasSamples; } });
Object.defineProperty(exports, "injectBlanks", { enumerable: true, get: function () { return relay_noise_js_1.injectBlanks; } });
// ── Detection registry (reversible disable list) ─────────────────────────
var sub_model_detection_config_js_1 = require("./sub-model-detection-config.js");
Object.defineProperty(exports, "DETECTION_DISABLED_MODEL_IDS", { enumerable: true, get: function () { return sub_model_detection_config_js_1.DETECTION_DISABLED_MODEL_IDS; } });
Object.defineProperty(exports, "isDetectionDisabled", { enumerable: true, get: function () { return sub_model_detection_config_js_1.isDetectionDisabled; } });
Object.defineProperty(exports, "filterDetectable", { enumerable: true, get: function () { return sub_model_detection_config_js_1.filterDetectable; } });
// ── Native empty-refusal signal (Claude 5 / Mythos fingerprint) ──────────
var sub_model_empty_refusal_signal_js_1 = require("./sub-model-empty-refusal-signal.js");
Object.defineProperty(exports, "detectNativeEmptyRefusal", { enumerable: true, get: function () { return sub_model_empty_refusal_signal_js_1.detectNativeEmptyRefusal; } });
// ── Family fusion (V5 stage 1: confirmedFamily) ──────────────────────────
var identity_family_fusion_js_1 = require("./identity-family-fusion.js");
Object.defineProperty(exports, "fuseFamily", { enumerable: true, get: function () { return identity_family_fusion_js_1.fuseFamily; } });
var sub_model_classifier_ikp_js_1 = require("./sub-model-classifier-ikp.js");
Object.defineProperty(exports, "classifySubmodelIKP", { enumerable: true, get: function () { return sub_model_classifier_ikp_js_1.classifySubmodelIKP; } });
Object.defineProperty(exports, "fuseV3WithIKP", { enumerable: true, get: function () { return sub_model_classifier_ikp_js_1.fuseV3WithIKP; } });
Object.defineProperty(exports, "IKP_PROBE_IDS", { enumerable: true, get: function () { return sub_model_classifier_ikp_js_1.IKP_PROBE_IDS; } });
var sub_model_bayesian_js_1 = require("./sub-model-bayesian.js");
Object.defineProperty(exports, "scoreSubModels", { enumerable: true, get: function () { return sub_model_bayesian_js_1.scoreSubModels; } });
Object.defineProperty(exports, "BAYESIAN_CONFIDENCE_THRESHOLD", { enumerable: true, get: function () { return sub_model_bayesian_js_1.CONFIDENCE_THRESHOLD; } });
var baseline_match_votes_js_1 = require("./baseline-match-votes.js");
Object.defineProperty(exports, "computeBaselineMatchVotes", { enumerable: true, get: function () { return baseline_match_votes_js_1.computeBaselineMatchVotes; } });
Object.defineProperty(exports, "responseSimilarity", { enumerable: true, get: function () { return baseline_match_votes_js_1.responseSimilarity; } });
Object.defineProperty(exports, "baselineModelIdToFamily", { enumerable: true, get: function () { return baseline_match_votes_js_1.baselineModelIdToFamily; } });
var backtest_scorer_js_1 = require("./backtest-scorer.js");
Object.defineProperty(exports, "modelIdToFamily", { enumerable: true, get: function () { return backtest_scorer_js_1.modelIdToFamily; } });
Object.defineProperty(exports, "scoreLinguisticOnly", { enumerable: true, get: function () { return backtest_scorer_js_1.scoreLinguisticOnly; } });
Object.defineProperty(exports, "scoreFullFeatureSet", { enumerable: true, get: function () { return backtest_scorer_js_1.scoreFullFeatureSet; } });
Object.defineProperty(exports, "computeAccuracy", { enumerable: true, get: function () { return backtest_scorer_js_1.computeAccuracy; } });
var fingerprint_category_hit_rate_js_1 = require("./fingerprint-category-hit-rate.js");
Object.defineProperty(exports, "categoryHitRate", { enumerable: true, get: function () { return fingerprint_category_hit_rate_js_1.categoryHitRate; } });
Object.defineProperty(exports, "relativeCategoryFitness", { enumerable: true, get: function () { return fingerprint_category_hit_rate_js_1.relativeCategoryFitness; } });
var identity_classifier_v2_js_1 = require("./identity-classifier-v2.js");
Object.defineProperty(exports, "classifyIdentityV2", { enumerable: true, get: function () { return identity_classifier_v2_js_1.classifyIdentityV2; } });
Object.defineProperty(exports, "classifyIdentityV2A", { enumerable: true, get: function () { return identity_classifier_v2_js_1.classifyIdentityV2A; } });
Object.defineProperty(exports, "classifyIdentityV2B", { enumerable: true, get: function () { return identity_classifier_v2_js_1.classifyIdentityV2B; } });
var sub_model_baselines_v3_store_js_1 = require("./sub-model-baselines-v3-store.js");
Object.defineProperty(exports, "createBaselineStore", { enumerable: true, get: function () { return sub_model_baselines_v3_store_js_1.createBaselineStore; } });
Object.defineProperty(exports, "defaultBaselineStore", { enumerable: true, get: function () { return sub_model_baselines_v3_store_js_1.defaultBaselineStore; } });
Object.defineProperty(exports, "getCachedBaselines", { enumerable: true, get: function () { return sub_model_baselines_v3_store_js_1.getCachedBaselines; } });
Object.defineProperty(exports, "getCachedBaselinesForFamily", { enumerable: true, get: function () { return sub_model_baselines_v3_store_js_1.getCachedBaselinesForFamily; } });
Object.defineProperty(exports, "getCachedFamilies", { enumerable: true, get: function () { return sub_model_baselines_v3_store_js_1.getCachedFamilies; } });
Object.defineProperty(exports, "invalidateBaselineCache", { enumerable: true, get: function () { return sub_model_baselines_v3_store_js_1.invalidateBaselineCache; } });
var submodel_features_js_1 = require("./submodel-features.js");
Object.defineProperty(exports, "extractSubModelFeatures", { enumerable: true, get: function () { return submodel_features_js_1.extractSubModelFeatures; } });
Object.defineProperty(exports, "extractPiDistributionFeatures", { enumerable: true, get: function () { return submodel_features_js_1.extractPiDistributionFeatures; } });
var sub_model_matcher_js_2 = require("./sub-model-matcher.js");
Object.defineProperty(exports, "flattenLinguisticFeatures", { enumerable: true, get: function () { return sub_model_matcher_js_2.flattenLinguisticFeatures; } });
Object.defineProperty(exports, "matchSubModelsLinguistic", { enumerable: true, get: function () { return sub_model_matcher_js_2.matchSubModelsLinguistic; } });
Object.defineProperty(exports, "identifySubModelBayesian", { enumerable: true, get: function () { return sub_model_matcher_js_2.identifySubModelBayesian; } });
Object.defineProperty(exports, "baselinesFromDbRows", { enumerable: true, get: function () { return sub_model_matcher_js_2.baselinesFromDbRows; } });
var fingerprint_bayesian_js_1 = require("./fingerprint-bayesian.js");
Object.defineProperty(exports, "bayesianScoreDisplayCalibrated", { enumerable: true, get: function () { return fingerprint_bayesian_js_1.bayesianScoreDisplayCalibrated; } });
//# sourceMappingURL=index.js.map