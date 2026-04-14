"use strict";
// src/probe-judge-config.ts — Pure helpers for judge configuration resolution
// Part of @bazaarlink/probe-engine (MIT)
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseJudgeThreshold = parseJudgeThreshold;
exports.resolveJudgeConfig = resolveJudgeConfig;
function parseJudgeThreshold(raw) {
    const n = Number(raw);
    if (!raw || isNaN(n) || n < 1 || n > 10)
        return 7;
    return n;
}
/**
 * Resolve the judge configuration with cascade fallback.
 * If no explicit judge credentials are supplied, falls back to the
 * candidate endpoint's credentials (useful for self-judging in dev).
 */
function resolveJudgeConfig(judgeBaseUrl, judgeApiKey, judgeModelId, judgeThreshold, candidateBaseUrl, candidateApiKey, candidateModelId) {
    return {
        baseUrl: judgeBaseUrl || candidateBaseUrl,
        apiKey: judgeApiKey || candidateApiKey,
        modelId: judgeModelId || candidateModelId,
        threshold: judgeThreshold,
    };
}
//# sourceMappingURL=probe-judge-config.js.map