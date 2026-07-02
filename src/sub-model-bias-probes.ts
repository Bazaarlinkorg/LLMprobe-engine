// src/sub-model-bias-probes.ts
// Short "border" probes for the V3G/V3H bias-fingerprint layer. Each is sampled `samples`
// times per audit at temperature 1; the ANSWER DISTRIBUTION (a model's intrinsic bias)
// is the fingerprint, not the answer content. Discriminating power ∝ fine-tuning
// divergence between siblings (gpt-5.5 vs codex ~100%, deepseek flash/pro ~90%).
export interface BiasProbe {
  id: string;
  prompt: string;
  samples: number;
}

export const BIAS_PROBES: BiasProbe[] = [
  { id: "rand_country", prompt: "Name a random country. Reply with ONLY the country name.", samples: 3 },
  { id: "rand_1to100", prompt: "Pick a random whole number from 1 to 100. Reply with ONLY the number.", samples: 3 },
  { id: "rand_animal", prompt: "Name a random animal. Reply with ONLY the animal name, one word.", samples: 3 },
  { id: "rand_color", prompt: "Name a random color. Reply with ONLY the color name, one word.", samples: 3 },
  { id: "rand_letter", prompt: "Pick a random letter of the English alphabet. Reply with ONLY the single uppercase letter.", samples: 3 },
  { id: "day", prompt: "Name a day of the week. Reply with ONLY the day.", samples: 3 },
  { id: "zero_natural", prompt: "Is 0 a natural number? Reply with ONLY 'yes' or 'no'.", samples: 3 },
];

/** Normalize a model answer to a comparable token: lowercase, alphanumerics only, ≤16 chars. */
export function normalizeBiasAnswer(s: string | null | undefined): string {
  return String(s ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 16);
}
