"use strict";
// src/canary-bench.ts — Deterministic canary prompts for proxy quality probing
// Part of @bazaarlink/probe-engine (MIT)
//
// All prompts instruct the model to output ONLY the answer, no preamble.
// Scoring is pure string/regex — no LLM judge required.
Object.defineProperty(exports, "__esModule", { value: true });
exports.CANARY_BENCH = void 0;
exports.scoreCanaryAnswer = scoreCanaryAnswer;
exports.CANARY_BENCH = [
    { id: "math-mul", category: "math",
        prompt: "Compute 347 * 89. Output only the integer, no words.",
        expectedExact: "30883" },
    { id: "math-pow", category: "math",
        prompt: "What is 2 to the power of 16? Output only the integer, no words.",
        expectedExact: "65536" },
    { id: "math-mod", category: "math",
        prompt: "What is 1000 mod 7? Output only the integer, no words.",
        expectedExact: "6" },
    { id: "logic-syllogism", category: "logic",
        prompt: "If all cats are mammals and Whiskers is a cat, is Whiskers a mammal? Answer only yes or no.",
        expectedRegex: "^yes$" },
    { id: "recall-capital", category: "recall",
        prompt: "What is the capital of Australia? Output only the single city name.",
        expectedExact: "Canberra" },
    { id: "recall-symbol", category: "recall",
        prompt: "What is the chemical symbol for gold? Output only the symbol.",
        expectedExact: "Au" },
    { id: "format-echo", category: "format",
        prompt: "Reply with exactly this token and nothing else: BANANA",
        expectedExact: "BANANA" },
    { id: "format-json", category: "format",
        prompt: 'Output this JSON object with no extra text and no code fences: {"ok":true}',
        expectedRegex: '^\\{\\s*"ok"\\s*:\\s*true\\s*\\}$' },
    { id: "code-reverse", category: "code",
        prompt: "Write a Python expression that reverses string s. Output only the expression, no code fences, no explanation.",
        expectedRegex: "s\\[::-1\\]" },
    { id: "recall-year", category: "recall",
        prompt: "In what year did humans first land on the moon? Output only the four-digit year.",
        expectedExact: "1969" },
];
function scoreCanaryAnswer(item, actual) {
    const expected = item.expectedExact ?? item.expectedRegex ?? "";
    if (actual == null)
        return { id: item.id, passed: false, actual, expected };
    const cleaned = actual.trim().replace(/[.。]$/, "");
    if (!cleaned)
        return { id: item.id, passed: false, actual, expected };
    if (item.expectedExact != null) {
        const passed = cleaned.toLowerCase() === item.expectedExact.toLowerCase();
        return { id: item.id, passed, actual, expected };
    }
    if (item.expectedRegex != null) {
        const passed = new RegExp(item.expectedRegex, "i").test(cleaned);
        return { id: item.id, passed, actual, expected };
    }
    return { id: item.id, passed: false, actual, expected };
}
//# sourceMappingURL=canary-bench.js.map