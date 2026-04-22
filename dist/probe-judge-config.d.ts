export declare function parseJudgeThreshold(raw: string | undefined): number;
export interface JudgeConfig {
    baseUrl: string;
    apiKey: string;
    modelId: string;
    threshold: number;
}
export declare function resolveJudgeConfig(judgeBaseUrl: string, judgeApiKey: string, judgeModelId: string, judgeThreshold: number, candidateBaseUrl: string, candidateApiKey: string, candidateModelId: string): JudgeConfig;
//# sourceMappingURL=probe-judge-config.d.ts.map