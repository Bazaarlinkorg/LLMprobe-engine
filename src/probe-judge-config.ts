// src/probe-judge-config.ts — Pure helpers for judge configuration resolution
// Part of @bazaarlink/probe-engine (MIT)

export function parseJudgeThreshold(raw: string | undefined): number {
  const n = Number(raw);
  if (!raw || isNaN(n) || n < 1 || n > 10) return 7;
  return n;
}

export interface JudgeConfig {
  baseUrl:   string;
  apiKey:    string;
  modelId:   string;
  threshold: number;
}

/**
 * Resolve the judge configuration with cascade fallback.
 * If no explicit judge credentials are supplied, falls back to the
 * candidate endpoint's credentials (useful for self-judging in dev).
 */
export function resolveJudgeConfig(
  judgeBaseUrl:   string,
  judgeApiKey:    string,
  judgeModelId:   string,
  judgeThreshold: number,
  candidateBaseUrl:  string,
  candidateApiKey:   string,
  candidateModelId:  string,
): JudgeConfig {
  return {
    baseUrl:   judgeBaseUrl   || candidateBaseUrl,
    apiKey:    judgeApiKey    || candidateApiKey,
    modelId:   judgeModelId   || candidateModelId,
    threshold: judgeThreshold,
  };
}
