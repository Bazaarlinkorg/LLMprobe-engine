// src/identity-report.ts — Identity assessment types for @bazaarlink/probe-engine (MIT)

export type IdentityStatus = "match" | "mismatch" | "uncertain";

export interface IdentityCandidate {
  model: string;        // e.g. "Anthropic / Claude" or "OpenAI / GPT"
  family: string;       // e.g. "anthropic", "openai", "qwen"
  score: number;        // 0.0–1.0 normalized similarity
  reasons: string[];    // human-readable evidence sentences
}

export interface IdentityAssessment {
  status: IdentityStatus;
  confidence: number;           // 0.0–1.0
  claimedModel: string | undefined;
  predictedFamily: string | undefined;
  predictedCandidates: IdentityCandidate[];
  riskFlags: string[];          // endpoint-level anomalies that reduce confidence
  evidence: string[];           // top evidence sentences for the verdict
}

/**
 * Feature signals extracted from behavioral probe responses.
 * Each sub-object maps a signal key to a numeric weight (0 = absent, 1 = present).
 */
export interface FingerprintFeatureSet {
  /** Signals derived from self-identity probe (identity_self_knowledge) */
  selfClaim: Record<string, number>;
  /** Signals derived from lexical style probes (identity_style_en, identity_style_zh_tw) */
  lexical: Record<string, number>;
  /** Signals derived from reasoning format probe (identity_reasoning_shape) */
  reasoning: Record<string, number>;
  /** Signals derived from JSON discipline probe (identity_json_discipline) */
  jsonDiscipline: Record<string, number>;
  /** Signals derived from refusal pattern probe (identity_refusal_pattern) */
  refusal: Record<string, number>;
  /** Signals derived from list format probe (identity_list_format) */
  listFormat: Record<string, number>;
}
