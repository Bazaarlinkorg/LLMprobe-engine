export type ChannelLabel = "anthropic-official" | "aws-bedrock" | "google-vertex" | "unknown-proxy";
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
//# sourceMappingURL=channel-signature.d.ts.map