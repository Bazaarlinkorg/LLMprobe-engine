"use strict";
// src/token-inflation.ts — Hidden system prompt detection (MIT)
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOKEN_INFLATION_THRESHOLD = void 0;
exports.detectTokenInflation = detectTokenInflation;
exports.TOKEN_INFLATION_THRESHOLD = 50;
function detectTokenInflation(promptTokens, threshold = exports.TOKEN_INFLATION_THRESHOLD) {
    const detected = promptTokens > threshold;
    return {
        detected,
        actualPromptTokens: promptTokens,
        inflationAmount: detected ? promptTokens : 0,
    };
}
//# sourceMappingURL=token-inflation.js.map