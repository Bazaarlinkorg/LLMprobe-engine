"use strict";
// src/linguistic-fingerprint.ts — Multi-run probe distribution and feature extraction
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeAnswer = normalizeAnswer;
exports.computeDistribution = computeDistribution;
exports.computeStability = computeStability;
exports.modeAnswer = modeAnswer;
exports.cosineSimilarity = cosineSimilarity;
exports.extractLinguisticFeatures = extractLinguisticFeatures;
const SKIP_ANSWERS = new Set(["ERR", "T/O", "TIMEOUT", "PARSE_ERR", "NET_ERR"]);
function normalizeAnswer(raw) {
    let s = raw;
    if (s.includes("</think>"))
        s = s.split("</think>").pop().trim();
    s = s.replace(/\*\*/g, "").replace(/^#+\s*/, "").trim();
    if (s.length > 60)
        s = s.slice(0, 60);
    return s;
}
function computeDistribution(answers) {
    const valid = answers.map(normalizeAnswer).filter(a => !SKIP_ANSWERS.has(a) && a.length > 0);
    if (valid.length === 0)
        return {};
    const counts = {};
    for (const a of valid)
        counts[a] = (counts[a] ?? 0) + 1;
    const total = valid.length;
    const dist = {};
    for (const [k, v] of Object.entries(counts))
        dist[k] = v / total;
    return dist;
}
function computeStability(dist) {
    const values = Object.values(dist);
    return values.length === 0 ? 0 : Math.max(...values);
}
function modeAnswer(dist) {
    let best = "";
    let bestScore = -1;
    for (const [k, v] of Object.entries(dist)) {
        if (v > bestScore) {
            bestScore = v;
            best = k;
        }
    }
    return best;
}
/**
 * Bhattacharyya coefficient between two probability distributions.
 * Equivalent to cosine similarity when both inputs are proper probability
 * distributions (values sum to 1.0). All callers should pass output from
 * computeDistribution(), which always satisfies this constraint.
 * @param a probability distribution (values must sum to 1.0)
 * @param b probability distribution (values must sum to 1.0)
 */
function cosineSimilarity(a, b) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    if (keys.size === 0)
        return 0;
    let hasA = false, hasB = false;
    for (const k of keys) {
        if ((a[k] ?? 0) !== 0)
            hasA = true;
        if ((b[k] ?? 0) !== 0)
            hasB = true;
    }
    if (!hasA || !hasB)
        return 0;
    // Bhattacharyya coefficient — geometrically equivalent to cosine on probability vectors
    let bc = 0;
    for (const k of keys)
        bc += Math.sqrt((a[k] ?? 0) * (b[k] ?? 0));
    return bc;
}
/**
 * Extract flattened numeric features from multi-run probe results.
 * @param results  Record<probeId, answers[]>
 * @returns        Record<signalKey, 0-1> — fits FingerprintFeatureSet.linguisticFingerprint
 */
function extractLinguisticFeatures(results, singleRunFallbacks = {}) {
    const f = {};
    const stabilities = [];
    const effective = (probeId) => {
        const arr = results[probeId];
        const fb = singleRunFallbacks[probeId];
        const hasReal = Array.isArray(arr)
            && arr.some(a => a !== "ERR" && typeof a === "string" && a.trim().length > 0);
        if (hasReal)
            return arr;
        if (fb && fb !== "ERR" && fb.trim().length > 0)
            return [fb];
        return arr;
    };
    // ── ling_kr_num: 사십이 (Sino-Korean) vs 마흔둘 (native Korean) ──────────
    const krAnswers = effective("ling_kr_num");
    if (krAnswers?.length) {
        const dist = computeDistribution(krAnswers);
        const stability = computeStability(dist);
        const mode = modeAnswer(dist).toLowerCase();
        // Only count stability when we got real answers (not all ERR/T/O)
        if (Object.keys(dist).length > 0)
            stabilities.push(stability);
        f["kr_num_sino"] = mode.includes("사십이") || mode.includes("사십") ? 1 : 0;
        f["kr_num_native"] = mode.includes("마흔") ? 1 : 0;
        f["kr_num_stability"] = stability;
    }
    // ── ling_jp_pm: 石破茂 (2024/10+) vs 岸田文雄 (2021-2024) vs old ─────────
    // jp_pm_ishiba: Oct 2024+ knowledge (Opus 4.6+)
    // jp_pm_kishida: 2021-Oct 2024 knowledge (Sonnet 4.6, older models)
    // jp_pm_old: pre-2021 knowledge (GLM and very old models)
    // jp_pm_recent: kept for backwards compat — ishiba OR kishida
    const jpAnswers = effective("ling_jp_pm");
    if (jpAnswers?.length) {
        const dist = computeDistribution(jpAnswers);
        const stability = computeStability(dist);
        const mode = modeAnswer(dist);
        if (Object.keys(dist).length > 0)
            stabilities.push(stability);
        const isIshiba = mode.includes("石破") || mode.toLowerCase().includes("ishiba");
        const isKishida = mode.includes("岸田") || mode.toLowerCase().includes("kishida");
        f["jp_pm_ishiba"] = isIshiba ? 1 : 0;
        f["jp_pm_kishida"] = isKishida ? 1 : 0;
        f["jp_pm_recent"] = (isIshiba || isKishida) ? 1 : 0; // backwards compat
        f["jp_pm_old"] = !isIshiba && !isKishida && mode.length > 0 ? 1 : 0;
        f["jp_pm_stability"] = stability;
    }
    // ── ling_fr_pm: Bayrou (2025/01+) vs Barnier (2024/09-12) vs old (<2024/09) ─
    // fr_pm_bayrou: Jan 2025+ knowledge (newest models)
    // fr_pm_barnier: Sept-Dec 2024 knowledge (2024-era cutoff — NOT a Zhipu signal)
    // fr_pm_old: pre-Sept 2024 knowledge (GLM and very old models)
    const frAnswers = effective("ling_fr_pm");
    if (frAnswers?.length) {
        const dist = computeDistribution(frAnswers);
        const stability = computeStability(dist);
        const mode = modeAnswer(dist).toLowerCase();
        if (Object.keys(dist).length > 0)
            stabilities.push(stability);
        const isBayrou = mode.includes("bayrou");
        const isBarnier = mode.includes("barnier");
        f["fr_pm_bayrou"] = isBayrou ? 1 : 0;
        f["fr_pm_barnier"] = isBarnier ? 1 : 0;
        f["fr_pm_old"] = !isBayrou && !isBarnier && mode.length > 0 ? 1 : 0;
        f["fr_pm_stability"] = stability;
    }
    // ── ling_ru_pres: Путин Владимир (surname first) vs Владимир Путин ────────
    const ruAnswers = effective("ling_ru_pres");
    if (ruAnswers?.length) {
        const dist = computeDistribution(ruAnswers);
        const stability = computeStability(dist);
        const mode = modeAnswer(dist);
        if (Object.keys(dist).length > 0)
            stabilities.push(stability);
        f["ru_pres_surname_first"] = mode.trimStart().toLowerCase().startsWith("пут") ? 1 : 0;
        f["ru_pres_stability"] = stability;
    }
    // ── tok_count_num: expected token count for "1234567890" ─────────────────
    const tokNumAnswers = effective("tok_count_num");
    if (tokNumAnswers?.length) {
        const dist = computeDistribution(tokNumAnswers);
        const stability = computeStability(dist);
        const mode = modeAnswer(dist).trim();
        if (Object.keys(dist).length > 0)
            stabilities.push(stability);
        const asNum = parseInt(mode, 10);
        f["tok_count_1"] = asNum === 1 ? 1 : 0;
        f["tok_count_2"] = asNum === 2 ? 1 : 0;
        f["tok_count_3"] = asNum === 3 ? 1 : 0;
        f["tok_count_4plus"] = asNum >= 4 ? 1 : 0;
        f["tok_num_stability"] = stability;
    }
    // ── tok_split_word: how model splits "tokenization" ──────────────────────
    const tokSplitAnswers = effective("tok_split_word");
    if (tokSplitAnswers?.length) {
        const dist = computeDistribution(tokSplitAnswers);
        const stability = computeStability(dist);
        const mode = modeAnswer(dist).toLowerCase().trim();
        if (Object.keys(dist).length > 0)
            stabilities.push(stability);
        const parts = mode.split("|").filter(Boolean);
        f["tok_split_2parts"] = parts.length === 2 ? 1 : 0;
        f["tok_split_3parts"] = parts.length === 3 ? 1 : 0;
        f["tok_split_4plus"] = parts.length >= 4 ? 1 : 0;
        f["tok_split_stability"] = stability;
    }
    // ── tok_self_knowledge: does the model know its tokenizer name? ───────────
    const tokSelfAnswers = effective("tok_self_knowledge");
    if (tokSelfAnswers?.length) {
        const dist = computeDistribution(tokSelfAnswers);
        const stability = computeStability(dist);
        const mode = modeAnswer(dist).toLowerCase().trim();
        if (Object.keys(dist).length > 0)
            stabilities.push(stability);
        f["tok_knows_bpe"] = mode.includes("bpe") ? 1 : 0;
        f["tok_knows_tiktoken"] = mode.includes("tiktoken") || mode.includes("cl100k") ? 1 : 0;
        f["tok_knows_none"] = (!mode.includes("bpe") && !mode.includes("tiktoken") &&
            !mode.includes("token") && mode.length > 0) ? 1 : 0;
        f["tok_self_stability"] = stability;
    }
    // ── code_reverse_list: Python list reversal style ─────────────────────────
    const codeRevAnswers = effective("code_reverse_list");
    if (codeRevAnswers?.length) {
        const dist = computeDistribution(codeRevAnswers);
        const stability = computeStability(dist);
        const mode = modeAnswer(dist);
        if (Object.keys(dist).length > 0)
            stabilities.push(stability);
        f["code_uses_slice"] = mode.includes("[::-1]") ? 1 : 0;
        f["code_uses_reversed"] = mode.includes("reversed(") ? 1 : 0;
        f["code_uses_loop"] = /for\s+\w+\s+in\s+range/.test(mode) ? 1 : 0;
        f["code_has_type_hints"] = mode.includes("->") || /:\s*(list|List|int|str)/.test(mode) ? 1 : 0;
        f["code_has_docstring"] = mode.includes('"""') || mode.includes("'''") ? 1 : 0;
        f["code_rev_stability"] = stability;
    }
    // ── code_comment_lang: comment language preference ────────────────────────
    const codeCommentAnswers = effective("code_comment_lang");
    if (codeCommentAnswers?.length) {
        const dist = computeDistribution(codeCommentAnswers);
        const stability = computeStability(dist);
        const mode = modeAnswer(dist);
        if (Object.keys(dist).length > 0)
            stabilities.push(stability);
        // Check for Chinese characters in the mode (after normalization)
        const hasChinese = /[\u4e00-\u9fff]/.test(mode);
        // Check if there are English-style comments (# prefix before normalization removal)
        const hasCommentMarker = mode.length > 0;
        f["code_comment_zh"] = hasChinese ? 1 : 0;
        f["code_comment_en"] = !hasChinese && hasCommentMarker && !/[\u4e00-\u9fff]/.test(mode) ? 1 : 0;
        f["code_comment_stability"] = stability;
    }
    // ── code_error_style: error handling preference ───────────────────────────
    const codeErrAnswers = effective("code_error_style");
    if (codeErrAnswers?.length) {
        const dist = computeDistribution(codeErrAnswers);
        const stability = computeStability(dist);
        const mode = modeAnswer(dist);
        if (Object.keys(dist).length > 0)
            stabilities.push(stability);
        f["code_raises_error"] = mode.includes("raise") || mode.includes("ValueError") ? 1 : 0;
        f["code_returns_none"] = /return\s+None/.test(mode) ? 1 : 0;
        f["code_uses_assert"] = mode.includes("assert") ? 1 : 0;
        f["code_err_stability"] = stability;
    }
    // ── meta_context_len: self-reported context window ───────────────────────────
    // Claude Opus/Sonnet 4.6: 200000; GPT-4/4.5: 128000; older GLM: 4096-128000
    const metaCtxAnswers = effective("meta_context_len");
    if (metaCtxAnswers?.length) {
        const dist = computeDistribution(metaCtxAnswers);
        const stability = computeStability(dist);
        const mode = modeAnswer(dist).replace(/[,_\s]/g, "").trim();
        if (Object.keys(dist).length > 0)
            stabilities.push(stability);
        const asNum = parseInt(mode, 10);
        f["meta_ctx_200k"] = asNum >= 180000 ? 1 : 0; // Claude (200k)
        f["meta_ctx_128k"] = asNum >= 100000 && asNum < 180000 ? 1 : 0; // GPT-4/4.5
        f["meta_ctx_small"] = asNum > 0 && asNum < 100000 ? 1 : 0; // older GLM
        f["meta_ctx_stability"] = stability;
    }
    // ── meta_thinking_mode: extended thinking awareness ──────────────────────────
    const metaThinkAnswers = effective("meta_thinking_mode");
    if (metaThinkAnswers?.length) {
        const dist = computeDistribution(metaThinkAnswers);
        const stability = computeStability(dist);
        const mode = modeAnswer(dist).toLowerCase().trim();
        if (Object.keys(dist).length > 0)
            stabilities.push(stability);
        f["meta_thinking_yes"] = mode === "yes" || mode.startsWith("yes") ? 1 : 0;
        f["meta_thinking_no"] = mode === "no" || mode.startsWith("no") ? 1 : 0;
        f["meta_think_stability"] = stability;
    }
    // ── meta_creator: company name ───────────────────────────────────────────
    const metaCreatorAnswers = effective("meta_creator");
    if (metaCreatorAnswers?.length) {
        const dist = computeDistribution(metaCreatorAnswers);
        const stability = computeStability(dist);
        const mode = modeAnswer(dist).toLowerCase().trim();
        if (Object.keys(dist).length > 0)
            stabilities.push(stability);
        f["meta_creator_anthropic"] = mode.includes("anthropic") ? 1 : 0;
        f["meta_creator_openai"] = mode.includes("openai") ? 1 : 0;
        f["meta_creator_zhipu"] = mode.includes("zhipu") || mode.includes("智谱") ? 1 : 0;
        f["meta_creator_stability"] = stability;
    }
    // ── ling_uk_pm: Keir Starmer (July 2024+) vs Rishi Sunak (pre-July 2024) ──
    const ukPmAnswers = effective("ling_uk_pm");
    if (ukPmAnswers?.length) {
        const dist = computeDistribution(ukPmAnswers);
        const stability = computeStability(dist);
        const mode = modeAnswer(dist).toLowerCase().trim();
        if (Object.keys(dist).length > 0)
            stabilities.push(stability);
        f["uk_pm_starmer"] = mode.includes("starmer") || mode.includes("keir") ? 1 : 0;
        f["uk_pm_sunak"] = mode.includes("sunak") || mode.includes("rishi") ? 1 : 0;
        f["uk_pm_stability"] = stability;
    }
    // ── ling_kr_crisis: knows Yoon Suk-yeol impeachment (Dec 2024) ────────────
    const krCrisisAnswers = effective("ling_kr_crisis");
    if (krCrisisAnswers?.length) {
        const dist = computeDistribution(krCrisisAnswers);
        const stability = computeStability(dist);
        const mode = modeAnswer(dist).toLowerCase().trim();
        if (Object.keys(dist).length > 0)
            stabilities.push(stability);
        const knowsEvent = mode.includes("impeach") || mode.includes("martial") ||
            mode.includes("탄핵") || mode.includes("계엄") ||
            mode.includes("removed") || mode.includes("suspended");
        f["kr_knows_crisis"] = knowsEvent ? 1 : 0;
        f["kr_crisis_stability"] = stability;
    }
    // ── ling_de_chan: Friedrich Merz (Feb 2025+) vs Olaf Scholz (pre-Feb 2025) ─
    const deChanAnswers = effective("ling_de_chan");
    if (deChanAnswers?.length) {
        const dist = computeDistribution(deChanAnswers);
        const stability = computeStability(dist);
        const mode = modeAnswer(dist).toLowerCase().trim();
        if (Object.keys(dist).length > 0)
            stabilities.push(stability);
        f["de_chan_merz"] = mode.includes("merz") || mode.includes("friedrich") ? 1 : 0;
        f["de_chan_scholz"] = mode.includes("scholz") || mode.includes("olaf") ? 1 : 0;
        f["de_chan_stability"] = stability;
    }
    // ── comp_py_float: Python floating point — 0.1+0.2 output ────────────────
    const pyFloatAnswers = effective("comp_py_float");
    if (pyFloatAnswers?.length) {
        const dist = computeDistribution(pyFloatAnswers);
        const stability = computeStability(dist);
        const mode = modeAnswer(dist).trim();
        if (Object.keys(dist).length > 0)
            stabilities.push(stability);
        f["comp_float_exact"] = mode.includes("0.30000000000000004") ? 1 : 0;
        f["comp_float_approx"] = mode === "0.3" || mode === "0.30" ? 1 : 0;
        f["comp_float_stability"] = stability;
    }
    // ── comp_large_exp: 2^32 format preference ───────────────────────────────
    const largeExpAnswers = effective("comp_large_exp");
    if (largeExpAnswers?.length) {
        const dist = computeDistribution(largeExpAnswers);
        const stability = computeStability(dist);
        const mode = modeAnswer(dist).trim();
        if (Object.keys(dist).length > 0)
            stabilities.push(stability);
        const normalized = mode.replace(/[,_\s]/g, "");
        f["comp_exp_correct"] = normalized === "4294967296" ? 1 : 0;
        f["comp_exp_commas"] = mode.includes(",") ? 1 : 0;
        f["comp_exp_stability"] = stability;
    }
    // ── Overall stability ─────────────────────────────────────────────────────
    if (stabilities.length > 0) {
        const avg = stabilities.reduce((s, v) => s + v, 0) / stabilities.length;
        f["overall_stability"] = parseFloat(avg.toFixed(3));
        f["overall_instability"] = parseFloat((1 - avg).toFixed(3));
    }
    return f;
}
//# sourceMappingURL=linguistic-fingerprint.js.map