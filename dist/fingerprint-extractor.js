"use strict";
// src/fingerprint-extractor.ts — Rule-based behavioral feature extractor (MIT)
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractFingerprint = extractFingerprint;
/** Extract behavioral fingerprint features from probe response map. */
function extractFingerprint(responses) {
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
        vague: selfText.length > 0 && !has(selfText, [
            "claude", "anthropic", "chatgpt", "gpt", "openai", "qwen", "通义",
            "gemini", "llama", "mistral", "deepseek",
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
        gives_answer_first: /\$0\.05|five cents/.test(reasonText) && reasonText.indexOf("$0.05") < 50 ? 1 : 0,
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
        claude_style: has(refusalText, ["i'm not able to assist", "i'm unable to assist", "i can't assist with"]) ? 1 : 0,
        gpt_style: has(refusalText, ["i'm sorry, but i cannot", "i apologize, but", "i'm sorry, i can't"]) ? 1 : 0,
        generic_cannot: has(refusalText, ["i cannot", "i can't", "i won't"]) ? 1 : 0,
        chinese_refusal: has(refusalText, ["无法", "不能提供", "不应该", "不合适"]) ? 1 : 0,
        no_refusal: refusalText.length > 20 &&
            !has(refusalText, ["cannot", "can't", "won't", "unable", "无法", "不能"]) ? 1 : 0,
    };
    // ── List format signals ───────────────────────────────────────────────────
    const listText = r("identity_list_format");
    const listFormat = {
        bold_headers: listText.includes("**") ? 1 : 0,
        plain_numbered: /^\d+\.\s/m.test(listText) && !listText.includes("**") ? 1 : 0,
        has_explanations: listText.split("\n").length > 10 ? 1 : 0,
        emoji_bullets: /[🔸🔹✅❌💡🌟]/u.test(listText) ? 1 : 0,
    };
    return { selfClaim, lexical, reasoning, jsonDiscipline, refusal, listFormat };
}
function has(text, keywords) {
    return keywords.some(kw => text.includes(kw));
}
function startsWithAny(text, prefixes) {
    const t = text.trimStart();
    return prefixes.some(p => t.startsWith(p));
}
//# sourceMappingURL=fingerprint-extractor.js.map