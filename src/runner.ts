// src/runner.ts — Core probe runner for @bazaarlink/probe-engine (MIT)
// No framework dependencies — uses only Node.js 18+ built-in fetch.

import { PROBE_SUITE, autoScore, generateCanary, type ProbeDefinition } from "./probe-suite.js";
import { computeProbeScore } from "./probe-score.js";
import { classifyPreflightResult } from "./probe-preflight.js";
import { detectTokenInflation, TOKEN_INFLATION_THRESHOLD } from "./token-inflation.js";
import { checkSSECompliance } from "./sse-compliance.js";
import { runContextCheck } from "./context-check.js";
import { extractFingerprint } from "./fingerprint-extractor.js";
import { matchCandidates, deriveVerdictFromClaimedModel } from "./candidate-matcher.js";
import { classifyChannelSignature } from "./channel-signature.js";
import { extractThinkingBlock, verifySignatureRoundtrip } from "./signature-probe.js";
import { judgeFingerprint } from "./fingerprint-judge.js";
import { embedProbeResponses, pickTopVectorScores, type ReferenceEmbedding } from "./fingerprint-vectors.js";
import { fuseScores } from "./fingerprint-fusion.js";
import type { IdentityAssessment } from "./identity-report.js";

export interface ProbeResult {
  probeId: string;
  label: string;
  group: string;
  neutral: boolean;
  status: "done" | "error" | "skipped";
  passed: true | false | "warning" | null;
  passReason: string | null;
  ttftMs: number | null;
  durationMs: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  tps: number | null;
  response: string | null;
  error: string | null;
}

export interface RunReport {
  baseUrl: string;
  modelId: string;
  claimedModel?: string;
  startedAt: string;
  completedAt: string;
  score: number;       // conservative 0-100
  scoreMax: number;    // optimistic 0-100
  totalInputTokens: number | null;
  totalOutputTokens: number | null;
  results: ProbeResult[];
  identityAssessment?: IdentityAssessment;
}

/**
 * Baseline responses keyed by probeId.
 * Obtained from `collect-baseline` or downloaded from the BazaarLink public API.
 */
export type BaselineMap = Record<string, string>;

export interface RunOptions {
  baseUrl: string;
  apiKey: string;
  modelId: string;
  /** Include optional probes (e.g. context_length). Default: false */
  includeOptional?: boolean;
  /** Timeout per probe request in ms. Default: 180_000 */
  timeoutMs?: number;
  /** Called after each probe completes */
  onProgress?: (result: ProbeResult, index: number, total: number) => void;
  /** Judge endpoint for llm_judge probes (optional; skipped if absent) */
  judge?: {
    baseUrl: string;
    apiKey: string;
    modelId: string;
    /** Score threshold 1-10. Default: 7 */
    threshold?: number;
  };
  /**
   * Baseline responses to compare against during llm_judge scoring.
   * Keys are probeIds; values are the trusted baseline response text.
   * When provided, the judge compares candidate vs baseline for similarity (1-10).
   * Without a baseline, llm_judge probes are skipped.
   */
  baseline?: BaselineMap;
  /**
   * The model name the operator claims is running behind this endpoint.
   * When provided, the identity phase compares observed behavior against this family.
   */
  claimedModel?: string;
  /**
   * Judge endpoint for identity fingerprinting (optional LLM judge signal).
   * When supplied, the identity phase calls this judge to classify model family.
   */
  identityJudge?: {
    baseUrl: string;
    apiKey: string;
    modelId: string;
  };
  /**
   * Embeddings endpoint for identity fingerprinting (optional vector signal).
   * When supplied, probe responses are embedded and compared against family references.
   */
  embeddingEndpoint?: {
    baseUrl: string;
    apiKey: string;
    modelId: string;
    /** Reference embeddings (family → embedding vector). If absent, vector signal is skipped. */
    references?: ReferenceEmbedding[];
  };
}

function parseJudgeScore(text: string): { score: number; reason: string } | null {
  const candidates: string[] = [];
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) candidates.push(fenceMatch[1].trim());
  const braceMatch = text.match(/\{[\s\S]*?"score"[\s\S]*?\}/);
  if (braceMatch) candidates.push(braceMatch[0]);
  candidates.push(text.trim());
  for (const raw of candidates) {
    try {
      const parsed = JSON.parse(raw) as { score?: unknown; reason?: unknown };
      const score = typeof parsed.score === "number" ? parsed.score : Number(parsed.score);
      if (!isNaN(score) && score >= 1 && score <= 10) {
        return { score: Math.round(score), reason: String(parsed.reason ?? "") };
      }
    } catch { /* try next */ }
  }
  return null;
}

/**
 * Runs the similarity-based judge — mirrors `buildJudgePrompt` in the production route.
 * Judge scores 1-10: how similar is the candidate response to the baseline response?
 */
async function runJudgeWithBaseline(
  judgeUrl: string,
  apiKey: string,
  modelId: string,
  probe: ProbeDefinition,
  candidateResponse: string,
  baselineResponse: string,
  threshold: number,
  timeoutMs: number,
): Promise<{ passed: boolean | null; reason: string }> {
  const judgePrompt = `You are evaluating whether two AI responses are from the same underlying model.

Original probe question: "${probe.prompt.slice(0, 300)}"

Baseline response (from official API):
${baselineResponse.slice(0, 2000)}

Candidate response (under test):
${candidateResponse.slice(0, 2000)}

Score how similar these responses are on a scale of 1-10, where:
- 10: Identical or near-identical content, style, and capability level
- 7-9: Very similar, minor variations in phrasing
- 4-6: Somewhat similar, possible different capability level or style
- 1-3: Very different, likely a different model family or capability tier

Respond ONLY with valid JSON: {"score": <number 1-10>, "reason": "<one sentence>"}`;

  try {
    const res = await fetch(`${judgeUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: "system", content: "You are a strict JSON-only evaluator. Respond ONLY with the JSON object requested." },
          { role: "user", content: judgePrompt },
        ],
        stream: false,
        max_tokens: 256,
        temperature: 0,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return { passed: null, reason: `Judge API error: HTTP ${res.status}` };
    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    const text = data.choices?.[0]?.message?.content ?? "";
    const scored = parseJudgeScore(text);
    if (!scored) return { passed: null, reason: `Judge returned unparseable response: ${text.slice(0, 100)}` };
    return {
      passed: scored.score >= threshold,
      reason: `Similarity score: ${scored.score}/10 (threshold: ${threshold}) — ${scored.reason}`,
    };
  } catch (e) {
    return { passed: null, reason: `Judge call failed: ${(e as Error).message?.slice(0, 100)}` };
  }
}

export async function runProbes(options: RunOptions): Promise<RunReport> {
  const {
    baseUrl,
    apiKey,
    modelId,
    includeOptional = false,
    timeoutMs = 180_000,
    onProgress,
    judge,
    baseline,
  } = options;

  const chatUrl = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
  const startedAt = new Date().toISOString();

  const probes = PROBE_SUITE.filter(p => includeOptional || !p.optional);
  const results: ProbeResult[] = [];

  // ── Pre-flight ────────────────────────────────────────────────────────────
  try {
    const pfRes = await fetch(chatUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: modelId, messages: [{ role: "user", content: "hi" }], max_tokens: 1, stream: false }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!pfRes.ok) {
      const rawBody = await pfRes.text().catch(() => "");
      const { outcome, reason } = classifyPreflightResult(pfRes.status, rawBody);
      if (outcome === "abort") {
        for (const probe of probes) {
          results.push({ probeId: probe.id, label: probe.label, group: probe.group, neutral: probe.neutral ?? false,
            status: "error", passed: false, passReason: null, ttftMs: null, durationMs: null,
            inputTokens: null, outputTokens: null, tps: null, response: null, error: reason });
        }
        const { low, high } = computeProbeScore(results.map(r => ({ status: r.status, passed: r.passed, neutral: r.neutral })));
        return { baseUrl, modelId, startedAt, completedAt: new Date().toISOString(), score: low, scoreMax: high,
          totalInputTokens: null, totalOutputTokens: null, results };
      }
    }
  } catch { /* network issues on preflight — proceed anyway */ }

  // ── Run each probe ────────────────────────────────────────────────────────
  let idx = 0;
  for (const probe of probes) {
    idx++;
    let result: ProbeResult;

    // ── channel_signature ─────────────────────────────────────────────────
    if (probe.scoring === "channel_signature") {
      const t0 = Date.now();
      try {
        const r = await fetch(chatUrl, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: modelId, messages: [{ role: "user", content: probe.prompt }], stream: false, max_tokens: probe.maxTokens ?? 16 }),
          signal: AbortSignal.timeout(timeoutMs),
        });
        const dur = Date.now() - t0;
        const bodyText = await r.text();
        const responseHeaders: Record<string, string> = {};
        r.headers.forEach((val, key) => { responseHeaders[key.toLowerCase()] = val; });
        let messageId: string | null = null;
        try { messageId = (JSON.parse(bodyText) as { id?: string }).id ?? null; } catch { /* ok */ }
        const sig = classifyChannelSignature({ headers: responseHeaders, messageId, rawBody: bodyText });
        result = {
          probeId: probe.id, label: probe.label, group: probe.group, neutral: probe.neutral ?? true,
          status: "done", passed: null, ttftMs: dur, durationMs: dur, inputTokens: null, outputTokens: null, tps: null,
          response: `channel=${sig.channel} confidence=${sig.confidence} evidence=[${sig.evidence.join(",")}]`,
          passReason: `Upstream channel: ${sig.channel} (confidence: ${(sig.confidence * 100).toFixed(0)}%)`,
          error: null,
        };
      } catch (e) {
        result = { probeId: probe.id, label: probe.label, group: probe.group, neutral: probe.neutral ?? true,
          status: "error", passed: null, passReason: null, ttftMs: null, durationMs: null,
          inputTokens: null, outputTokens: null, tps: null, response: null, error: (e as Error).message?.slice(0, 300) ?? "Unknown" };
      }
      results.push(result);
      onProgress?.(result, idx, probes.length);
      continue;
    }

    // ── adaptive_check (AC-1.b) ───────────────────────────────────────────
    if (probe.scoring === "adaptive_check") {
      if (!probe.adaptiveTriggerPrompt) {
        result = { probeId: probe.id, label: probe.label, group: probe.group, neutral: probe.neutral ?? false,
          status: "skipped", passed: null, passReason: "adaptiveTriggerPrompt not set", ttftMs: null, durationMs: null,
          inputTokens: null, outputTokens: null, tps: null, response: null, error: null };
        results.push(result);
        onProgress?.(result, idx, probes.length);
        continue;
      }
      const t0 = Date.now();
      const makeRequest = async (prompt: string): Promise<string | null> => {
        try {
          const r = await fetch(chatUrl, {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: modelId, messages: [{ role: "user", content: prompt }], stream: false, max_tokens: 256, temperature: 0 }),
            signal: AbortSignal.timeout(timeoutMs),
          });
          if (!r.ok) return null;
          const d = await r.json() as { choices?: Array<{ message?: { content?: string } }> };
          return (d.choices?.[0]?.message?.content ?? "").trim();
        } catch { return null; }
      };
      const [neutralResp, triggerResp] = await Promise.all([
        makeRequest(probe.prompt),
        makeRequest(probe.adaptiveTriggerPrompt),
      ]);
      const dur = Date.now() - t0;

      if (!neutralResp || !triggerResp) {
        result = { probeId: probe.id, label: probe.label, group: probe.group, neutral: probe.neutral ?? false,
          status: "done", passed: "warning", passReason: "One or both requests failed — cannot assess",
          ttftMs: null, durationMs: dur, inputTokens: null, outputTokens: null, tps: null,
          response: `neutral: ${neutralResp?.slice(0,100) ?? "ERROR"} | trigger: ${triggerResp?.slice(0,100) ?? "ERROR"}`, error: null };
      } else {
        const identical = neutralResp === triggerResp;
        result = { probeId: probe.id, label: probe.label, group: probe.group, neutral: probe.neutral ?? false,
          status: "done", ttftMs: null, durationMs: dur, inputTokens: null, outputTokens: null, tps: null,
          response: `neutral: ${neutralResp.slice(0,100)} | trigger: ${triggerResp.slice(0,100)}`,
          passed: identical ? true : false,
          passReason: identical
            ? "Both requests returned identical content — no conditional injection detected"
            : `Responses diverge — possible conditional injection: neutral="${neutralResp.slice(0,60)}" trigger="${triggerResp.slice(0,60)}"`,
          error: null };
      }
      results.push(result);
      onProgress?.(result, idx, probes.length);
      continue;
    }

    // ── thinking_check ────────────────────────────────────────────────────
    if (probe.scoring === "thinking_check") {
      const t0 = Date.now();
      try {
        const r = await fetch(chatUrl, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "anthropic-beta": "interleaved-thinking-2025-05-14" },
          body: JSON.stringify({ model: modelId, messages: [{ role: "user", content: probe.prompt }], stream: true, max_tokens: 2048, thinking: { type: "enabled", budget_tokens: 1024 } }),
          signal: AbortSignal.timeout(timeoutMs),
        });
        const dur = Date.now() - t0;
        if (!r.ok) {
          result = { probeId: probe.id, label: probe.label, group: probe.group, neutral: probe.neutral ?? false,
            status: "done", passed: "warning", passReason: `HTTP ${r.status} — provider may not support thinking or beta header`, ttftMs: dur, durationMs: dur, inputTokens: null, outputTokens: null, tps: null, response: null, error: null };
        } else {
          let hasThinking = false; let fullT = ""; let ttft: number | null = null;
          let inTok: number | null = null; let outTok: number | null = null;
          if (r.body) {
            const rd = r.body.getReader(); const dc = new TextDecoder(); let buf = "";
            while (true) {
              const { done, value } = await rd.read(); if (done) break;
              if (ttft === null) ttft = Date.now() - t0;
              buf += dc.decode(value, { stream: true });
              const ls = buf.split("\n"); buf = ls.pop() ?? "";
              for (const l of ls) {
                if (!l.startsWith("data: ")) continue;
                const p2 = l.slice(6).trim(); if (p2 === "[DONE]") continue;
                try {
                  const j = JSON.parse(p2) as Record<string, unknown>;
                  const delta = (j.choices as Array<{ delta?: { content?: string; type?: string } }>)?.[0]?.delta;
                  if (delta?.content) fullT += delta.content;
                  if ((j as { type?: string }).type === "content_block_start") hasThinking = true;
                  if (delta?.type === "thinking") hasThinking = true;
                  const usage = j.usage as { prompt_tokens?: number; completion_tokens?: number } | undefined;
                  if (usage) { inTok = usage.prompt_tokens ?? null; outTok = usage.completion_tokens ?? null; }
                } catch { /* ignore */ }
              }
            }
          }
          const durationMs = Date.now() - t0;
          result = { probeId: probe.id, label: probe.label, group: probe.group, neutral: probe.neutral ?? false,
            status: "done", passed: hasThinking ? true : "warning",
            passReason: hasThinking ? "Thinking content block detected — provider forwards beta header" : "Response OK but no thinking block — provider may not forward anthropic-beta header",
            ttftMs: ttft ?? durationMs, durationMs, inputTokens: inTok, outputTokens: outTok, tps: null, response: fullT.slice(0, 1000), error: null };
        }
      } catch (e) {
        result = { probeId: probe.id, label: probe.label, group: probe.group, neutral: probe.neutral ?? false,
          status: "error", passed: null, passReason: null, ttftMs: null, durationMs: null, inputTokens: null, outputTokens: null, tps: null, response: null, error: (e as Error).message?.slice(0, 300) ?? "Unknown error" };
      }
      results.push(result);
      onProgress?.(result, idx, probes.length);
      continue;
    }

    // ── consistency_check ─────────────────────────────────────────────────
    if (probe.scoring === "consistency_check") {
      const t0 = Date.now();
      const responses: string[] = [];
      let inTok: number | null = null; let outTok: number | null = null;
      for (let i = 0; i < 2; i++) {
        try {
          const r = await fetch(chatUrl, {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: modelId, messages: [{ role: "user", content: probe.prompt }], stream: false, max_tokens: 32, temperature: 0.7 }),
            signal: AbortSignal.timeout(timeoutMs),
          });
          if (!r.ok) { responses.push("__ERROR__"); continue; }
          const d = await r.json() as { choices?: Array<{ message?: { content?: string } }>; usage?: { prompt_tokens?: number; completion_tokens?: number } };
          responses.push((d.choices?.[0]?.message?.content ?? "").trim());
          if (i === 0) { inTok = d.usage?.prompt_tokens ?? null; outTok = d.usage?.completion_tokens ?? null; }
        } catch { responses.push("__EXCEPTION__"); }
      }
      const ok = responses.length === 2 && !responses.includes("__ERROR__") && !responses.includes("__EXCEPTION__");
      const identical = ok && responses[0] === responses[1];
      result = { probeId: probe.id, label: probe.label, group: probe.group, neutral: probe.neutral ?? false,
        status: "done", durationMs: Date.now() - t0, inputTokens: inTok, outputTokens: outTok,
        response: responses.join(" | "), ttftMs: null, tps: null, error: null,
        passed: !ok ? "warning" : identical ? "warning" : true,
        passReason: !ok ? "One or more requests failed — cannot assess consistency"
          : identical ? `Both responses identical (${responses[0]?.slice(0, 30)}) — possible cache hit`
          : "Responses differ — confirms independent generation" };
      results.push(result);
      onProgress?.(result, idx, probes.length);
      continue;
    }

    // ── context_check ──────────────────────────────────────────────────────
    if (probe.scoring === "context_check") {
      const sendFn = async (message: string) => {
        const r = await fetch(chatUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ model: modelId, messages: [{ role: "user", content: message }], max_tokens: 256, stream: false }),
          signal: AbortSignal.timeout(timeoutMs),
        });
        const j = await r.json() as { choices?: Array<{ message?: { content?: string } }> };
        return j.choices?.[0]?.message?.content ?? "";
      };
      try {
        const ctx = await runContextCheck(sendFn);
        result = { probeId: probe.id, label: probe.label, group: probe.group, neutral: probe.neutral ?? false,
          status: "done", ttftMs: null, durationMs: null, inputTokens: null, outputTokens: null, tps: null,
          response: ctx.reason, passed: ctx.warning ? "warning" : ctx.passed ? true : false, passReason: ctx.reason, error: null };
      } catch (e) {
        result = { probeId: probe.id, label: probe.label, group: probe.group, neutral: probe.neutral ?? false,
          status: "error", passed: null, passReason: null, ttftMs: null, durationMs: null, inputTokens: null, outputTokens: null, tps: null, response: null, error: (e as Error).message?.slice(0, 300) ?? "Unknown error" };
      }
      results.push(result);
      onProgress?.(result, idx, probes.length);
      continue;
    }

    // ── Standard probes (stream or non-stream) ────────────────────────────
    const startTime = Date.now();
    let ttftMs: number | null = null;

    try {
      // ── Dynamic canary: generate, substitute, remember for autoScore ────
      let effectivePrompt = probe.prompt;
      let canaryOverride: string | undefined;
      if (probe.dynamicCanary) {
        const canary = generateCanary();
        canaryOverride = canary;
        const placeholder = probe.canaryPlaceholder ?? "{CANARY}";
        effectivePrompt = probe.prompt.replace(placeholder, canary);
      }

      // ── Build messages array (optional system prompt) ───────────────────
      type Msg = { role: string; content: unknown };
      const messages: Msg[] = [];
      if (probe.systemPrompt) {
        messages.push({ role: "system", content: probe.systemPrompt });
      }

      // ── Build user content (text or multimodal) ─────────────────────────
      let userContent: unknown;
      if (probe.multimodalContent) {
        const mc = probe.multimodalContent;
        if (mc.kind === "image") {
          userContent = [
            { type: "image_url", image_url: { url: `data:${mc.mediaType};base64,${mc.dataB64}` } },
            { type: "text", text: effectivePrompt },
          ];
        } else {
          // pdf — send as a text block with a data URI annotation; not all providers support native PDF
          userContent = [
            { type: "text", text: `[Attached document (${mc.mediaType}), base64: data:${mc.mediaType};base64,${mc.dataB64.slice(0, 64)}…]\n\n${effectivePrompt}` },
          ];
        }
      } else {
        userContent = effectivePrompt;
      }
      messages.push({ role: "user", content: userContent });

      // ── max_tokens: per-probe override → scoring fallback ───────────────
      const isExact = probe.scoring === "exact_match" || probe.scoring === "exact_response";
      const maxTokens = probe.maxTokens ?? (isExact ? 64 : 1024);

      const useStream = probe.scoring !== "header_check";
      const rawSseLines: string[] = [];
      let fullText = "";
      let responseHeaders: Record<string, string> = {};
      let inputTokens: number | null = null;
      let outputTokens: number | null = null;

      const res = await fetch(chatUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: modelId,
          messages,
          stream: useStream,
          ...(useStream ? { stream_options: { include_usage: true } } : {}),
          max_tokens: maxTokens,
          temperature: isExact ? 0 : 0.3,
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!res.ok) {
        const errText = await res.text();
        result = { probeId: probe.id, label: probe.label, group: probe.group, neutral: probe.neutral ?? false,
          status: "error", passed: null, passReason: null, ttftMs: null, durationMs: Date.now() - startTime,
          inputTokens: null, outputTokens: null, tps: null, response: null, error: `HTTP ${res.status}: ${errText.slice(0, 200)}` };
        results.push(result);
        onProgress?.(result, idx, probes.length);
        continue;
      }

      // Capture response headers
      res.headers.forEach((val, key) => { responseHeaders[key.toLowerCase()] = val; });

      if (useStream && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (ttftMs === null) ttftMs = Date.now() - startTime;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n"); buf = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6).trim();
            rawSseLines.push(payload);
            if (payload === "[DONE]") continue;
            try {
              const chunk = JSON.parse(payload) as { choices?: Array<{ delta?: { content?: string } }>; usage?: { prompt_tokens?: number; completion_tokens?: number } };
              if (chunk.choices?.[0]?.delta?.content) fullText += chunk.choices[0].delta.content;
              if (chunk.usage) { inputTokens = chunk.usage.prompt_tokens ?? null; outputTokens = chunk.usage.completion_tokens ?? null; }
            } catch { /* ignore */ }
          }
        }
      } else {
        const data = await res.json() as { choices?: Array<{ message?: { content?: string } }>; usage?: { prompt_tokens?: number; completion_tokens?: number } };
        fullText = data.choices?.[0]?.message?.content ?? "";
        inputTokens = data.usage?.prompt_tokens ?? null;
        outputTokens = data.usage?.completion_tokens ?? null;
      }

      const durationMs = Date.now() - startTime;
      const tps = (outputTokens && durationMs > 0) ? Math.round(outputTokens / (durationMs / 1000)) : null;

      // ── token_check ──────────────────────────────────────────────────────
      if (probe.scoring === "token_check") {
        const inflation = inputTokens !== null ? detectTokenInflation(inputTokens, TOKEN_INFLATION_THRESHOLD) : null;
        result = { probeId: probe.id, label: probe.label, group: probe.group, neutral: probe.neutral ?? false,
          status: "done", ttftMs: ttftMs ?? durationMs, durationMs, inputTokens, outputTokens, tps,
          response: fullText.slice(0, 1000), error: null,
          passed: inflation ? (inflation.detected ? false : true) : "warning",
          passReason: inflation
            ? (inflation.detected ? `Token inflation detected: prompt_tokens=${inflation.actualPromptTokens} (threshold: ${TOKEN_INFLATION_THRESHOLD}) — probable hidden system prompt injection` : `No inflation: prompt_tokens=${inflation.actualPromptTokens}`)
            : "Token count not available" };
        results.push(result);
        onProgress?.(result, idx, probes.length);
        continue;
      }

      // ── sse_compliance ───────────────────────────────────────────────────
      if (probe.scoring === "sse_compliance") {
        const compliance = checkSSECompliance(rawSseLines);
        result = { probeId: probe.id, label: probe.label, group: probe.group, neutral: probe.neutral ?? false,
          status: "done", ttftMs: ttftMs ?? durationMs, durationMs, inputTokens, outputTokens, tps,
          response: fullText.slice(0, 500), error: null,
          passed: compliance.passed ? true : (compliance.warning ? "warning" : false),
          passReason: compliance.passed
            ? `SSE format OK (${compliance.dataLines} chunks, [DONE] confirmed)${compliance.warning ? ` — ${compliance.missingChoicesCount} chunks missing choices field` : ""}`
            : compliance.issues.join("; ") };
        results.push(result);
        onProgress?.(result, idx, probes.length);
        continue;
      }

      // ── Auto-scoreable (exact_match, keyword_match, header_check, exact_response) ─
      const autoResult = autoScore(probe, fullText, responseHeaders, canaryOverride);
      let passed: true | false | "warning" | null = null;
      let passReason: string | null = null;

      if (autoResult) {
        passed = autoResult.passed;
        passReason = autoResult.reason;
      } else if (probe.scoring === "feature_extract") {
        passed = null;
        passReason = "identity feature probe — response collected for fingerprint analysis";
      } else if (probe.scoring === "llm_judge") {
        // Use judge endpoint + baseline for similarity scoring
        if (judge && baseline && baseline[probe.id]) {
          const judged = await runJudgeWithBaseline(
            judge.baseUrl, judge.apiKey, judge.modelId, probe, fullText,
            baseline[probe.id], judge.threshold ?? 7, timeoutMs,
          );
          passed = judged.passed === null ? null : judged.passed ? true : false;
          passReason = judged.reason;
        } else if (judge && !baseline) {
          passed = null;
          passReason = "llm_judge: no baseline provided — pass --baseline <file> or --fetch-baseline <url> to enable similarity scoring";
        } else if (!judge) {
          passed = null;
          passReason = "llm_judge: no judge endpoint configured — pass --judge-base-url to enable auto-scoring";
        } else {
          passed = null;
          passReason = `llm_judge: no baseline entry for probe '${probe.id}' — run collect-baseline to build one`;
        }
      }

      result = { probeId: probe.id, label: probe.label, group: probe.group, neutral: probe.neutral ?? false,
        status: "done", ttftMs: ttftMs ?? durationMs, durationMs, inputTokens, outputTokens, tps,
        response: fullText.slice(0, 4000), passed, passReason, error: null };

    } catch (err) {
      result = { probeId: probe.id, label: probe.label, group: probe.group, neutral: probe.neutral ?? false,
        status: "error", passed: null, passReason: null, ttftMs: null, durationMs: null,
        inputTokens: null, outputTokens: null, tps: null, response: null,
        error: ((err as Error).message ?? "Unknown error").slice(0, 300) };
    }

    results.push(result);
    onProgress?.(result, idx, probes.length);
  }

  // ── Identity Phase ────────────────────────────────────────────────────────
  let identityAssessment: IdentityAssessment | undefined;
  {
    const featureResponses: Record<string, string> = {};
    for (const r of results) {
      if (r.status === "done" && r.response) {
        const probe = probes.find(p => p.id === r.probeId);
        if (probe?.scoring === "feature_extract") {
          featureResponses[r.probeId] = r.response;
        }
      }
    }

    const riskFlags: string[] = [];
    for (const r of results) {
      if (r.passed === false) {
        const probe = probes.find(p => p.id === r.probeId);
        if (probe && (probe.group === "integrity" || probe.group === "security")) {
          riskFlags.push(`${r.label}: ${r.passReason ?? r.error ?? "failed"}`);
        }
      }
      if (r.passed === "warning" && r.probeId === "consistency_check") {
        riskFlags.push("consistency_check warning: possible cache hit — fingerprint confidence reduced");
      }
    }

    if (Object.keys(featureResponses).length > 0) {
      const features = extractFingerprint(featureResponses);

      // Rule-based candidates (always run)
      const ruleCandidates = matchCandidates(features);
      const ruleScores = ruleCandidates.map(c => ({ family: c.family, score: c.score }));

      // Optional LLM judge signal
      let judgeScores: Array<{ family: string; score: number }> = [];
      if (options.identityJudge) {
        try {
          const judgeResult = await judgeFingerprint(
            featureResponses,
            options.identityJudge.baseUrl,
            options.identityJudge.apiKey,
            options.identityJudge.modelId,
          );
          judgeScores = judgeResult.scores;
        } catch { /* judge unavailable — fall back to rule-only */ }
      }

      // Optional vector signal
      let vectorScores: Array<{ family: string; score: number }> = [];
      if (options.embeddingEndpoint?.references?.length) {
        try {
          const embedding = await embedProbeResponses(
            featureResponses,
            options.embeddingEndpoint.baseUrl,
            options.embeddingEndpoint.apiKey,
            options.embeddingEndpoint.modelId,
          );
          if (embedding !== null) {
            vectorScores = pickTopVectorScores(embedding, options.embeddingEndpoint.references);
          }
        } catch { /* embeddings unavailable — fall back */ }
      }

      // Fuse all signals (W_RULE=0.4, W_JUDGE=0.4, W_VECTOR=0.2)
      // fuseScores returns IdentityCandidate[] directly
      const candidates = fuseScores(ruleScores, judgeScores, vectorScores);

      const { status, confidence, evidence, predictedFamily } = deriveVerdictFromClaimedModel(
        candidates,
        options.claimedModel,
      );
      const adjustedConfidence = riskFlags.length > 0
        ? Math.max(0, confidence - 0.15 * Math.min(riskFlags.length, 3))
        : confidence;

      identityAssessment = {
        status,
        confidence: Math.round(adjustedConfidence * 100) / 100,
        claimedModel: options.claimedModel,
        predictedFamily,
        predictedCandidates: candidates,
        riskFlags,
        evidence,
      };
    }
  }

  // ── Finalize ──────────────────────────────────────────────────────────────
  const completedAt = new Date().toISOString();
  const { low, high } = computeProbeScore(results.map(r => ({ status: r.status, passed: r.passed, neutral: r.neutral })));
  const totalIn = results.reduce((s, r) => s + (r.inputTokens ?? 0), 0);
  const totalOut = results.reduce((s, r) => s + (r.outputTokens ?? 0), 0);

  return {
    baseUrl,
    modelId,
    claimedModel: options.claimedModel,
    startedAt,
    completedAt,
    score: low,
    scoreMax: high,
    totalInputTokens: totalIn > 0 ? totalIn : null,
    totalOutputTokens: totalOut > 0 ? totalOut : null,
    results,
    identityAssessment,
  };
}
