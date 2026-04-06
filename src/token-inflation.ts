// src/token-inflation.ts — Hidden system prompt detection (MIT)

export const TOKEN_INFLATION_THRESHOLD = 50;

export interface TokenInflationResult {
  detected: boolean;
  actualPromptTokens: number;
  inflationAmount: number;
}

export function detectTokenInflation(
  promptTokens: number,
  threshold = TOKEN_INFLATION_THRESHOLD,
): TokenInflationResult {
  const detected = promptTokens > threshold;
  return {
    detected,
    actualPromptTokens: promptTokens,
    inflationAmount: detected ? promptTokens : 0,
  };
}
