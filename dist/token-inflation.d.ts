export declare const TOKEN_INFLATION_THRESHOLD = 50;
export interface TokenInflationResult {
    detected: boolean;
    actualPromptTokens: number;
    inflationAmount: number;
}
export declare function detectTokenInflation(promptTokens: number, threshold?: number): TokenInflationResult;
//# sourceMappingURL=token-inflation.d.ts.map