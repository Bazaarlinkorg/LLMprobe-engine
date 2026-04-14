export interface AnthropicThinkingBlock {
    type: "thinking";
    thinking: string;
    signature: string;
}
export declare function extractThinkingBlock(raw: unknown): AnthropicThinkingBlock | null;
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
export type RoundtripBody = ReturnType<typeof buildRoundtripBody>;
export declare function buildRoundtripBody(args: RoundtripBodyArgs): {
    model: string;
    max_tokens: number;
    thinking: {
        type: string;
        budget_tokens: number;
    };
    messages: Array<{
        role: string;
        content: string | Array<{
            type: string;
            thinking?: string;
            signature?: string;
            text?: string;
        }>;
    }>;
};
export declare function verifySignatureRoundtrip(args: VerifyArgs): Promise<VerifyResult>;
//# sourceMappingURL=signature-probe.d.ts.map