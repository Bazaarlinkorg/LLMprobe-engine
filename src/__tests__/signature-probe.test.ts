import { describe, it, expect, vi } from "vitest";
import {
  extractThinkingBlock,
  buildRoundtripBody,
  verifySignatureRoundtrip,
  type AnthropicThinkingBlock,
} from "../signature-probe.js";

const GENUINE_RESPONSE = {
  id: "msg_01ABC",
  type: "message",
  role: "assistant",
  model: "claude-opus-4-5",
  content: [
    {
      type: "thinking",
      thinking: "The user asked for 2+2. That is 4.",
      signature: "ErcBCkgIBhABGAIiQI6...opaque-blob...=",
    },
    { type: "text", text: "4" },
  ],
  stop_reason: "end_turn",
  usage: { input_tokens: 10, output_tokens: 5 },
};

describe("extractThinkingBlock", () => {
  it("returns the thinking block when present", () => {
    const result = extractThinkingBlock(GENUINE_RESPONSE);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("thinking");
    expect(result!.signature).toMatch(/^ErcBCkg/);
    expect(result!.thinking).toContain("2+2");
  });

  it("returns null when content array has no thinking block", () => {
    const noThinking = { ...GENUINE_RESPONSE, content: [{ type: "text", text: "4" }] };
    expect(extractThinkingBlock(noThinking)).toBeNull();
  });

  it("returns null when signature is missing from the thinking block", () => {
    const noSig = {
      ...GENUINE_RESPONSE,
      content: [{ type: "thinking", thinking: "..." }],
    };
    expect(extractThinkingBlock(noSig)).toBeNull();
  });

  it("returns null when signature is empty string", () => {
    const emptySig = {
      ...GENUINE_RESPONSE,
      content: [{ type: "thinking", thinking: "...", signature: "" }],
    };
    expect(extractThinkingBlock(emptySig)).toBeNull();
  });

  it("returns null on malformed input", () => {
    expect(extractThinkingBlock(null)).toBeNull();
    expect(extractThinkingBlock({})).toBeNull();
    expect(extractThinkingBlock({ content: "not an array" })).toBeNull();
  });
});

describe("buildRoundtripBody", () => {
  const block: AnthropicThinkingBlock = {
    type: "thinking",
    thinking: "Let me think about this.",
    signature: "ErcBCkgIBhABGAIiQI6testsig=",
  };

  it("builds a 2-turn message body echoing the thinking block unchanged", () => {
    const body = buildRoundtripBody({
      model: "claude-opus-4-5",
      originalUserPrompt: "What is 2+2?",
      thinkingBlock: block,
      assistantText: "4",
      followUpUserPrompt: "And 3+3?",
    });

    expect(body.model).toBe("claude-opus-4-5");
    expect(body.max_tokens).toBeGreaterThan(0);
    expect(body.thinking).toEqual({ type: "enabled", budget_tokens: expect.any(Number) });
    expect(body.messages).toHaveLength(3);
    expect(body.messages[0]).toEqual({ role: "user", content: "What is 2+2?" });
    expect(body.messages[1].role).toBe("assistant");
    const assistantContent = body.messages[1].content as Array<{ type: string }>;
    expect(Array.isArray(assistantContent)).toBe(true);
    expect(assistantContent[0].type).toBe("thinking");
    expect((assistantContent[0] as AnthropicThinkingBlock).signature).toBe(block.signature);
    expect(assistantContent[1].type).toBe("text");
    expect(body.messages[2]).toEqual({ role: "user", content: "And 3+3?" });
  });

  it("never mutates the passed-in thinking block", () => {
    const original = { ...block };
    buildRoundtripBody({
      model: "claude-opus-4-5",
      originalUserPrompt: "q",
      thinkingBlock: block,
      assistantText: "a",
      followUpUserPrompt: "q2",
    });
    expect(block).toEqual(original);
  });
});

describe("verifySignatureRoundtrip", () => {
  const block: AnthropicThinkingBlock = {
    type: "thinking",
    thinking: "t",
    signature: "ErcBCkgIBhABGAIiQI6sig=",
  };

  const baseArgs = {
    endpoint: "https://api.anthropic.com/v1/messages",
    apiKey: "sk-ant-test",
    model: "claude-opus-4-5",
    originalUserPrompt: "q",
    thinkingBlock: block,
    assistantText: "a",
    followUpUserPrompt: "q2",
  };

  it("returns { verified: true } on HTTP 200", async () => {
    const fakeFetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      text: async () => JSON.stringify({ id: "msg_2", content: [{ type: "text", text: "ok" }] }),
    });
    const result = await verifySignatureRoundtrip({ ...baseArgs, fetchImpl: fakeFetch as unknown as typeof fetch });
    expect(result.verified).toBe(true);
    expect(result.httpStatus).toBe(200);
    expect(fakeFetch).toHaveBeenCalledTimes(1);
  });

  it("returns { verified: false, reason: 'signature_rejected' } on HTTP 400", async () => {
    const fakeFetch = vi.fn().mockResolvedValue({
      status: 400,
      ok: false,
      text: async () =>
        JSON.stringify({
          type: "error",
          error: { type: "invalid_request_error", message: "invalid signature" },
        }),
    });
    const result = await verifySignatureRoundtrip({ ...baseArgs, fetchImpl: fakeFetch as unknown as typeof fetch });
    expect(result.verified).toBe(false);
    expect(result.reason).toBe("signature_rejected");
    expect(result.httpStatus).toBe(400);
  });

  it("returns { verified: false, reason: 'http_error' } on 5xx", async () => {
    const fakeFetch = vi.fn().mockResolvedValue({
      status: 502,
      ok: false,
      text: async () => "bad gateway",
    });
    const result = await verifySignatureRoundtrip({ ...baseArgs, fetchImpl: fakeFetch as unknown as typeof fetch });
    expect(result.verified).toBe(false);
    expect(result.reason).toBe("http_error");
    expect(result.httpStatus).toBe(502);
  });

  it("sends POST with x-api-key header and echoes signature in body", async () => {
    const fakeFetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      text: async () => "{}",
    });
    await verifySignatureRoundtrip({ ...baseArgs, fetchImpl: fakeFetch as unknown as typeof fetch });
    const [url, init] = fakeFetch.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }];
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    expect(init.method).toBe("POST");
    expect(init.headers["x-api-key"]).toBe("sk-ant-test");
    expect(init.headers["anthropic-version"]).toBeDefined();
    const body = JSON.parse(init.body as string) as { messages: Array<{ content: Array<AnthropicThinkingBlock> }> };
    expect(body.messages[1].content[0].signature).toBe(block.signature);
  });

  it("supports authHeader: 'authorization' for Bearer-style relays", async () => {
    const fakeFetch = vi.fn().mockResolvedValue({
      status: 200, ok: true, text: async () => "{}",
    });
    await verifySignatureRoundtrip({
      ...baseArgs,
      authHeader: "authorization",
      fetchImpl: fakeFetch as unknown as typeof fetch,
    });
    const [, init] = fakeFetch.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }];
    expect(init.headers["authorization"]).toBe("Bearer sk-ant-test");
    expect(init.headers["x-api-key"]).toBeUndefined();
  });

  it("returns { verified: false, reason: 'network_error' } when fetch throws", async () => {
    const fakeFetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    const result = await verifySignatureRoundtrip({ ...baseArgs, fetchImpl: fakeFetch as unknown as typeof fetch });
    expect(result.verified).toBe(false);
    expect(result.reason).toBe("network_error");
    expect(result.httpStatus).toBe(0);
    expect(result.rawErrorSnippet).toContain("ECONNREFUSED");
  });
});
