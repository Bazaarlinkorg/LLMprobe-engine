export declare function parseJudgeThreshold(raw: string | undefined): number;
export interface JudgeConfig {
    baseUrl: string;
    apiKey: string;
    modelId: string;
    threshold: number;
}
/**
 * Resolve the judge configuration with cascade fallback.
 * If no explicit judge credentials are supplied, falls back to the
 * candidate endpoint's credentials (useful for self-judging in dev).
 */
export declare function resolveJudgeConfig(judgeBaseUrl: string, judgeApiKey: string, judgeModelId: string, judgeThreshold: number, candidateBaseUrl: string, candidateApiKey: string, candidateModelId: string): JudgeConfig;
//# sourceMappingURL=probe-judge-config.d.ts.map