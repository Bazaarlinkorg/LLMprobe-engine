// src/fingerprint-judge.ts — LLM judge signal for model family identification (MIT)

import type { FamilyScore } from "./identity-report.js";

const KNOWN_FAMILIES = ["anthropic", "openai", "google", "qwen", "meta", "mistral", "deepseek"];

export interface JudgeIdentityResult {
  family: string;
  confidence: number;
  reasons: string[];
}

/** Parse LLM judge response. Returns null on failure. */
export function parseJudgeIdentityResult(text: string): JudgeIdentityResult | null {
  const candidates: string[] = [];

  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) candidates.push(fenceMatch[1].trim());

  const braceMatch = text.match(/\{[\s\S]*?"family"[\s\S]*?\}/);
  if (braceMatch) candidates.push(braceMatch[0]);

  candidates.push(text.trim());

  for (const raw of candidates) {
    try {
      const obj = JSON.parse(raw) as { family?: unknown; confidence?: unknown; reasons?: unknown };
      const family = typeof obj.family === "string" ? obj.family.toLowerCase() : null;
      if (!family || !KNOWN_FAMILIES.includes(family)) continue;
      const confidence = Math.min(1, Math.max(0, Number(obj.confidence) || 0));
      const reasons = Array.isArray(obj.reasons) ? (obj.reasons as unknown[]).map(String).slice(0, 5) : [];
      return { family, confidence, reasons };
    } catch { /* try next */ }
  }

  return null;
}

/** Build the judge prompt from probe responses. */
export function buildJudgeIdentityPrompt(responses: Record<string, string>): string {
  const sections = Object.entries(responses)
    .map(([id, text]) => `[${id}]\n${text.slice(0, 600)}`)
    .join("\n\n---\n\n");

  return `You are a model fingerprinting expert. Analyze the following AI assistant probe responses and identify which model family produced them.

Known families: anthropic, openai, google, qwen, meta, mistral, deepseek

Look for: self-identification claims, refusal phrasing, writing style, formatting preferences (bold headers, numbered lists, emoji), JSON discipline, and reasoning patterns.

PROBE RESPONSES:
${sections}

Reply with ONLY a JSON object:
{"family": "<family>", "confidence": <0.0-1.0>, "reasons": ["<evidence 1>", "<evidence 2>", "<evidence 3>"]}`;
}

/**
 * Call LLM judge to identify model family from probe responses.
 * Returns FamilyScore[] with the judge's top pick scored and all others at 0.
 * Returns empty array if judge is unavailable or fails.
 */
export async function judgeFingerprint(
  responses: Record<string, string>,
  judgeBaseUrl: string,
  judgeApiKey: string,
  judgeModelId: string,
): Promise<{ scores: FamilyScore[]; result: JudgeIdentityResult | null }> {
  if (!judgeBaseUrl || !judgeApiKey || !judgeModelId || Object.keys(responses).length === 0) {
    return { scores: [], result: null };
  }

  const prompt = buildJudgeIdentityPrompt(responses);
  let chatUrl: string;
  try {
    chatUrl = judgeBaseUrl.replace(/\/+$/, "") + "/chat/completions";
    new URL(chatUrl); // validate
  } catch {
    return { scores: [], result: null };
  }

  try {
    const res = await fetch(chatUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${judgeApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: judgeModelId,
        messages: [
          { role: "system", content: "You are a strict JSON-only model fingerprinting expert. Respond with exactly one JSON object and nothing else." },
          { role: "user", content: prompt },
        ],
        stream: false,
        max_tokens: 256,
        temperature: 0,
      }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) return { scores: [], result: null };
    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    const text = data.choices?.[0]?.message?.content ?? "";
    const parsed = parseJudgeIdentityResult(text);
    if (!parsed) return { scores: [], result: null };

    const scores: FamilyScore[] = KNOWN_FAMILIES.map(f => ({
      family: f,
      score: f === parsed.family ? parsed.confidence : 0,
    }));
    return { scores, result: parsed };
  } catch {
    return { scores: [], result: null };
  }
}
