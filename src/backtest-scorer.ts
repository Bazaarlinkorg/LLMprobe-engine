// lib/backtest-scorer.ts — Linguistic-fingerprint-only scoring and backtest utilities

import { FAMILY_BASELINES } from "./fingerprint-baseline";

/**
 * Score a linguisticFingerprint feature map against family baselines.
 * Only uses signals from the "linguisticFingerprint" category.
 * Returns all families sorted descending, with scores normalized 0–1.
 */
export function scoreLinguisticOnly(
  lingFeatures: Record<string, number>,
): Array<{ family: string; score: number }> {
  const rawScores: Array<{ family: string; raw: number }> = [];

  for (const baseline of FAMILY_BASELINES) {
    let raw = 0;
    for (const [category, key, weight] of baseline.signals) {
      if (category !== "linguisticFingerprint") continue;
      const value = lingFeatures[key] ?? 0;
      if (value === 0) continue;
      raw += weight * value;
    }
    rawScores.push({ family: baseline.family, raw });
  }

  // Normalize: divide by max raw, clamp to [0, 1]
  const maxRaw = Math.max(...rawScores.map(s => s.raw), 1);
  const scores = rawScores.map(s => ({
    family: s.family,
    score: Math.min(1, Math.max(0, s.raw / maxRaw)),
  }));

  return scores.sort((a, b) => b.score - a.score);
}

/**
 * Score a full FingerprintFeatureSet against family baselines using ALL signal categories.
 * Returns all families sorted descending, with scores normalized 0–1.
 */
export function scoreFullFeatureSet(
  features: Record<string, Record<string, number>>,
): Array<{ family: string; score: number }> {
  const rawScores: Record<string, number> = {};

  for (const baseline of FAMILY_BASELINES) {
    let raw = 0;
    for (const [category, key, weight] of baseline.signals) {
      const catFeatures = features[category] ?? {};
      raw += weight * (catFeatures[key] ?? 0);
    }
    rawScores[baseline.family] = raw;
  }

  const maxRaw = Math.max(...Object.values(rawScores), 0.0001);
  return FAMILY_BASELINES
    .map(b => ({
      family: b.family,
      score: Math.min(1, Math.max(0, rawScores[b.family] / maxRaw)),
    }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Map a modelId string to its known family.
 * Returns "unknown" if not recognized.
 */
export function modelIdToFamily(modelId: string): string {
  const m = modelId.toLowerCase();
  if (m.includes("claude") || m.includes("anthropic/")) return "anthropic";
  if (m.includes("gpt") || m.includes("chatgpt") || m.includes("openai/") ||
      m.startsWith("o1") || m.startsWith("o3") || m.startsWith("o4") ||
      /\bo[134]-/.test(m) || /\bo[134]$/.test(m)) return "openai";
  if (m.includes("gemini") || m.includes("bard") || m.includes("google/")) return "google";
  if (m.includes("qwen") || m.includes("tongyi")) return "qwen";
  if (m.includes("llama") || m.includes("meta-llama") || m.includes("meta/")) return "meta";
  if (m.includes("mistral") || m.includes("mixtral") || m.includes("mistralai/")) return "mistral";
  if (m.includes("deepseek")) return "deepseek";
  if (m.includes("glm") || m.includes("zhipu") || m.includes("zhipuai/") || m.includes("z-ai")) return "zhipu";
  // xAI (2026-07-10). Must come AFTER z-ai: "x-ai/..." contains no "z-ai", but keeping the
  // two adjacent makes the near-collision obvious. Without this rule every grok id fell through
  // to "unknown", which closes the V3H gate (`family !== "unknown"`) and left the sub-model
  // layer blind to Grok while 14 grok routes were live.
  if (m.includes("grok") || m.includes("x-ai/") || m.includes("xai/")) return "xai";
  return "unknown";
}

/**
 * Accuracy stats for a single model across multiple probe records.
 */
export interface AccuracyStats {
  modelId: string;
  trueFamily: string;
  total: number;
  correct: number;
  accuracy: number;          // 0–1
  topPredictions: string[];  // top predicted family per record
}

/**
 * Given an array of linguisticFingerprint feature objects for one model and its true family,
 * return accuracy stats.
 */
export function computeAccuracy(
  modelId: string,
  trueFamily: string,
  lingFeaturesList: Array<Record<string, number>>,
): AccuracyStats {
  const total = lingFeaturesList.length;
  const topPredictions: string[] = [];
  let correct = 0;

  for (const features of lingFeaturesList) {
    const scored = scoreLinguisticOnly(features);
    const topFamily = scored[0]?.family ?? "unknown";
    topPredictions.push(topFamily);
    if (topFamily === trueFamily) correct++;
  }

  return {
    modelId,
    trueFamily,
    total,
    correct,
    accuracy: total === 0 ? 0 : correct / total,
    topPredictions,
  };
}
