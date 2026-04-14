import { describe, it, expect } from "vitest";
import { classifyChannelSignature } from "../channel-signature.js";

describe("classifyChannelSignature", () => {
  it("detects AWS Bedrock from x-amzn-bedrock-* header", () => {
    const r = classifyChannelSignature({
      headers: { "x-amzn-bedrock-invocation-latency": "1234", "x-amzn-requestid": "abc" },
      messageId: "msg_bdrk_01ABC",
      rawBody: '{"id":"msg_bdrk_01ABC","type":"message"}',
    });
    expect(r.channel).toBe("aws-bedrock");
    expect(r.confidence).toBeGreaterThanOrEqual(0.9);
    expect(r.evidence).toContain("header:x-amzn-bedrock-invocation-latency");
    expect(r.evidence).toContain("id_prefix:msg_bdrk_");
  });

  it("detects AWS Bedrock from id prefix alone", () => {
    const r = classifyChannelSignature({
      headers: { "content-type": "application/json" },
      messageId: "msg_bdrk_01XYZ",
      rawBody: "",
    });
    expect(r.channel).toBe("aws-bedrock");
    expect(r.evidence).toContain("id_prefix:msg_bdrk_");
  });

  it("detects Google Vertex from x-goog-* header", () => {
    const r = classifyChannelSignature({
      headers: { "x-goog-api-client": "gl-python/3.11", "server": "Google Frontend" },
      messageId: "msg_01ABC",
      rawBody: "",
    });
    expect(r.channel).toBe("google-vertex");
    expect(r.evidence).toContain("header:x-goog-api-client");
    expect(r.evidence).toContain("header:server=Google Frontend");
  });

  it("detects Google Vertex from 'via: 1.1 google' header", () => {
    const r = classifyChannelSignature({
      headers: { "via": "1.1 google" },
      messageId: "msg_01ABC",
      rawBody: "",
    });
    expect(r.channel).toBe("google-vertex");
  });

  it("detects Anthropic official from anthropic-ratelimit-* headers", () => {
    const r = classifyChannelSignature({
      headers: {
        "anthropic-ratelimit-requests-remaining": "4999",
        "anthropic-organization-id": "org_abc",
        "request-id": "req_01ABC",
      },
      messageId: "msg_01DEF",
      rawBody: "",
    });
    expect(r.channel).toBe("anthropic-official");
    expect(r.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it("returns unknown-proxy when no signals match", () => {
    const r = classifyChannelSignature({
      headers: { "content-type": "application/json", "server": "nginx" },
      messageId: "msg_01ABC",
      rawBody: '{"id":"msg_01ABC","type":"message"}',
    });
    expect(r.channel).toBe("unknown-proxy");
    expect(r.confidence).toBe(0);
  });

  it("prioritizes bedrock over anthropic-official when both match", () => {
    const r = classifyChannelSignature({
      headers: { "anthropic-ratelimit-requests-remaining": "99" },
      messageId: "msg_bdrk_01HIDDEN",
      rawBody: "",
    });
    expect(r.channel).toBe("aws-bedrock");
  });

  it("header matching is case-insensitive", () => {
    const r = classifyChannelSignature({
      headers: { "X-Amzn-RequestId": "abc" },
      messageId: "msg_bdrk_01",
      rawBody: "",
    });
    expect(r.channel).toBe("aws-bedrock");
  });

  it("detects bedrock from anthropic_version body field", () => {
    const r = classifyChannelSignature({
      headers: {},
      messageId: null,
      rawBody: '{"anthropic_version":"bedrock-2023-05-31","content":[]}',
    });
    expect(r.channel).toBe("aws-bedrock");
    expect(r.evidence).toContain("body:anthropic_version=bedrock-2023-05-31");
  });

  it("empty input yields unknown-proxy with confidence 0", () => {
    const r = classifyChannelSignature({ headers: {}, messageId: null, rawBody: "" });
    expect(r.channel).toBe("unknown-proxy");
    expect(r.confidence).toBe(0);
    expect(r.evidence).toEqual([]);
  });

  it("detects Google Vertex from msg_vrtx_ id prefix", () => {
    const r = classifyChannelSignature({
      headers: { "content-type": "application/json" },
      messageId: "msg_vrtx_01XYZ",
      rawBody: "",
    });
    expect(r.channel).toBe("google-vertex");
    expect(r.evidence).toContain("id_prefix:msg_vrtx_");
  });

  it("detects Google Vertex from vertex-2023-10-16 body field", () => {
    const r = classifyChannelSignature({
      headers: {},
      messageId: null,
      rawBody: '{"anthropic_version":"vertex-2023-10-16","content":[]}',
    });
    expect(r.channel).toBe("google-vertex");
    expect(r.evidence).toContain("body:anthropic_version=vertex-2023-10-16");
  });

  it("detects Anthropic official from anthropic-priority-* header", () => {
    const r = classifyChannelSignature({
      headers: { "anthropic-priority-tokens-limit": "100000" },
      messageId: "msg_01DEF",
      rawBody: "",
    });
    expect(r.channel).toBe("anthropic-official");
  });
});
