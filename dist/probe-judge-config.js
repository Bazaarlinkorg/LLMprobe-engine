"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseJudgeThreshold = parseJudgeThreshold;
exports.resolveJudgeConfig = resolveJudgeConfig;
// src/probe-judge-config.ts — Pure helpers for judge configuration resolution
function parseJudgeThreshold(raw) {
    const n = Number(raw);
    if (!raw || isNaN(n) || n < 1 || n > 10)
        return 7;
    return n;
}
function resolveJudgeConfig(judgeBaseUrl, judgeApiKey, judgeModelId, judgeThreshold, candidateBaseUrl, candidateApiKey, candidateModelId) {
    return {
        baseUrl: judgeBaseUrl || candidateBaseUrl,
        apiKey: judgeApiKey || candidateApiKey,
        modelId: judgeModelId || candidateModelId,
        threshold: judgeThreshold,
    };
}
//# sourceMappingURL=probe-judge-config.js.map