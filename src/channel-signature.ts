// src/channel-signature.ts ??Pure upstream channel classifier (MIT)
// Inspects response headers + message ID + raw body to determine the real upstream.
// Zero network/DB dependencies.
//
// Architecture: Three-tier detection.
//   Tier 1 ??Deterministic: vendor-exclusive header prefix or id format ??immediate return at 1.0 confidence.
//   Tier 2 ??Scored: shared-infrastructure channels (Bedrock/Vertex/Anthropic-official/AWS-APIGateway).
//   Tier 3 ??Inferred: native Anthropic id with no other signal ??transparent relay proxy.

export type ChannelLabel =
  | "anthropic-official"
  | "anthropic-relay"
  | "aws-bedrock"
  | "aws-apigateway"
  | "google-vertex"
  | "openrouter"
  | "azure-foundry"
  | "cloudflare-ai-gateway"
  | "litellm"
  | "helicone"
  | "portkey"
  | "kong-gateway"
  | "alibaba-dashscope"
  | "new-api"
  | "one-api"
  | "unknown-proxy";

export interface ChannelSignatureInput {
  headers: Record<string, string>;
  messageId: string | null;
  rawBody: string;
}

export interface ChannelSignature {
  channel: ChannelLabel;
  confidence: number; // 0..1
  evidence: string[];
}

const WEIGHTS = {
  bedrockHeader: 1.0,
  bedrockIdPrefix: 1.0,
  bedrockBody: 0.9,
  vertexHeaderStrong: 1.0,
  vertexHeaderWeak: 0.5,   // server banner string is unverified
  vertexIdPrefix: 1.0,     // msg_vrtx_ is strongest Vertex signal
  vertexBody: 0.9,         // body contains vertex-2023-10-16
  anthropicHeader: 0.95,
  anthropicRequestId: 0.6,
  apiGatewayHeader: 0.8,
};

function lowerHeaders(h: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(h)) out[k.toLowerCase()] = v;
  return out;
}

export function classifyChannelSignature(input: ChannelSignatureInput): ChannelSignature {
  const headers = lowerHeaders(input.headers);
  const id = input.messageId ?? "";
  const body = input.rawBody ?? "";
  const evidence: string[] = [];

  // ?? Tier 1: Deterministic signals ????????????????????????????????????????
  if (id.startsWith("gen-")) {
    evidence.push("id_prefix:gen-");
    return { channel: "openrouter", confidence: 1.0, evidence };
  }
  if ((headers["x-generation-id"] ?? "").startsWith("gen-")) {
    evidence.push("header:x-generation-id");
    return { channel: "openrouter", confidence: 1.0, evidence };
  }
  for (const key of Object.keys(headers)) {
    if (key.startsWith("cf-aig-")) {
      evidence.push(`header:${key}`);
      return { channel: "cloudflare-ai-gateway", confidence: 1.0, evidence };
    }
  }
  if (headers["apim-request-id"]) {
    evidence.push("header:apim-request-id");
    return { channel: "azure-foundry", confidence: 1.0, evidence };
  }
  for (const key of Object.keys(headers)) {
    if (key.startsWith("x-litellm-")) {
      evidence.push(`header:${key}`);
      return { channel: "litellm", confidence: 1.0, evidence };
    }
  }
  for (const key of Object.keys(headers)) {
    if (key.startsWith("helicone-")) {
      evidence.push(`header:${key}`);
      return { channel: "helicone", confidence: 1.0, evidence };
    }
  }
  for (const key of Object.keys(headers)) {
    if (key.startsWith("x-portkey-")) {
      evidence.push(`header:${key}`);
      return { channel: "portkey", confidence: 1.0, evidence };
    }
  }
  for (const key of Object.keys(headers)) {
    if (key.startsWith("x-kong-")) {
      evidence.push(`header:${key}`);
      return { channel: "kong-gateway", confidence: 1.0, evidence };
    }
  }
  for (const key of Object.keys(headers)) {
    if (key.startsWith("x-dashscope-")) {
      evidence.push(`header:${key}`);
      return { channel: "alibaba-dashscope", confidence: 1.0, evidence };
    }
  }
  if (headers["x-new-api-version"]) {
    evidence.push(`header:x-new-api-version=${headers["x-new-api-version"]}`);
    return { channel: "new-api", confidence: 1.0, evidence };
  }
  if (headers["x-oneapi-request-id"]) {
    evidence.push(`header:x-oneapi-request-id`);
    return { channel: "one-api", confidence: 1.0, evidence };
  }

  // ?? Tier 2: Scored signals ????????????????????????????????????????????????
  const scores = {
    "aws-bedrock": 0,
    "aws-apigateway": 0,
    "google-vertex": 0,
    "anthropic-official": 0,
  };

  for (const key of Object.keys(headers)) {
    if (key.startsWith("x-amzn-bedrock-")) {
      scores["aws-bedrock"] += WEIGHTS.bedrockHeader;
      evidence.push(`header:${key}`);
      break;
    }
  }
  if (id.startsWith("msg_bdrk_")) {
    scores["aws-bedrock"] += WEIGHTS.bedrockIdPrefix;
    evidence.push("id_prefix:msg_bdrk_");
  }
  if (id.startsWith("msg_vrtx_")) {
    scores["google-vertex"] += WEIGHTS.vertexIdPrefix;
    evidence.push("id_prefix:msg_vrtx_");
  }
  if (body.includes("bedrock-2023-05-31")) {
    scores["aws-bedrock"] += WEIGHTS.bedrockBody;
    evidence.push("body:anthropic_version=bedrock-2023-05-31");
  }
  if (body.includes("vertex-2023-10-16")) {
    scores["google-vertex"] += WEIGHTS.vertexBody;
    evidence.push("body:anthropic_version=vertex-2023-10-16");
  }
  if (headers["x-amz-apigw-id"]) {
    scores["aws-apigateway"] += WEIGHTS.apiGatewayHeader;
    evidence.push("header:x-amz-apigw-id");
  } else if (headers["apigw-requestid"]) {
    scores["aws-apigateway"] += WEIGHTS.apiGatewayHeader;
    evidence.push("header:apigw-requestid");
  }
  for (const key of Object.keys(headers)) {
    if (key.startsWith("x-goog-")) {
      scores["google-vertex"] += WEIGHTS.vertexHeaderStrong;
      evidence.push(`header:${key}`);
      break;
    }
  }
  if (headers["server"]?.toLowerCase().includes("google")) {
    scores["google-vertex"] += WEIGHTS.vertexHeaderWeak;
    evidence.push(`header:server=${headers["server"]}`);
  }
  if (headers["via"]?.toLowerCase().includes("google")) {
    scores["google-vertex"] += WEIGHTS.vertexHeaderWeak;
    evidence.push(`header:via=${headers["via"]}`);
  }
  if (Object.keys(headers).some(k =>
    k.startsWith("anthropic-ratelimit-") ||
    k.startsWith("anthropic-priority-") ||
    k.startsWith("anthropic-fast-")
  )) {
    scores["anthropic-official"] += WEIGHTS.anthropicHeader;
    evidence.push("header:anthropic-ratelimit/priority/fast-*");
  }
  const reqId = headers["request-id"] ?? "";
  if (reqId.startsWith("req_")) {
    scores["anthropic-official"] += WEIGHTS.anthropicRequestId;
    evidence.push(`header:request-id=${reqId.slice(0, 10)}...`);
  }

  // ?? Tier 2 winner selection ???????????????????????????????????????????????
  const maxScore = Math.max(
    scores["aws-bedrock"],
    scores["aws-apigateway"],
    scores["google-vertex"],
    scores["anthropic-official"],
  );

  if (maxScore === 0) {
    // ?? Tier 3: Inferred ????????????????????????????????????????????????????
    const nativeIdRe = /^msg_01[A-Za-z0-9]{21,}$/;
    if (nativeIdRe.test(id)) {
      evidence.push("body:native-anthropic-id");
      return { channel: "anthropic-relay", confidence: 0.5, evidence };
    }
    return { channel: "unknown-proxy", confidence: 0, evidence };
  }

  const b = scores["aws-bedrock"];
  const v = scores["google-vertex"];
  const a = scores["anthropic-official"];
  const g = scores["aws-apigateway"];

  let winner: "aws-bedrock" | "aws-apigateway" | "google-vertex" | "anthropic-official";
  if (b > 0 && b >= v && b >= g) {
    winner = "aws-bedrock";
  } else if (v > 0 && v >= b && v >= g) {
    winner = "google-vertex";
  } else if (g > 0 && g >= a) {
    winner = "aws-apigateway";
  } else {
    winner = "anthropic-official";
  }

  const confidence = Math.min(1, scores[winner]);
  return { channel: winner, confidence: Math.round(confidence * 100) / 100, evidence };
}

/**
 * Human-readable list of all signals checked by the classifier.
 * Kept in sync with the logic above.
 */
export const CHANNEL_DETECTION_RULES: string[] = [
  "id prefix: gen-  OR  header: x-generation-id: gen-*  (OpenRouter)",
  "any header: cf-aig-*  (Cloudflare AI Gateway)",
  "header: apim-request-id  (Azure AI Foundry)",
  "any header: x-litellm-*  (LiteLLM)",
  "any header: helicone-*  (Helicone)",
  "any header: x-portkey-*  (Portkey)",
  "any header: x-kong-*  (Kong Gateway)",
  "any header: x-dashscope-*  (Alibaba DashScope)",
  "header: x-new-api-version  (New-API)",
  "header: x-oneapi-request-id  (One-API)",
  "header: x-amzn-bedrock-*  (AWS Bedrock)",
  "id prefix: msg_bdrk_  (AWS Bedrock)",
  "body: anthropic_version=bedrock-2023-05-31  (AWS Bedrock)",
  "id prefix: msg_vrtx_  (Google Vertex)",
  "body: anthropic_version=vertex-2023-10-16  (Google Vertex)",
  "header: x-goog-*  /  server: *google*  /  via: *google*  (Google Vertex)",
  "header: anthropic-ratelimit-*  /  anthropic-priority-*  /  anthropic-fast-*  (Anthropic official)",
  "header: request-id: req_*  (Anthropic official)",
  "header: x-amz-apigw-id  OR  apigw-requestid  (AWS API Gateway)",
  "id matches msg_01[A-Za-z0-9]{21,} + no other signal  (Anthropic Relay Proxy)",
];

