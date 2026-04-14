"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const channel_signature_js_1 = require("../channel-signature.js");
(0, vitest_1.describe)("classifyChannelSignature", () => {
    (0, vitest_1.it)("detects AWS Bedrock from x-amzn-bedrock-* header", () => {
        const r = (0, channel_signature_js_1.classifyChannelSignature)({
            headers: { "x-amzn-bedrock-invocation-latency": "1234", "x-amzn-requestid": "abc" },
            messageId: "msg_bdrk_01ABC",
            rawBody: '{"id":"msg_bdrk_01ABC","type":"message"}',
        });
        (0, vitest_1.expect)(r.channel).toBe("aws-bedrock");
        (0, vitest_1.expect)(r.confidence).toBeGreaterThanOrEqual(0.9);
        (0, vitest_1.expect)(r.evidence).toContain("header:x-amzn-bedrock-invocation-latency");
        (0, vitest_1.expect)(r.evidence).toContain("id_prefix:msg_bdrk_");
    });
    (0, vitest_1.it)("detects AWS Bedrock from id prefix alone", () => {
        const r = (0, channel_signature_js_1.classifyChannelSignature)({
            headers: { "content-type": "application/json" },
            messageId: "msg_bdrk_01XYZ",
            rawBody: "",
        });
        (0, vitest_1.expect)(r.channel).toBe("aws-bedrock");
        (0, vitest_1.expect)(r.evidence).toContain("id_prefix:msg_bdrk_");
    });
    (0, vitest_1.it)("detects Google Vertex from x-goog-* header", () => {
        const r = (0, channel_signature_js_1.classifyChannelSignature)({
            headers: { "x-goog-api-client": "gl-python/3.11", "server": "Google Frontend" },
            messageId: "msg_01ABC",
            rawBody: "",
        });
        (0, vitest_1.expect)(r.channel).toBe("google-vertex");
        (0, vitest_1.expect)(r.evidence).toContain("header:x-goog-api-client");
        (0, vitest_1.expect)(r.evidence).toContain("header:server=Google Frontend");
    });
    (0, vitest_1.it)("detects Google Vertex from 'via: 1.1 google' header", () => {
        const r = (0, channel_signature_js_1.classifyChannelSignature)({
            headers: { "via": "1.1 google" },
            messageId: "msg_01ABC",
            rawBody: "",
        });
        (0, vitest_1.expect)(r.channel).toBe("google-vertex");
    });
    (0, vitest_1.it)("detects Anthropic official from anthropic-ratelimit-* headers", () => {
        const r = (0, channel_signature_js_1.classifyChannelSignature)({
            headers: {
                "anthropic-ratelimit-requests-remaining": "4999",
                "anthropic-organization-id": "org_abc",
                "request-id": "req_01ABC",
            },
            messageId: "msg_01DEF",
            rawBody: "",
        });
        (0, vitest_1.expect)(r.channel).toBe("anthropic-official");
        (0, vitest_1.expect)(r.confidence).toBeGreaterThanOrEqual(0.9);
    });
    (0, vitest_1.it)("returns unknown-proxy when no signals match", () => {
        const r = (0, channel_signature_js_1.classifyChannelSignature)({
            headers: { "content-type": "application/json", "server": "nginx" },
            messageId: "msg_01ABC",
            rawBody: '{"id":"msg_01ABC","type":"message"}',
        });
        (0, vitest_1.expect)(r.channel).toBe("unknown-proxy");
        (0, vitest_1.expect)(r.confidence).toBe(0);
    });
    (0, vitest_1.it)("prioritizes bedrock over anthropic-official when both match", () => {
        const r = (0, channel_signature_js_1.classifyChannelSignature)({
            headers: { "anthropic-ratelimit-requests-remaining": "99" },
            messageId: "msg_bdrk_01HIDDEN",
            rawBody: "",
        });
        (0, vitest_1.expect)(r.channel).toBe("aws-bedrock");
    });
    (0, vitest_1.it)("header matching is case-insensitive", () => {
        const r = (0, channel_signature_js_1.classifyChannelSignature)({
            headers: { "X-Amzn-RequestId": "abc" },
            messageId: "msg_bdrk_01",
            rawBody: "",
        });
        (0, vitest_1.expect)(r.channel).toBe("aws-bedrock");
    });
    (0, vitest_1.it)("detects bedrock from anthropic_version body field", () => {
        const r = (0, channel_signature_js_1.classifyChannelSignature)({
            headers: {},
            messageId: null,
            rawBody: '{"anthropic_version":"bedrock-2023-05-31","content":[]}',
        });
        (0, vitest_1.expect)(r.channel).toBe("aws-bedrock");
        (0, vitest_1.expect)(r.evidence).toContain("body:anthropic_version=bedrock-2023-05-31");
    });
    (0, vitest_1.it)("empty input yields unknown-proxy with confidence 0", () => {
        const r = (0, channel_signature_js_1.classifyChannelSignature)({ headers: {}, messageId: null, rawBody: "" });
        (0, vitest_1.expect)(r.channel).toBe("unknown-proxy");
        (0, vitest_1.expect)(r.confidence).toBe(0);
        (0, vitest_1.expect)(r.evidence).toEqual([]);
    });
    (0, vitest_1.it)("detects Google Vertex from msg_vrtx_ id prefix", () => {
        const r = (0, channel_signature_js_1.classifyChannelSignature)({
            headers: { "content-type": "application/json" },
            messageId: "msg_vrtx_01XYZ",
            rawBody: "",
        });
        (0, vitest_1.expect)(r.channel).toBe("google-vertex");
        (0, vitest_1.expect)(r.evidence).toContain("id_prefix:msg_vrtx_");
    });
    (0, vitest_1.it)("detects Google Vertex from vertex-2023-10-16 body field", () => {
        const r = (0, channel_signature_js_1.classifyChannelSignature)({
            headers: {},
            messageId: null,
            rawBody: '{"anthropic_version":"vertex-2023-10-16","content":[]}',
        });
        (0, vitest_1.expect)(r.channel).toBe("google-vertex");
        (0, vitest_1.expect)(r.evidence).toContain("body:anthropic_version=vertex-2023-10-16");
    });
    (0, vitest_1.it)("detects Anthropic official from anthropic-priority-* header", () => {
        const r = (0, channel_signature_js_1.classifyChannelSignature)({
            headers: { "anthropic-priority-tokens-limit": "100000" },
            messageId: "msg_01DEF",
            rawBody: "",
        });
        (0, vitest_1.expect)(r.channel).toBe("anthropic-official");
    });
});
//# sourceMappingURL=channel-signature.test.js.map