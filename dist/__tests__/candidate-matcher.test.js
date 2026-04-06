"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const candidate_matcher_js_1 = require("../candidate-matcher.js");
const claudeFeatures = {
    selfClaim: { claude: 1, openai: 0, qwen: 0, gemini: 0, llama: 0, mistral: 0, deepseek: 0, vague: 0 },
    lexical: { opener_certainly: 0, opener_great: 0, opener_direct: 1, uses_bold_headers: 1, uses_numbered_list: 0, uses_dash_bullets: 1, verbose_zh: 0, concise_en: 0 },
    reasoning: { starts_with_letme: 0, starts_with_first: 0, gives_answer_first: 0, uses_chain_of_thought: 0, uses_therefore: 0 },
    jsonDiscipline: { pure_json: 1, markdown_polluted: 0, preamble_text: 0 },
    refusal: { claude_style: 1, gpt_style: 0, generic_cannot: 1, chinese_refusal: 0, no_refusal: 0 },
    listFormat: { bold_headers: 1, plain_numbered: 0, has_explanations: 1, emoji_bullets: 0 },
};
const gptFeatures = {
    selfClaim: { claude: 0, openai: 1, qwen: 0, gemini: 0, llama: 0, mistral: 0, deepseek: 0, vague: 0 },
    lexical: { opener_certainly: 1, opener_great: 1, opener_direct: 0, uses_bold_headers: 1, uses_numbered_list: 1, uses_dash_bullets: 0, verbose_zh: 0, concise_en: 0 },
    reasoning: { starts_with_letme: 1, starts_with_first: 0, gives_answer_first: 0, uses_chain_of_thought: 0, uses_therefore: 0 },
    jsonDiscipline: { pure_json: 1, markdown_polluted: 0, preamble_text: 0 },
    refusal: { claude_style: 0, gpt_style: 1, generic_cannot: 0, chinese_refusal: 0, no_refusal: 0 },
    listFormat: { bold_headers: 1, plain_numbered: 0, has_explanations: 1, emoji_bullets: 0 },
};
(0, vitest_1.describe)("matchCandidates", () => {
    (0, vitest_1.it)("ranks anthropic first for Claude-like features", () => {
        const candidates = (0, candidate_matcher_js_1.matchCandidates)(claudeFeatures);
        (0, vitest_1.expect)(candidates[0].family).toBe("anthropic");
        (0, vitest_1.expect)(candidates[0].score).toBeGreaterThan(0.5);
    });
    (0, vitest_1.it)("ranks openai first for GPT-like features", () => {
        const candidates = (0, candidate_matcher_js_1.matchCandidates)(gptFeatures);
        (0, vitest_1.expect)(candidates[0].family).toBe("openai");
        (0, vitest_1.expect)(candidates[0].score).toBeGreaterThan(0.5);
    });
    (0, vitest_1.it)("returns at most 3 candidates", () => {
        const candidates = (0, candidate_matcher_js_1.matchCandidates)(claudeFeatures);
        (0, vitest_1.expect)(candidates.length).toBeLessThanOrEqual(3);
    });
});
(0, vitest_1.describe)("deriveVerdict", () => {
    (0, vitest_1.it)("returns match when top candidate matches claimed family with high confidence", () => {
        const candidates = (0, candidate_matcher_js_1.matchCandidates)(claudeFeatures);
        const verdict = (0, candidate_matcher_js_1.deriveVerdict)(candidates, "anthropic");
        (0, vitest_1.expect)(verdict.status).toBe("match");
        (0, vitest_1.expect)(verdict.confidence).toBeGreaterThan(0.6);
    });
    (0, vitest_1.it)("returns mismatch when top candidate contradicts claimed family", () => {
        const candidates = (0, candidate_matcher_js_1.matchCandidates)(gptFeatures);
        const verdict = (0, candidate_matcher_js_1.deriveVerdict)(candidates, "anthropic");
        (0, vitest_1.expect)(verdict.status).toBe("mismatch");
    });
    (0, vitest_1.it)("returns uncertain when no claimed family provided", () => {
        const candidates = (0, candidate_matcher_js_1.matchCandidates)(claudeFeatures);
        const verdict = (0, candidate_matcher_js_1.deriveVerdict)(candidates, undefined);
        (0, vitest_1.expect)(verdict.status).toBe("uncertain");
    });
});
//# sourceMappingURL=candidate-matcher.test.js.map