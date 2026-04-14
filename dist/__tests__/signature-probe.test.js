"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const signature_probe_js_1 = require("../signature-probe.js");
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
(0, vitest_1.describe)("extractThinkingBlock", () => {
    (0, vitest_1.it)("returns the thinking block when present", () => {
        const result = (0, signature_probe_js_1.extractThinkingBlock)(GENUINE_RESPONSE);
        (0, vitest_1.expect)(result).not.toBeNull();
        (0, vitest_1.expect)(result.type).toBe("thinking");
        (0, vitest_1.expect)(result.signature).toMatch(/^ErcBCkg/);
        (0, vitest_1.expect)(result.thinking).toContain("2+2");
    });
    (0, vitest_1.it)("returns null when content array has no thinking block", () => {
        const noThinking = { ...GENUINE_RESPONSE, content: [{ type: "text", text: "4" }] };
        (0, vitest_1.expect)((0, signature_probe_js_1.extractThinkingBlock)(noThinking)).toBeNull();
    });
    (0, vitest_1.it)("returns null when signature is missing from the thinking block", () => {
        const noSig = {
            ...GENUINE_RESPONSE,
            content: [{ type: "thinking", thinking: "..." }],
        };
        (0, vitest_1.expect)((0, signature_probe_js_1.extractThinkingBlock)(noSig)).toBeNull();
    });
    (0, vitest_1.it)("returns null when signature is empty string", () => {
        const emptySig = {
            ...GENUINE_RESPONSE,
            content: [{ type: "thinking", thinking: "...", signature: "" }],
        };
        (0, vitest_1.expect)((0, signature_probe_js_1.extractThinkingBlock)(emptySig)).toBeNull();
    });
    (0, vitest_1.it)("returns null on malformed input", () => {
        (0, vitest_1.expect)((0, signature_probe_js_1.extractThinkingBlock)(null)).toBeNull();
        (0, vitest_1.expect)((0, signature_probe_js_1.extractThinkingBlock)({})).toBeNull();
        (0, vitest_1.expect)((0, signature_probe_js_1.extractThinkingBlock)({ content: "not an array" })).toBeNull();
    });
});
(0, vitest_1.describe)("buildRoundtripBody", () => {
    const block = {
        type: "thinking",
        thinking: "Let me think about this.",
        signature: "ErcBCkgIBhABGAIiQI6testsig=",
    };
    (0, vitest_1.it)("builds a 2-turn message body echoing the thinking block unchanged", () => {
        const body = (0, signature_probe_js_1.buildRoundtripBody)({
            model: "claude-opus-4-5",
            originalUserPrompt: "What is 2+2?",
            thinkingBlock: block,
            assistantText: "4",
            followUpUserPrompt: "And 3+3?",
        });
        (0, vitest_1.expect)(body.model).toBe("claude-opus-4-5");
        (0, vitest_1.expect)(body.max_tokens).toBeGreaterThan(0);
        (0, vitest_1.expect)(body.thinking).toEqual({ type: "enabled", budget_tokens: vitest_1.expect.any(Number) });
        (0, vitest_1.expect)(body.messages).toHaveLength(3);
        (0, vitest_1.expect)(body.messages[0]).toEqual({ role: "user", content: "What is 2+2?" });
        (0, vitest_1.expect)(body.messages[1].role).toBe("assistant");
        const assistantContent = body.messages[1].content;
        (0, vitest_1.expect)(Array.isArray(assistantContent)).toBe(true);
        (0, vitest_1.expect)(assistantContent[0].type).toBe("thinking");
        (0, vitest_1.expect)(assistantContent[0].signature).toBe(block.signature);
        (0, vitest_1.expect)(assistantContent[1].type).toBe("text");
        (0, vitest_1.expect)(body.messages[2]).toEqual({ role: "user", content: "And 3+3?" });
    });
    (0, vitest_1.it)("never mutates the passed-in thinking block", () => {
        const original = { ...block };
        (0, signature_probe_js_1.buildRoundtripBody)({
            model: "claude-opus-4-5",
            originalUserPrompt: "q",
            thinkingBlock: block,
            assistantText: "a",
            followUpUserPrompt: "q2",
        });
        (0, vitest_1.expect)(block).toEqual(original);
    });
});
(0, vitest_1.describe)("verifySignatureRoundtrip", () => {
    const block = {
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
    (0, vitest_1.it)("returns { verified: true } on HTTP 200", async () => {
        const fakeFetch = vitest_1.vi.fn().mockResolvedValue({
            status: 200,
            ok: true,
            text: async () => JSON.stringify({ id: "msg_2", content: [{ type: "text", text: "ok" }] }),
        });
        const result = await (0, signature_probe_js_1.verifySignatureRoundtrip)({ ...baseArgs, fetchImpl: fakeFetch });
        (0, vitest_1.expect)(result.verified).toBe(true);
        (0, vitest_1.expect)(result.httpStatus).toBe(200);
        (0, vitest_1.expect)(fakeFetch).toHaveBeenCalledTimes(1);
    });
    (0, vitest_1.it)("returns { verified: false, reason: 'signature_rejected' } on HTTP 400", async () => {
        const fakeFetch = vitest_1.vi.fn().mockResolvedValue({
            status: 400,
            ok: false,
            text: async () => JSON.stringify({
                type: "error",
                error: { type: "invalid_request_error", message: "invalid signature" },
            }),
        });
        const result = await (0, signature_probe_js_1.verifySignatureRoundtrip)({ ...baseArgs, fetchImpl: fakeFetch });
        (0, vitest_1.expect)(result.verified).toBe(false);
        (0, vitest_1.expect)(result.reason).toBe("signature_rejected");
        (0, vitest_1.expect)(result.httpStatus).toBe(400);
    });
    (0, vitest_1.it)("returns { verified: false, reason: 'http_error' } on 5xx", async () => {
        const fakeFetch = vitest_1.vi.fn().mockResolvedValue({
            status: 502,
            ok: false,
            text: async () => "bad gateway",
        });
        const result = await (0, signature_probe_js_1.verifySignatureRoundtrip)({ ...baseArgs, fetchImpl: fakeFetch });
        (0, vitest_1.expect)(result.verified).toBe(false);
        (0, vitest_1.expect)(result.reason).toBe("http_error");
        (0, vitest_1.expect)(result.httpStatus).toBe(502);
    });
    (0, vitest_1.it)("sends POST with x-api-key header and echoes signature in body", async () => {
        const fakeFetch = vitest_1.vi.fn().mockResolvedValue({
            status: 200,
            ok: true,
            text: async () => "{}",
        });
        await (0, signature_probe_js_1.verifySignatureRoundtrip)({ ...baseArgs, fetchImpl: fakeFetch });
        const [url, init] = fakeFetch.mock.calls[0];
        (0, vitest_1.expect)(url).toBe("https://api.anthropic.com/v1/messages");
        (0, vitest_1.expect)(init.method).toBe("POST");
        (0, vitest_1.expect)(init.headers["x-api-key"]).toBe("sk-ant-test");
        (0, vitest_1.expect)(init.headers["anthropic-version"]).toBeDefined();
        const body = JSON.parse(init.body);
        (0, vitest_1.expect)(body.messages[1].content[0].signature).toBe(block.signature);
    });
    (0, vitest_1.it)("supports authHeader: 'authorization' for Bearer-style relays", async () => {
        const fakeFetch = vitest_1.vi.fn().mockResolvedValue({
            status: 200, ok: true, text: async () => "{}",
        });
        await (0, signature_probe_js_1.verifySignatureRoundtrip)({
            ...baseArgs,
            authHeader: "authorization",
            fetchImpl: fakeFetch,
        });
        const [, init] = fakeFetch.mock.calls[0];
        (0, vitest_1.expect)(init.headers["authorization"]).toBe("Bearer sk-ant-test");
        (0, vitest_1.expect)(init.headers["x-api-key"]).toBeUndefined();
    });
    (0, vitest_1.it)("returns { verified: false, reason: 'network_error' } when fetch throws", async () => {
        const fakeFetch = vitest_1.vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
        const result = await (0, signature_probe_js_1.verifySignatureRoundtrip)({ ...baseArgs, fetchImpl: fakeFetch });
        (0, vitest_1.expect)(result.verified).toBe(false);
        (0, vitest_1.expect)(result.reason).toBe("network_error");
        (0, vitest_1.expect)(result.httpStatus).toBe(0);
        (0, vitest_1.expect)(result.rawErrorSnippet).toContain("ECONNREFUSED");
    });
});
//# sourceMappingURL=signature-probe.test.js.map