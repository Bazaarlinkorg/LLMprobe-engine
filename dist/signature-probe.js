"use strict";
// src/signature-probe.ts — Anthropic extended-thinking signature round-trip (MIT)
//
// A genuine Anthropic upstream returns an opaque `signature` on every thinking
// content block and will reject a round-tripped message whose signature has been
// altered (HTTP 400 invalid_request_error).
// A middleman that synthesises thinking blocks cannot produce a signature that
// the official verifier accepts.
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractThinkingBlock = extractThinkingBlock;
exports.buildRoundtripBody = buildRoundtripBody;
exports.verifySignatureRoundtrip = verifySignatureRoundtrip;
function extractThinkingBlock(raw) {
    if (!raw || typeof raw !== "object")
        return null;
    const content = raw.content;
    if (!Array.isArray(content))
        return null;
    for (const block of content) {
        if (!block || typeof block !== "object")
            continue;
        const b = block;
        if (b.type !== "thinking")
            continue;
        if (typeof b.signature !== "string" || b.signature.length === 0)
            continue;
        if (typeof b.thinking !== "string")
            continue;
        return { type: "thinking", thinking: b.thinking, signature: b.signature };
    }
    return null;
}
function buildRoundtripBody(args) {
    const { model, originalUserPrompt, thinkingBlock, assistantText, followUpUserPrompt } = args;
    return {
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
}
async function verifySignatureRoundtrip(args) {
    const { endpoint, apiKey, authHeader = "x-api-key", fetchImpl = fetch, signal, } = args;
    const body = buildRoundtripBody(args);
    const headers = {
        "content-type": "application/json",
        "anthropic-version": "2023-06-01",
        ...(authHeader === "x-api-key"
            ? { "x-api-key": apiKey }
            : { authorization: `Bearer ${apiKey}` }),
    };
    let resp;
    try {
        resp = await fetchImpl(endpoint, {
            method: "POST",
            headers,
            body: JSON.stringify(body),
            signal: signal ?? AbortSignal.timeout(60000),
        });
    }
    catch (e) {
        return { verified: false, httpStatus: 0, reason: "network_error", rawErrorSnippet: e.message?.slice(0, 200) ?? null };
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
//# sourceMappingURL=signature-probe.js.map