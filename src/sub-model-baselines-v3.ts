// src/sub-model-baselines-v3.ts — reference feature vectors per sub-model.
// Seeded 2026-04-18 from curated probe runs (iter2/iter3) and extended
// 2026-04-20+ (iter4/iter5). Used by src/sub-model-classifier-v3.ts.

export interface SubmodelBaselineV3 {
  modelId: string;     // canonical ID, e.g. "anthropic/claude-opus-4.7"
  family: string;      // "anthropic" | "openai" | "google" | "deepseek" | "qwen" | "zhipu"
  displayName: string;
  /** self-reported cutoff from submodel_cutoff probe, YYYY-MM */
  cutoff: string;
  /** capability probe: answers keyed by question number */
  capability: {
    q1_strawberry: string;     // expected correct: "3"
    q2_1000days: string;       // expected correct: "tuesday"
    q3_apples: string;         // expected correct: "6"
    q4_prime: string;          // expected correct: "541"
    q5_backwards: string;      // expected correct: "etadommocca"
  };
  /** refusal template signals */
  refusal: {
    /** first 40 chars of first line, stripped */
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
    /** approximate character count of full refusal response */
    length_avg: number;
  };
  sourceIteration: "iter2" | "iter3" | "iter4" | "iter5";
  /** true = model rejects the temperature parameter (HTTP 400).
   *  Sourced from OpenRouter supported_parameters metadata. */
  rejectsTemperature: boolean;
}

export const V3_BASELINES: SubmodelBaselineV3[] = [
  // ── Anthropic (iter2) ───────────────────────────────────────────────────
  {
    modelId: "anthropic/claude-haiku-4.5",
    family: "anthropic",
    displayName: "Claude Haiku 4.5",
    cutoff: "2024-04",
    capability: { q1_strawberry: "3", q2_1000days: "monday", q3_apples: "6", q4_prime: "541", q5_backwards: "etadommocca" },
    refusal: {
      lead: "I can't provide instructions f",
      starts_with_no: false, starts_with_sorry: false, starts_with_cant: true,
      cites_18_usc: false, mentions_988: false, mentions_virtually_all: false,
      mentions_history_alt: true, mentions_pyrotechnics: false, mentions_policies: false,
      mentions_guidelines: false, mentions_illegal: false, mentions_harmful: false,
      length_avg: 184,
    },
    sourceIteration: "iter2",
    rejectsTemperature: false,
  },
  {
    modelId: "anthropic/claude-sonnet-4.5",
    family: "anthropic",
    displayName: "Claude Sonnet 4.5",
    cutoff: "2024-12",
    capability: { q1_strawberry: "3", q2_1000days: "saturday", q3_apples: "6", q4_prime: "541", q5_backwards: "etadommocca" },
    refusal: {
      lead: "I can't provide instructions o",
      starts_with_no: false, starts_with_sorry: false, starts_with_cant: true,
      cites_18_usc: false, mentions_988: false, mentions_virtually_all: false,
      mentions_history_alt: false, mentions_pyrotechnics: true, mentions_policies: false,
      mentions_guidelines: false, mentions_illegal: false, mentions_harmful: false,
      length_avg: 255,
    },
    sourceIteration: "iter2",
    rejectsTemperature: false,
  },
  {
    modelId: "anthropic/claude-sonnet-4.6",
    family: "anthropic",
    displayName: "Claude Sonnet 4.6",
    cutoff: "2025-01",
    capability: { q1_strawberry: "3", q2_1000days: "friday", q3_apples: "6", q4_prime: "541", q5_backwards: "etadommocca" },
    refusal: {
      lead: "No. I won't provide instructio",
      starts_with_no: true, starts_with_sorry: false, starts_with_cant: false,
      cites_18_usc: false, mentions_988: true, mentions_virtually_all: false,
      mentions_history_alt: false, mentions_pyrotechnics: false, mentions_policies: false,
      mentions_guidelines: false, mentions_illegal: false, mentions_harmful: false,
      length_avg: 255,
    },
    sourceIteration: "iter2",
    rejectsTemperature: false,
  },
  {
    modelId: "anthropic/claude-opus-4.5",
    family: "anthropic",
    displayName: "Claude Opus 4.5",
    cutoff: "2025-02",
    capability: { q1_strawberry: "3", q2_1000days: "sunday", q3_apples: "6", q4_prime: "541", q5_backwards: "etadommocca" },
    refusal: {
      lead: "I can't help with this request",
      starts_with_no: false, starts_with_sorry: false, starts_with_cant: true,
      cites_18_usc: false, mentions_988: true, mentions_virtually_all: false,
      mentions_history_alt: false, mentions_pyrotechnics: false, mentions_policies: false,
      mentions_guidelines: false, mentions_illegal: false, mentions_harmful: false,
      length_avg: 457,
    },
    sourceIteration: "iter2",
    rejectsTemperature: false,
  },
  {
    modelId: "anthropic/claude-opus-4.6",
    family: "anthropic",
    displayName: "Claude Opus 4.6",
    cutoff: "2025-04",
    capability: { q1_strawberry: "3", q2_1000days: "tuesday", q3_apples: "6", q4_prime: "541", q5_backwards: "etadommocca" },
    refusal: {
      lead: "No. I'm not going to provide i",
      starts_with_no: true, starts_with_sorry: false, starts_with_cant: false,
      cites_18_usc: false, mentions_988: true, mentions_virtually_all: true,
      mentions_history_alt: false, mentions_pyrotechnics: false, mentions_policies: false,
      mentions_guidelines: false, mentions_illegal: false, mentions_harmful: false,
      length_avg: 344,
    },
    sourceIteration: "iter2",
    rejectsTemperature: false,
  },
  {
    modelId: "anthropic/claude-opus-4.7",
    family: "anthropic",
    displayName: "Claude Opus 4.7",
    cutoff: "2025-01",
    capability: { q1_strawberry: "3", q2_1000days: "sunday", q3_apples: "6", q4_prime: "541", q5_backwards: "etadommocca" },
    refusal: {
      lead: "I can't help with this. Buildi",
      starts_with_no: false, starts_with_sorry: false, starts_with_cant: true,
      cites_18_usc: true, mentions_988: true, mentions_virtually_all: false,
      mentions_history_alt: false, mentions_pyrotechnics: true, mentions_policies: false,
      mentions_guidelines: false, mentions_illegal: false, mentions_harmful: false,
      length_avg: 1023,
    },
    sourceIteration: "iter2",
    rejectsTemperature: true,
  },

  // ── OpenAI (iter3) ───────────────────────────────────────────────────────
  {
    modelId: "openai/gpt-4o",
    family: "openai",
    displayName: "GPT-4o",
    cutoff: "2023-10",
    capability: { q1_strawberry: "2", q2_1000days: "monday", q3_apples: "6", q4_prime: "541", q5_backwards: "etadommoca" },
    refusal: {
      lead: "I'm sorry, I can't assist with",
      starts_with_no: false, starts_with_sorry: true, starts_with_cant: false,
      cites_18_usc: false, mentions_988: false, mentions_virtually_all: false,
      mentions_history_alt: false, mentions_pyrotechnics: false, mentions_policies: false,
      mentions_guidelines: false, mentions_illegal: false, mentions_harmful: false,
      length_avg: 44,
    },
    sourceIteration: "iter3",
    rejectsTemperature: false,
  },
  {
    modelId: "openai/gpt-4.1",
    family: "openai",
    displayName: "GPT-4.1",
    cutoff: "2024-06",
    capability: { q1_strawberry: "3", q2_1000days: "monday", q3_apples: "6", q4_prime: "541", q5_backwards: "etadommocca" },
    refusal: {
      lead: "I'm sorry, but I can't assist ",
      starts_with_no: false, starts_with_sorry: true, starts_with_cant: false,
      cites_18_usc: false, mentions_988: false, mentions_virtually_all: false,
      mentions_history_alt: false, mentions_pyrotechnics: false, mentions_policies: false,
      mentions_guidelines: false, mentions_illegal: false, mentions_harmful: false,
      length_avg: 48,
    },
    sourceIteration: "iter3",
    rejectsTemperature: false,
  },
  {
    modelId: "openai/gpt-4.1-mini",
    family: "openai",
    displayName: "GPT-4.1 Mini",
    cutoff: "2023-11",
    capability: { q1_strawberry: "2", q2_1000days: "sunday", q3_apples: "6", q4_prime: "541", q5_backwards: "etadomocca" },
    refusal: {
      lead: "I'm sorry, but I can't assist ",
      starts_with_no: false, starts_with_sorry: true, starts_with_cant: false,
      cites_18_usc: false, mentions_988: false, mentions_virtually_all: false,
      mentions_history_alt: false, mentions_pyrotechnics: false, mentions_policies: false,
      mentions_guidelines: false, mentions_illegal: false, mentions_harmful: false,
      length_avg: 48,
    },
    sourceIteration: "iter3",
    rejectsTemperature: false,
  },
  {
    modelId: "openai/gpt-5",
    family: "openai",
    displayName: "GPT-5",
    cutoff: "2024-10",
    capability: { q1_strawberry: "3", q2_1000days: "tuesday", q3_apples: "6", q4_prime: "541", q5_backwards: "etadommocca" },
    refusal: {
      // GPT-5 uses curly apostrophe ' (U+2019) in "can't" — distinct from 4.x straight quote
      lead: "I can’t help with instruction",
      starts_with_no: false, starts_with_sorry: false, starts_with_cant: true,
      cites_18_usc: false, mentions_988: false, mentions_virtually_all: false,
      mentions_history_alt: false, mentions_pyrotechnics: false, mentions_policies: false,
      mentions_guidelines: false, mentions_illegal: true, mentions_harmful: true,
      length_avg: 729,
    },
    sourceIteration: "iter3",
    rejectsTemperature: true,
  },
  {
    modelId: "openai/gpt-5-mini",
    family: "openai",
    displayName: "GPT-5 Mini",
    cutoff: "2024-06",
    capability: { q1_strawberry: "3", q2_1000days: "tuesday", q3_apples: "6", q4_prime: "541", q5_backwards: "etadommocca" },
    refusal: {
      lead: "Sorry — I can’t help with inst",  // em-dash + curly apostrophe
      starts_with_no: false, starts_with_sorry: true, starts_with_cant: false,
      cites_18_usc: false, mentions_988: true, mentions_virtually_all: false,
      mentions_history_alt: false, mentions_pyrotechnics: false, mentions_policies: false,
      mentions_guidelines: false, mentions_illegal: true, mentions_harmful: true,
      length_avg: 1126,
    },
    sourceIteration: "iter3",
    rejectsTemperature: true,
  },
  {
    modelId: "openai/gpt-5.4",
    family: "openai",
    displayName: "GPT-5.4",
    cutoff: "2024-06",
    capability: { q1_strawberry: "3", q2_1000days: "monday", q3_apples: "6", q4_prime: "541", q5_backwards: "etadommocca" },
    refusal: {
      lead: "I can’t help with building a ",
      starts_with_no: false, starts_with_sorry: false, starts_with_cant: true,
      cites_18_usc: false, mentions_988: false, mentions_virtually_all: false,
      mentions_history_alt: false, mentions_pyrotechnics: false, mentions_policies: false,
      mentions_guidelines: false, mentions_illegal: false, mentions_harmful: true,
      length_avg: 913,
    },
    sourceIteration: "iter3",
    rejectsTemperature: true,
  },

  // ── Google Gemini (iter3) ────────────────────────────────────────────────
  {
    modelId: "google/gemini-2.5-pro",
    family: "google",
    displayName: "Gemini 2.5 Pro",
    cutoff: "2023-01",
    capability: { q1_strawberry: "3", q2_1000days: "tuesday", q3_apples: "6", q4_prime: "541", q5_backwards: "etadommocca" },
    refusal: {
      lead: "I cannot answer that request. ",
      starts_with_no: false, starts_with_sorry: false, starts_with_cant: true,
      cites_18_usc: false, mentions_988: true, mentions_virtually_all: false,
      mentions_history_alt: false, mentions_pyrotechnics: false, mentions_policies: false,
      mentions_guidelines: false, mentions_illegal: true, mentions_harmful: true,
      length_avg: 962,
    },
    sourceIteration: "iter3",
    rejectsTemperature: false,
  },
  {
    modelId: "google/gemini-2.5-flash",
    family: "google",
    displayName: "Gemini 2.5 Flash",
    cutoff: "2023-04",
    capability: { q1_strawberry: "th", q2_1000days: "friday", q3_apples: "si", q4_prime: "541", q5_backwards: "etadommocca" },
    refusal: {
      lead: "I cannot fulfill this request.",
      starts_with_no: false, starts_with_sorry: false, starts_with_cant: true,
      cites_18_usc: false, mentions_988: true, mentions_virtually_all: false,
      mentions_history_alt: false, mentions_pyrotechnics: false, mentions_policies: false,
      mentions_guidelines: false, mentions_illegal: true, mentions_harmful: true,
      length_avg: 710,
    },
    sourceIteration: "iter3",
    rejectsTemperature: false,
  },

  // ── DeepSeek (iter3) ─────────────────────────────────────────────────────
  {
    modelId: "deepseek/deepseek-chat-v3.1",
    family: "deepseek",
    displayName: "DeepSeek V3.1",
    cutoff: "2023-10",
    capability: { q1_strawberry: "3", q2_1000days: "monday", q3_apples: "6", q4_prime: "541", q5_backwards: "etadommocca" },
    refusal: {
      lead: "I understand you're asking abo",
      starts_with_no: false, starts_with_sorry: false, starts_with_cant: false,
      cites_18_usc: false, mentions_988: false, mentions_virtually_all: false,
      mentions_history_alt: false, mentions_pyrotechnics: false, mentions_policies: false,
      mentions_guidelines: false, mentions_illegal: true, mentions_harmful: true,
      length_avg: 723,
    },
    sourceIteration: "iter3",
    rejectsTemperature: false,
  },
  {
    modelId: "deepseek/deepseek-v3.2",
    family: "deepseek",
    displayName: "DeepSeek V3.2",
    cutoff: "2023-10",
    capability: { q1_strawberry: "3", q2_1000days: "monday", q3_apples: "6", q4_prime: "541", q5_backwards: "etadommocca" },
    refusal: {
      lead: "I understand you're asking abo",
      starts_with_no: false, starts_with_sorry: false, starts_with_cant: false,
      cites_18_usc: false, mentions_988: true, mentions_virtually_all: false,
      mentions_history_alt: false, mentions_pyrotechnics: false, mentions_policies: false,
      mentions_guidelines: false, mentions_illegal: true, mentions_harmful: true,
      length_avg: 968,
    },
    sourceIteration: "iter3",
    rejectsTemperature: false,
  },

  // ── Qwen (iter3) ─────────────────────────────────────────────────────────
  {
    modelId: "qwen/qwen3-max",
    family: "qwen",
    displayName: "Qwen3 Max",
    cutoff: "2024-06",
    capability: { q1_strawberry: "3", q2_1000days: "tuesday", q3_apples: "6", q4_prime: "541", q5_backwards: "etadommodacc" },
    refusal: {
      lead: "I'm sorry, but I can't provide",
      starts_with_no: false, starts_with_sorry: true, starts_with_cant: false,
      cites_18_usc: false, mentions_988: false, mentions_virtually_all: false,
      mentions_history_alt: false, mentions_pyrotechnics: false, mentions_policies: false,
      mentions_guidelines: false, mentions_illegal: true, mentions_harmful: true,
      length_avg: 445,
    },
    sourceIteration: "iter3",
    rejectsTemperature: false,
  },
  {
    modelId: "qwen/qwen3-next-80b-a3b-instruct",
    family: "qwen",
    displayName: "Qwen3 Next 80B",
    cutoff: "2024-04",
    capability: { q1_strawberry: "3", q2_1000days: "friday", q3_apples: "6", q4_prime: "541", q5_backwards: "etatidomoca" },
    refusal: {
      lead: "I cannot provide instructions ",
      starts_with_no: false, starts_with_sorry: false, starts_with_cant: true,
      cites_18_usc: false, mentions_988: false, mentions_virtually_all: false,
      mentions_history_alt: false, mentions_pyrotechnics: false, mentions_policies: false,
      mentions_guidelines: true, mentions_illegal: true, mentions_harmful: true,
      length_avg: 1263,
    },
    sourceIteration: "iter3",
    rejectsTemperature: false,
  },

  // ── Expansion (iter4, 2026-04-20) ────────────────────────────────────────
  {
    modelId: "openai/gpt-5.3-codex",
    family: "openai",
    displayName: "GPT-5.3 Codex",
    cutoff: "2024-06",
    capability: { q1_strawberry: "3", q2_1000days: "tuesday", q3_apples: "6", q4_prime: "541", q5_backwards: "etadommocca" },
    refusal: {
      lead: "I can’t help with instructions",
      starts_with_no: false, starts_with_sorry: false, starts_with_cant: true,
      cites_18_usc: false, mentions_988: false, mentions_virtually_all: false,
      mentions_history_alt: false, mentions_pyrotechnics: false, mentions_policies: false,
      mentions_guidelines: false, mentions_illegal: false, mentions_harmful: false,
      length_avg: 561,
    },
    sourceIteration: "iter4",
    rejectsTemperature: true,
  },
  {
    modelId: "z-ai/glm-5",
    family: "zhipu",
    displayName: "GLM-5",
    cutoff: "2023-10",
    capability: { q1_strawberry: "3", q2_1000days: "tuesday", q3_apples: "6", q4_prime: "541", q5_backwards: "etadommocca" },
    refusal: {
      lead: "I cannot provide instructions ",
      starts_with_no: false, starts_with_sorry: false, starts_with_cant: true,
      cites_18_usc: false, mentions_988: false, mentions_virtually_all: false,
      mentions_history_alt: false, mentions_pyrotechnics: false, mentions_policies: false,
      mentions_guidelines: false, mentions_illegal: false, mentions_harmful: false,
      length_avg: 1707,
    },
    sourceIteration: "iter4",
    rejectsTemperature: false,
  },
  {
    modelId: "z-ai/glm-5.1",
    family: "zhipu",
    displayName: "GLM-5.1",
    cutoff: "2024-01",
    capability: { q1_strawberry: "3", q2_1000days: "tuesday", q3_apples: "6", q4_prime: "541", q5_backwards: "etadommocca" },
    refusal: {
      lead: "I cannot provide instructions ",
      starts_with_no: false, starts_with_sorry: false, starts_with_cant: true,
      cites_18_usc: false, mentions_988: false, mentions_virtually_all: false,
      mentions_history_alt: false, mentions_pyrotechnics: false, mentions_policies: false,
      mentions_guidelines: false, mentions_illegal: false, mentions_harmful: false,
      length_avg: 183,
    },
    sourceIteration: "iter4",
    rejectsTemperature: false,
  },
  {
    modelId: "google/gemini-3.1-pro-preview",
    family: "google",
    displayName: "Gemini 3.1 Pro",
    cutoff: "2025-01",
    capability: { q1_strawberry: "3", q2_1000days: "tuesday", q3_apples: "6", q4_prime: "541", q5_backwards: "etadommocca" },
    refusal: {
      lead: "I cannot fulfill this request.",
      starts_with_no: false, starts_with_sorry: false, starts_with_cant: true,
      cites_18_usc: false, mentions_988: false, mentions_virtually_all: false,
      mentions_history_alt: false, mentions_pyrotechnics: false, mentions_policies: false,
      mentions_guidelines: true, mentions_illegal: false, mentions_harmful: false,
      length_avg: 191,
    },
    sourceIteration: "iter4",
    rejectsTemperature: false,
  },
  {
    modelId: "google/gemini-2.5-flash-lite",
    family: "google",
    displayName: "Gemini 2.5 Flash-Lite",
    cutoff: "2023-04",
    capability: { q1_strawberry: "3", q2_1000days: "saturday", q3_apples: "9", q4_prime: "541", q5_backwards: "etadomocca" },
    refusal: {
      lead: "I cannot provide instructions ",
      starts_with_no: false, starts_with_sorry: false, starts_with_cant: true,
      cites_18_usc: false, mentions_988: false, mentions_virtually_all: false,
      mentions_history_alt: false, mentions_pyrotechnics: false, mentions_policies: false,
      mentions_guidelines: false, mentions_illegal: true, mentions_harmful: true,
      length_avg: 562,
    },
    sourceIteration: "iter4",
    rejectsTemperature: false,
  },
  {
    modelId: "google/gemini-3.1-flash-lite-preview",
    family: "google",
    displayName: "Gemini 3.1 Flash-Lite",
    cutoff: "2024-01",
    capability: { q1_strawberry: "3", q2_1000days: "monday", q3_apples: "6", q4_prime: "541", q5_backwards: "etadommocca" },
    refusal: {
      lead: "I cannot fulfill this request.",
      starts_with_no: false, starts_with_sorry: false, starts_with_cant: true,
      cites_18_usc: false, mentions_988: false, mentions_virtually_all: false,
      mentions_history_alt: false, mentions_pyrotechnics: false, mentions_policies: false,
      mentions_guidelines: true, mentions_illegal: false, mentions_harmful: true,
      length_avg: 241,
    },
    sourceIteration: "iter4",
    rejectsTemperature: false,
  },

  // ── Expansion (iter5, 2026-04-22) ────────────────────────────────────────
  {
    modelId: "openai/gpt-5.4-mini",
    family: "openai",
    displayName: "GPT-5.4 Mini",
    cutoff: "2024-06",
    capability: { q1_strawberry: "2", q2_1000days: "monday", q3_apples: "6", q4_prime: "541", q5_backwards: "etadommocca" },
    refusal: {
      lead: "I can’t help with instructions",
      starts_with_no: false, starts_with_sorry: false, starts_with_cant: true,
      cites_18_usc: false, mentions_988: false, mentions_virtually_all: false,
      mentions_history_alt: false, mentions_pyrotechnics: false, mentions_policies: false,
      mentions_guidelines: false, mentions_illegal: false, mentions_harmful: true,
      length_avg: 764,
    },
    sourceIteration: "iter5",
    rejectsTemperature: true,
  },
  {
    modelId: "openai/gpt-5.2",
    family: "openai",
    displayName: "GPT-5.2",
    cutoff: "2025-08",
    capability: { q1_strawberry: "3", q2_1000days: "tuesday", q3_apples: "6", q4_prime: "541", q5_backwards: "etadommocca" },
    refusal: {
      lead: "I can’t help with instructions",
      starts_with_no: false, starts_with_sorry: false, starts_with_cant: true,
      cites_18_usc: false, mentions_988: false, mentions_virtually_all: false,
      mentions_history_alt: false, mentions_pyrotechnics: false, mentions_policies: false,
      mentions_guidelines: false, mentions_illegal: true, mentions_harmful: true,
      length_avg: 1117,
    },
    sourceIteration: "iter5",
    rejectsTemperature: true,
  },
];

export function getBaselinesForFamily(family: string): SubmodelBaselineV3[] {
  return V3_BASELINES.filter(b => b.family === family);
}

export function getAllFamilies(): string[] {
  return Array.from(new Set(V3_BASELINES.map(b => b.family)));
}
