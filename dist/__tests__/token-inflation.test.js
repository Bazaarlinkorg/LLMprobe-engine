"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const token_inflation_js_1 = require("../token-inflation.js");
(0, vitest_1.describe)("TOKEN_INFLATION_THRESHOLD", () => {
    (0, vitest_1.it)("is a positive number", () => {
        (0, vitest_1.expect)(typeof token_inflation_js_1.TOKEN_INFLATION_THRESHOLD).toBe("number");
        (0, vitest_1.expect)(token_inflation_js_1.TOKEN_INFLATION_THRESHOLD).toBeGreaterThan(0);
    });
});
(0, vitest_1.describe)("detectTokenInflation", () => {
    (0, vitest_1.it)("does not detect inflation when promptTokens <= threshold", () => {
        const r = (0, token_inflation_js_1.detectTokenInflation)(token_inflation_js_1.TOKEN_INFLATION_THRESHOLD);
        (0, vitest_1.expect)(r.detected).toBe(false);
        (0, vitest_1.expect)(r.inflationAmount).toBe(0);
    });
    (0, vitest_1.it)("does not detect inflation for 1 token (bare minimum prompt)", () => {
        const r = (0, token_inflation_js_1.detectTokenInflation)(1);
        (0, vitest_1.expect)(r.detected).toBe(false);
        (0, vitest_1.expect)(r.inflationAmount).toBe(0);
    });
    (0, vitest_1.it)("does not detect inflation for promptTokens just at threshold", () => {
        const r = (0, token_inflation_js_1.detectTokenInflation)(token_inflation_js_1.TOKEN_INFLATION_THRESHOLD);
        (0, vitest_1.expect)(r.detected).toBe(false);
    });
    (0, vitest_1.it)("detects inflation when promptTokens > threshold", () => {
        const r = (0, token_inflation_js_1.detectTokenInflation)(token_inflation_js_1.TOKEN_INFLATION_THRESHOLD + 1);
        (0, vitest_1.expect)(r.detected).toBe(true);
        (0, vitest_1.expect)(r.inflationAmount).toBe(token_inflation_js_1.TOKEN_INFLATION_THRESHOLD + 1);
    });
    (0, vitest_1.it)("detects inflation for clearly inflated value (e.g. 500 tokens for 'Hi')", () => {
        const r = (0, token_inflation_js_1.detectTokenInflation)(500);
        (0, vitest_1.expect)(r.detected).toBe(true);
        (0, vitest_1.expect)(r.actualPromptTokens).toBe(500);
        (0, vitest_1.expect)(r.inflationAmount).toBe(500);
    });
    (0, vitest_1.it)("reports actualPromptTokens correctly regardless of detection", () => {
        (0, vitest_1.expect)((0, token_inflation_js_1.detectTokenInflation)(5).actualPromptTokens).toBe(5);
        (0, vitest_1.expect)((0, token_inflation_js_1.detectTokenInflation)(500).actualPromptTokens).toBe(500);
    });
    (0, vitest_1.it)("inflationAmount is 0 when not detected", () => {
        (0, vitest_1.expect)((0, token_inflation_js_1.detectTokenInflation)(10).inflationAmount).toBe(0);
    });
    (0, vitest_1.it)("accepts a custom threshold override", () => {
        const r = (0, token_inflation_js_1.detectTokenInflation)(100, 200); // 100 tokens, threshold 200 → no inflation
        (0, vitest_1.expect)(r.detected).toBe(false);
        const r2 = (0, token_inflation_js_1.detectTokenInflation)(201, 200);
        (0, vitest_1.expect)(r2.detected).toBe(true);
    });
    (0, vitest_1.it)("custom threshold of 0 detects inflation for any non-zero value", () => {
        (0, vitest_1.expect)((0, token_inflation_js_1.detectTokenInflation)(1, 0).detected).toBe(true);
    });
});
//# sourceMappingURL=token-inflation.test.js.map