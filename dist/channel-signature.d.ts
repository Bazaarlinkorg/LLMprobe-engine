export type ChannelLabel = "anthropic-official" | "anthropic-relay" | "aws-bedrock" | "aws-apigateway" | "google-vertex" | "openrouter" | "azure-foundry" | "cloudflare-ai-gateway" | "litellm" | "helicone" | "portkey" | "kong-gateway" | "alibaba-dashscope" | "new-api" | "one-api" | "unknown-proxy";
export interface ChannelSignatureInput {
    headers: Record<string, string>;
    messageId: string | null;
    rawBody: string;
}
export interface ChannelSignature {
    channel: ChannelLabel;
    confidence: number;
    evidence: string[];
}
export declare function classifyChannelSignature(input: ChannelSignatureInput): ChannelSignature;
/**
 * Human-readable list of all signals checked by the classifier.
 * Kept in sync with the logic above.
 */
export declare const CHANNEL_DETECTION_RULES: string[];
//# sourceMappingURL=channel-signature.d.ts.map