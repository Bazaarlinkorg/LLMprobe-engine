// src/signature-probe.ts — Anthropic extended-thinking signature round-trip (MIT)
//
// A genuine Anthropic upstream returns an opaque `signature` on every thinking
// content block and will reject a round-tripped message whose signature has been
// altered (HTTP 400 invalid_request_error).
// A middleman that synthesises thinking blocks cannot produce a signature that
// the official verifier accepts.

export interface AnthropicThinkingBlock {
  type: "thinking";
  thinking: string;
  signature: string;
}

export function extractThinkingBlock(raw: unknown): AnthropicThinkingBlock | null {
  if (!raw || typeof raw !== "object") return null;
  const content = (raw as { content?: unknown }).content;
  if (!Array.isArray(content)) return null;
  for (const block of content) {
    if (!block || typeof block !== "object") continue;
    const b = block as Record<string, unknown>;
    if (b.type !== "thinking") continue;
    if (typeof b.signature !== "string" || b.signature.length === 0) continue;
    if (typeof b.thinking !== "string") continue;
    return { type: "thinking", thinking: b.thinking, signature: b.signature };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Round-trip helpers
// ---------------------------------------------------------------------------

export interface RoundtripBodyArgs {
  model: string;
  originalUserPrompt: string;
  thinkingBlock: AnthropicThinkingBlock;
  assistantText: string;
  followUpUserPrompt: string;
}

export interface VerifyArgs extends RoundtripBodyArgs {
  endpoint: string;
  apiKey: string;
  /** Override header style for relays that use Authorization: Bearer instead of x-api-key. */
  authHeader?: "x-api-key" | "authorization";
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}

export interface VerifyResult {
  verified: boolean;
  httpStatus: number;
  reason: "ok" | "signature_rejected" | "http_error" | "network_error";
  rawErrorSnippet: string | null;
}

export async function verifySignatureRoundtrip(args: VerifyArgs): Promise<VerifyResult> {
  const {
    endpoint, apiKey, model,
    originalUserPrompt, thinkingBlock, assistantText, followUpUserPrompt,
    authHeader = "x-api-key",
    fetchImpl = fetch,
    signal,
  } = args;

  const body = {
    model,
    max_tokens: 512,
    thinking: { type: "enabled", budget_tokens: 1024 },
    messages: [
      { role: "user", content: originalUserPrompt },
      {
        role: "assistant",
        content: [
          { type: "thinking", thinking: thinkingBlock.thinking, signature: thinkingBlock.signature },
          { type: "text", text: assistantText },
        ],
      },
      { role: "user", content: followUpUserPrompt },
    ],
  };

  const headers: Record<string, string> = {
    "content-type": "application/json",
    "anthropic-version": "2023-06-01",
    ...(authHeader === "x-api-key"
      ? { "x-api-key": apiKey }
      : { authorization: `Bearer ${apiKey}` }),
  };

  let resp: Response;
  try {
    resp = await fetchImpl(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: signal ?? AbortSignal.timeout(60_000),
    });
  } catch (e) {
    return { verified: false, httpStatus: 0, reason: "network_error", rawErrorSnippet: (e as Error).message?.slice(0, 200) ?? null };
  }

  const bodyText = await resp.text().catch(() => "");

  if (resp.ok) {
    return { verified: true, httpStatus: resp.status, reason: "ok", rawErrorSnippet: null };
  }

  if (resp.status === 400 && bodyText.toLowerCase().includes("invalid")) {
    return { verified: false, httpStatus: 400, reason: "signature_rejected", rawErrorSnippet: bodyText.slice(0, 300) };
  }

  return { verified: false, httpStatus: resp.status, reason: "http_error", rawErrorSnippet: bodyText.slice(0, 300) };
}
