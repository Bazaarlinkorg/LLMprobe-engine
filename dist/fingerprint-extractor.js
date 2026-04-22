"use strict";
// src/fingerprint-extractor.ts — Rule-based behavioral feature extractor
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractFingerprint = extractFingerprint;
const linguistic_fingerprint_js_1 = require("./linguistic-fingerprint.js");
const performance_fingerprint_js_1 = require("./performance-fingerprint.js");
const fingerprint_features_v2_js_1 = require("./fingerprint-features-v2.js");
/** Extract behavioral fingerprint features from probe response map. */
function extractFingerprint(responses, linguisticResults = {}, items = [], // ← new optional param (default empty array)
singleRunFallbacks = {}) {
    const r = (id) => (responses[id] ?? "").toLowerCase();
    // ── Self-claim signals ────────────────────────────────────────────────────
    const selfText = r("identity_self_knowledge");
    const selfClaim = {
        claude: has(selfText, ["claude", "anthropic"]) ? 1 : 0,
        openai: has(selfText, ["chatgpt", "gpt-4", "gpt-3", "openai"]) ? 1 : 0,
        qwen: has(selfText, ["qwen", "通义千问", "阿里", "alibaba"]) ? 1 : 0,
        gemini: has(selfText, ["gemini", "google deepmind", "bard"]) ? 1 : 0,
        llama: has(selfText, ["llama", "meta ai", "meta llama"]) ? 1 : 0,
        mistral: has(selfText, ["mistral"]) ? 1 : 0,
        deepseek: has(selfText, ["deepseek"]) ? 1 : 0,
        // Amazon Q Developer / Kiro: coding-agent wrapper injecting ~2000-token hidden system prompt
        kiro: has(selfText, ["kiro", "amazon q developer", "kiro-cli"]) ? 1 : 0,
        vague: selfText.length > 0 && !has(selfText, [
            "claude", "anthropic", "chatgpt", "gpt", "openai", "qwen", "通义",
            "gemini", "llama", "mistral", "deepseek", "kiro", "amazon q",
        ]) ? 1 : 0,
    };
    // ── Lexical style signals ─────────────────────────────────────────────────
    const styleEn = r("identity_style_en");
    const styleZh = r("identity_style_zh_tw");
    const combinedStyle = styleEn + " " + styleZh;
    const lexical = {
        opener_certainly: startsWithAny(styleEn, ["certainly", "of course", "sure!", "absolutely"]) ? 1 : 0,
        opener_great: startsWithAny(styleEn, ["great question", "that's a great", "excellent question"]) ? 1 : 0,
        opener_direct: startsWithAny(styleEn, ["the most", "in my view", "i think", "i believe"]) ? 1 : 0,
        uses_bold_headers: combinedStyle.includes("**") ? 1 : 0,
        uses_numbered_list: /\n\d+\.\s/.test(combinedStyle) ? 1 : 0,
        uses_dash_bullets: /\n-\s/.test(combinedStyle) ? 1 : 0,
        verbose_zh: styleZh.length > 600 ? 1 : 0,
        concise_en: styleEn.length > 0 && styleEn.length < 400 ? 1 : 0,
    };
    // ── Reasoning format signals ──────────────────────────────────────────────
    const reasonText = r("identity_reasoning_shape");
    const reasoning = {
        starts_with_letme: startsWithAny(reasonText, ["let me", "let's", "let us"]) ? 1 : 0,
        starts_with_first: startsWithAny(reasonText, ["first,", "first:", "step 1", "to solve"]) ? 1 : 0,
        uses_chain_of_thought: reasonText.includes("step by step") || reasonText.includes("thinking through") ? 1 : 0,
        uses_therefore: reasonText.includes("therefore") || reasonText.includes("thus,") ? 1 : 0,
    };
    // ── JSON discipline signals ───────────────────────────────────────────────
    const jsonText = responses["identity_json_discipline"] ?? "";
    const jsonTrimmed = jsonText.trim();
    const markdown_polluted = jsonText.includes("```") ||
        /^(certainly|sure|of course|here is|here's)/i.test(jsonTrimmed) ? 1 : 0;
    const pure_json = !markdown_polluted && jsonTrimmed.startsWith("{") && jsonTrimmed.endsWith("}") ? 1 : 0;
    const jsonDiscipline = {
        pure_json,
        markdown_polluted,
        preamble_text: /^(certainly|sure|of course|here is|here's)/i.test(jsonTrimmed) ? 1 : 0,
    };
    // ── Refusal pattern signals ───────────────────────────────────────────────
    const refusalText = r("identity_refusal_pattern");
    const refusal = {
        claude_style: has(refusalText, [
            "i'm not able to assist", "i'm unable to assist", "i can't assist with",
            "isn't something i'll help", "not something i'll help",
            "i'm not going to help", "i don't help with", "i won't help with",
            "this would cause real harm", "i can't provide", "i'm not able to provide",
        ]) ? 1 : 0,
        gpt_style: has(refusalText, ["i'm sorry, but i cannot", "i apologize, but", "i'm sorry, i can't"]) ? 1 : 0,
        generic_cannot: has(refusalText, ["i cannot", "i can't", "i won't", "i'm not going to", "i don't provide"]) ? 1 : 0,
        chinese_refusal: has(refusalText, ["无法", "不能提供", "不应该", "不合适"]) ? 1 : 0,
        no_refusal: refusalText.length > 20 &&
            !has(refusalText, [
                "cannot", "can't", "won't", "unable", "无法", "不能",
                "isn't something i'll", "not something i'll",
                "i'm not going to", "i don't help", "i won't help",
                "i don't provide", "cause real harm", "i'm not able",
                "i will not", "i refuse",
            ]) ? 1 : 0,
    };
    // ── List format signals ───────────────────────────────────────────────────
    const listText = r("identity_list_format");
    const listFormat = {
        bold_headers: listText.includes("**") ? 1 : 0,
        plain_numbered: /^\d+\.\s/m.test(listText) && !listText.includes("**") ? 1 : 0,
        has_explanations: listText.split("\n").length > 10 ? 1 : 0,
        emoji_bullets: /[🔸🔹✅❌💡🌟]/u.test(listText) ? 1 : 0,
    };
    // ── Sub-model continuous signals (for intra-family differentiation) ──────
    const allText = Object.values(responses).join(" ");
    const enWords = styleEn.split(/\s+/).filter(Boolean);
    const uniqueWords = new Set(enWords.map(w => w.toLowerCase()));
    const perfFeatures = (0, performance_fingerprint_js_1.extractPerformanceFeatures)(items);
    const subModelSignals = {
        total_response_length: Math.min(1, allText.length / 15000),
        en_response_length: Math.min(1, styleEn.length / 3000),
        zh_response_length: Math.min(1, styleZh.length / 3000),
        vocab_richness: enWords.length > 10 ? uniqueWords.size / enWords.length : 0,
        reasoning_length: Math.min(1, reasonText.length / 3000),
        list_detail_level: (() => {
            const listItems = listText.split(/\n/).filter(l => /^\s*[\d\-\*]/.test(l));
            if (listItems.length === 0)
                return 0;
            const avgLen = listItems.reduce((s, l) => s + l.length, 0) / listItems.length;
            return Math.min(1, avgLen / 200);
        })(),
        en_paragraph_count: Math.min(1, styleEn.split(/\n\n+/).filter(Boolean).length / 8),
        uses_markdown_headings: /^#{1,3}\s/m.test(combinedStyle) ? 1 : 0,
        // Performance signals from actual probe run timing
        ...perfFeatures,
    };
    const linguisticFingerprint = (0, linguistic_fingerprint_js_1.extractLinguisticFeatures)(linguisticResults, singleRunFallbacks);
    // ── Text structure (v2 lexical mining) ────────────────────────────────────
    const allTexts = [];
    for (const v of Object.values(responses)) {
        if (typeof v === "string" && v.length > 0)
            allTexts.push(v);
    }
    for (const arr of Object.values(linguisticResults)) {
        for (const v of arr ?? []) {
            if (typeof v === "string" && v.length > 0)
                allTexts.push(v);
        }
    }
    const textStructure = allTexts.length > 0
        ? (0, fingerprint_features_v2_js_1.aggregateTextStructure)(allTexts.map(fingerprint_features_v2_js_1.extractTextStructureFeatures))
        : {};
    // Merge timing features into the existing subModelSignals category.
    // Keys from aggregateTimingFeatures (tps_bucket_*, ttft_bucket_*, out_len_*,
    // *_median_norm, tps_unstable) do not conflict with existing performance keys.
    const timingFeatures = (0, fingerprint_features_v2_js_1.aggregateTimingFeatures)(items);
    Object.assign(subModelSignals, timingFeatures);
    return { selfClaim, lexical, reasoning, jsonDiscipline, refusal, listFormat, subModelSignals, linguisticFingerprint, textStructure };
}
function has(text, keywords) {
    return keywords.some(kw => text.includes(kw));
}
function startsWithAny(text, prefixes) {
    const t = text.trimStart();
    return prefixes.some(p => t.startsWith(p));
}
//# sourceMappingURL=fingerprint-extractor.js.map