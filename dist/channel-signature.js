"use strict";
// src/channel-signature.ts — Pure upstream channel classifier (MIT)
// Inspects response headers + message ID + raw body to determine the real upstream.
// Zero network/DB dependencies.
Object.defineProperty(exports, "__esModule", { value: true });
exports.classifyChannelSignature = classifyChannelSignature;
const WEIGHTS = {
    bedrockHeader: 1.0,
    bedrockIdPrefix: 1.0,
    bedrockBody: 0.9,
    vertexHeaderStrong: 1.0,
    vertexHeaderWeak: 0.7,
    anthropicHeader: 0.95,
    anthropicRequestId: 0.6,
};
function lowerHeaders(h) {
    const out = {};
    for (const [k, v] of Object.entries(h))
        out[k.toLowerCase()] = v;
    return out;
}
function classifyChannelSignature(input) {
    const headers = lowerHeaders(input.headers);
    const id = input.messageId ?? "";
    const body = input.rawBody ?? "";
    const scores = {
        "aws-bedrock": 0,
        "google-vertex": 0,
        "anthropic-official": 0,
        "unknown-proxy": 0,
    };
    const evidence = [];
    // ── AWS Bedrock ───────────────────────────────────────────────────────────
    for (const key of Object.keys(headers)) {
        if (key.startsWith("x-amzn-bedrock-") || key === "x-amzn-requestid" || key.startsWith("x-amz-")) {
            scores["aws-bedrock"] += WEIGHTS.bedrockHeader;
            evidence.push(`header:${key}`);
            break;
        }
    }
    if (id.startsWith("msg_bdrk_")) {
        scores["aws-bedrock"] += WEIGHTS.bedrockIdPrefix;
        evidence.push("id_prefix:msg_bdrk_");
    }
    if (body.includes("bedrock-2023-05-31")) {
        scores["aws-bedrock"] += WEIGHTS.bedrockBody;
        evidence.push("body:anthropic_version=bedrock-2023-05-31");
    }
    // ── Google Vertex ─────────────────────────────────────────────────────────
    for (const key of Object.keys(headers)) {
        if (key.startsWith("x-goog-")) {
            scores["google-vertex"] += WEIGHTS.vertexHeaderStrong;
            evidence.push(`header:${key}`);
            break;
        }
    }
    if (headers["server"]?.toLowerCase().includes("google frontend")) {
        scores["google-vertex"] += WEIGHTS.vertexHeaderStrong;
        evidence.push(`header:server=${headers["server"]}`);
    }
    if (headers["via"]?.toLowerCase().includes("google")) {
        scores["google-vertex"] += WEIGHTS.vertexHeaderWeak;
        evidence.push(`header:via=${headers["via"]}`);
    }
    // ── Anthropic Official ────────────────────────────────────────────────────
    if (Object.keys(headers).some(k => k.startsWith("anthropic-ratelimit-")) ||
        headers["anthropic-organization-id"]) {
        scores["anthropic-official"] += WEIGHTS.anthropicHeader;
        evidence.push("header:anthropic-ratelimit-*");
    }
    const reqId = headers["request-id"] ?? "";
    if (reqId.startsWith("req_")) {
        scores["anthropic-official"] += WEIGHTS.anthropicRequestId;
        evidence.push(`header:request-id=${reqId.slice(0, 10)}...`);
    }
    // ── Pick winner ───────────────────────────────────────────────────────────
    // Bedrock and Vertex take precedence over anthropic-official when they have
    // ANY signal, because proxies frequently rebroadcast real Anthropic headers.
    const maxNonUnknown = Math.max(scores["aws-bedrock"], scores["google-vertex"], scores["anthropic-official"]);
    if (maxNonUnknown === 0) {
        return { channel: "unknown-proxy", confidence: 0.5, evidence };
    }
    // Prefer the highest-scored channel; Bedrock/Vertex over Anthropic-official on tie
    let winner = "anthropic-official";
    if (scores["aws-bedrock"] >= scores["google-vertex"] && scores["aws-bedrock"] >= scores["anthropic-official"]) {
        winner = "aws-bedrock";
    }
    else if (scores["google-vertex"] >= scores["anthropic-official"]) {
        winner = "google-vertex";
    }
    // Normalise confidence to max possible score in this channel's signal set
    const maxPossible = winner === "aws-bedrock"
        ? WEIGHTS.bedrockHeader + WEIGHTS.bedrockIdPrefix + WEIGHTS.bedrockBody
        : winner === "google-vertex"
            ? WEIGHTS.vertexHeaderStrong + WEIGHTS.vertexHeaderStrong + WEIGHTS.vertexHeaderWeak
            : WEIGHTS.anthropicHeader + WEIGHTS.anthropicRequestId;
    const confidence = Math.min(1, scores[winner] / maxPossible);
    return { channel: winner, confidence: Math.round(confidence * 100) / 100, evidence };
}
//# sourceMappingURL=channel-signature.js.map