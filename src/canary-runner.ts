// src/canary-runner.ts — Execute the canary benchmark against an endpoint.
// Part of @bazaarlink/probe-engine (MIT)
//
// No LLM judge — all answers compared by exact string / regex match.
// Verdict: healthy (≥80%), degraded (≥50%), failed (<50%), error.

import { CANARY_BENCH, scoreCanaryAnswer, type CanaryAnswerResult } from "./canary-bench.js";

export interface CanaryInput {
  /** OpenAI-compatible base URL, e.g. "https://openrouter.ai/api/v1" */
  baseUrl:   string;
  apiKey:    string;
  modelId:   string;
  /** Timeout per request in ms. Default: 60_000 */
  timeoutMs?: number;
}

export interface CanaryResult {
  verdict:      "healthy" | "degraded" | "failed" | "error";
  /** 0.0–1.0 pass rate */
  score:        number;
  totalChecks:  number;
  passedChecks: number;
  avgLatencyMs: number;
  /** Model ID echoed back by the endpoint (if present) */
  servedModel:  string | null;
  details:      (CanaryAnswerResult & { latencyMs: number })[];
  error:        string | null;
}

export async function runCanary(input: CanaryInput): Promise<CanaryResult> {
  const timeoutMs = input.timeoutMs ?? 60_000;
  const url = input.baseUrl.replace(/\/+$/, "") + "/chat/completions";
  const details: (CanaryAnswerResult & { latencyMs: number })[] = [];
  let servedModel: string | null = null;
  let totalLatency = 0;

  try {
    for (const item of CANARY_BENCH) {
      const t0 = Date.now();
      let actual: string | null = null;
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type":  "application/json",
            "Authorization": `Bearer ${input.apiKey}`,
          },
          body: JSON.stringify({
            model:       input.modelId,
            messages:    [{ role: "user", content: item.prompt }],
            temperature: 0,
            max_tokens:  64,
            stream:      false,
          }),
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (res.ok) {
          const data = await res.json() as {
            model?: string;
            choices?: Array<{ message?: { content?: string } }>;
          };
          if (!servedModel && typeof data.model === "string") servedModel = data.model;
          actual = data.choices?.[0]?.message?.content ?? null;
        }
      } catch { /* timeout or network error — actual stays null */ }
      const latencyMs = Date.now() - t0;
      totalLatency += latencyMs;
      details.push({ ...scoreCanaryAnswer(item, actual), latencyMs });
    }

    const totalChecks  = details.length;
    const passedChecks = details.filter(d => d.passed).length;
    const score        = totalChecks > 0 ? passedChecks / totalChecks : 0;
    const avgLatencyMs = totalChecks > 0 ? Math.round(totalLatency / totalChecks) : 0;

    let verdict: CanaryResult["verdict"];
    if (score >= 0.8)      verdict = "healthy";
    else if (score >= 0.5) verdict = "degraded";
    else                   verdict = "failed";

    return { verdict, score, totalChecks, passedChecks, avgLatencyMs, servedModel, details, error: null };
  } catch (e) {
    const msg = ((e as Error).message ?? "unknown").slice(0, 300);
    return {
      verdict: "error", score: 0,
      totalChecks: details.length,
      passedChecks: details.filter(d => d.passed).length,
      avgLatencyMs: details.length ? Math.round(totalLatency / details.length) : 0,
      servedModel, details, error: msg,
    };
  }
}
