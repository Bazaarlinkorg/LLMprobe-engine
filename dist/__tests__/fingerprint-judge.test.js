"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const fingerprint_judge_js_1 = require("../fingerprint-judge.js");
(0, vitest_1.describe)("parseJudgeIdentityResult", () => {
    (0, vitest_1.it)("parses valid JSON with family and confidence", () => {
        const raw = JSON.stringify({ family: "anthropic", confidence: 0.9, reasons: ["claude_style refusal"] });
        const result = (0, fingerprint_judge_js_1.parseJudgeIdentityResult)(raw);
        (0, vitest_1.expect)(result).toEqual({ family: "anthropic", confidence: 0.9, reasons: ["claude_style refusal"] });
    });
    (0, vitest_1.it)("clamps confidence to 0-1", () => {
        const raw = JSON.stringify({ family: "openai", confidence: 1.5, reasons: [] });
        const result = (0, fingerprint_judge_js_1.parseJudgeIdentityResult)(raw);
        (0, vitest_1.expect)(result?.confidence).toBe(1.0);
    });
    (0, vitest_1.it)("returns null for missing family", () => {
        const raw = JSON.stringify({ confidence: 0.8 });
        (0, vitest_1.expect)((0, fingerprint_judge_js_1.parseJudgeIdentityResult)(raw)).toBeNull();
    });
    (0, vitest_1.it)("returns null for unknown family", () => {
        const raw = JSON.stringify({ family: "banana", confidence: 0.8, reasons: [] });
        (0, vitest_1.expect)((0, fingerprint_judge_js_1.parseJudgeIdentityResult)(raw)).toBeNull();
    });
    (0, vitest_1.it)("returns null for unparseable text", () => {
        (0, vitest_1.expect)((0, fingerprint_judge_js_1.parseJudgeIdentityResult)("not json")).toBeNull();
    });
    (0, vitest_1.it)("extracts JSON from markdown fence", () => {
        const raw = "```json\n" + JSON.stringify({ family: "google", confidence: 0.7, reasons: ["gemini"] }) + "\n```";
        const result = (0, fingerprint_judge_js_1.parseJudgeIdentityResult)(raw);
        (0, vitest_1.expect)(result?.family).toBe("google");
    });
});
//# sourceMappingURL=fingerprint-judge.test.js.map