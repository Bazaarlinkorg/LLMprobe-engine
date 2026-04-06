"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const fingerprint_extractor_js_1 = require("../fingerprint-extractor.js");
(0, vitest_1.describe)("extractFingerprint", () => {
    (0, vitest_1.it)("detects Claude self-claim from identity_self_knowledge response", () => {
        const responses = {
            identity_self_knowledge: "I am Claude, an AI assistant made by Anthropic. I'm Claude 3.5 Sonnet.",
        };
        const features = (0, fingerprint_extractor_js_1.extractFingerprint)(responses);
        (0, vitest_1.expect)(features.selfClaim["claude"]).toBe(1);
        (0, vitest_1.expect)(features.selfClaim["openai"]).toBe(0);
    });
    (0, vitest_1.it)("detects GPT/OpenAI self-claim", () => {
        const responses = {
            identity_self_knowledge: "I'm ChatGPT, made by OpenAI. I'm based on GPT-4.",
        };
        const features = (0, fingerprint_extractor_js_1.extractFingerprint)(responses);
        (0, vitest_1.expect)(features.selfClaim["openai"]).toBe(1);
        (0, vitest_1.expect)(features.selfClaim["claude"]).toBe(0);
    });
    (0, vitest_1.it)("detects Qwen self-claim", () => {
        const responses = {
            identity_self_knowledge: "我是通义千问，阿里巴巴开发的AI助手。",
        };
        const features = (0, fingerprint_extractor_js_1.extractFingerprint)(responses);
        (0, vitest_1.expect)(features.selfClaim["qwen"]).toBe(1);
    });
    (0, vitest_1.it)("detects JSON pollution from identity_json_discipline response", () => {
        const responses = {
            identity_json_discipline: '```json\n{"name": "Alice", "age": 30, "city": "Paris"}\n```',
        };
        const features = (0, fingerprint_extractor_js_1.extractFingerprint)(responses);
        (0, vitest_1.expect)(features.jsonDiscipline["markdown_polluted"]).toBe(1);
        (0, vitest_1.expect)(features.jsonDiscipline["pure_json"]).toBe(0);
    });
    (0, vitest_1.it)("detects clean JSON discipline", () => {
        const responses = {
            identity_json_discipline: '{"name": "Alice", "age": 30, "city": "Paris"}',
        };
        const features = (0, fingerprint_extractor_js_1.extractFingerprint)(responses);
        (0, vitest_1.expect)(features.jsonDiscipline["pure_json"]).toBe(1);
        (0, vitest_1.expect)(features.jsonDiscipline["markdown_polluted"]).toBe(0);
    });
    (0, vitest_1.it)("detects 'certainly' opener in lexical style", () => {
        const responses = {
            identity_style_en: "Certainly! The most important skill for a software engineer in 2025 is...",
        };
        const features = (0, fingerprint_extractor_js_1.extractFingerprint)(responses);
        (0, vitest_1.expect)(features.lexical["opener_certainly"]).toBe(1);
    });
    (0, vitest_1.it)("returns zero-signal features for empty input", () => {
        const features = (0, fingerprint_extractor_js_1.extractFingerprint)({});
        (0, vitest_1.expect)(Object.values(features.selfClaim).every(v => v === 0)).toBe(true);
    });
});
//# sourceMappingURL=fingerprint-extractor.test.js.map