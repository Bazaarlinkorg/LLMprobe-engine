"use strict";
// src/fingerprint-features-v2.ts
// Extended lexical/structural feature extractors for adversarial fingerprinting.
// Each extractor is a pure (text: string) => number function.
// Return value: 0|1 for booleans, or a normalized numeric in [0,1] for counts.
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractSmartQuotes = extractSmartQuotes;
exports.extractEmDash = extractEmDash;
exports.extractEllipsisStyle = extractEllipsisStyle;
exports.extractCodeFenceLang = extractCodeFenceLang;
exports.extractTableStyle = extractTableStyle;
exports.extractBoldStyle = extractBoldStyle;
exports.extractNumberedListDot = extractNumberedListDot;
exports.extractCjkPunct = extractCjkPunct;
exports.extractOpeningHedge = extractOpeningHedge;
exports.extractClosingOffer = extractClosingOffer;
exports.extractAvgSentenceLen = extractAvgSentenceLen;
exports.extractParagraphCount = extractParagraphCount;
exports.extractHasCodeBlock = extractHasCodeBlock;
exports.extractEmojiUsage = extractEmojiUsage;
exports.extractLatexStyle = extractLatexStyle;
exports.extractTextStructureFeatures = extractTextStructureFeatures;
exports.aggregateTextStructure = aggregateTextStructure;
exports.extractTimingFeatures = extractTimingFeatures;
exports.aggregateTimingFeatures = aggregateTimingFeatures;
function extractSmartQuotes(text) {
    return /[\u201C\u201D\u2018\u2019]/.test(text) ? 1 : 0;
}
function extractEmDash(text) {
    return /\u2014/.test(text) ? 1 : 0;
}
function extractEllipsisStyle(text) {
    return /\u2026/.test(text) ? 1 : 0;
}
function extractCodeFenceLang(text) {
    const m = text.match(/```([a-zA-Z0-9_+-]+)/);
    return m ? m[1].toLowerCase() : null;
}
function extractTableStyle(text) {
    // Require a header row with 2+ cells followed by a separator row that has pipes around the dashes.
    return /\|[^\n]*\|[^\n]*\n\s*\|[\s:-]*-{3,}[\s:|-]*\|/.test(text) ? 1 : 0;
}
function extractBoldStyle(text) {
    return /\*\*[^\n*]+\*\*/.test(text) ? 1 : 0;
}
function extractNumberedListDot(text) {
    return /^\s*\d+\.\s+/m.test(text) ? 1 : 0;
}
function extractCjkPunct(text) {
    return /[\uFF0C\u3002\uFF1A\uFF1B\uFF01\uFF1F]/.test(text) ? 1 : 0;
}
function extractOpeningHedge(text) {
    const first = text.trimStart().slice(0, 40).toLowerCase();
    return /^(i think|let me|sure|certainly|of course|absolutely|great question)/.test(first) ? 1 : 0;
}
function extractClosingOffer(text) {
    const tail = text.trimEnd().slice(-200).toLowerCase();
    return /(let me know|would you like|feel free to|happy to help|if you.{0,10}(need|want))/.test(tail) ? 1 : 0;
}
function extractAvgSentenceLen(text) {
    const sents = text.split(/[.!?]\s+/).filter(s => s.trim().length > 0);
    if (sents.length === 0)
        return 0;
    const avg = sents.reduce((acc, s) => acc + s.length, 0) / sents.length;
    return Math.min(1, avg / 100);
}
function extractParagraphCount(text) {
    const count = text.split(/\n\s*\n/).length;
    return Math.min(1, count / 5);
}
function extractHasCodeBlock(text) {
    const pairs = (text.match(/```/g) ?? []).length / 2;
    return pairs >= 1 ? 1 : 0;
}
function extractEmojiUsage(text) {
    // Pictographic emoji only; exclude \u2600-\u27BF (dingbats/misc symbols) and
    // similar ranges that commonly appear in plain text.
    return /[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/u.test(text) ? 1 : 0;
}
function extractLatexStyle(text) {
    return /(\\[\(\)]|\$\$[^$]+\$\$|\\begin\{)/.test(text) ? 1 : 0;
}
/** Run all extractors against a single response, return Record<string, number> */
function extractTextStructureFeatures(text) {
    return {
        smart_quotes: extractSmartQuotes(text),
        em_dash: extractEmDash(text),
        ellipsis_style: extractEllipsisStyle(text),
        table_style: extractTableStyle(text),
        bold_style: extractBoldStyle(text),
        numbered_dot: extractNumberedListDot(text),
        cjk_punct: extractCjkPunct(text),
        opening_hedge: extractOpeningHedge(text),
        closing_offer: extractClosingOffer(text),
        avg_sent_len: extractAvgSentenceLen(text),
        paragraph_count: extractParagraphCount(text),
        code_block: extractHasCodeBlock(text),
        emoji_usage: extractEmojiUsage(text),
        latex_style: extractLatexStyle(text),
    };
}
const CONTINUOUS_KEYS = new Set(["avg_sent_len", "paragraph_count"]);
/** Aggregate features across many responses — OR for booleans, mean for continuous */
function aggregateTextStructure(featureList) {
    if (featureList.length === 0)
        return {};
    const keys = Object.keys(featureList[0]);
    const agg = {};
    for (const k of keys) {
        const vals = featureList.map(f => f[k] ?? 0);
        if (CONTINUOUS_KEYS.has(k)) {
            agg[k] = vals.reduce((a, b) => a + b, 0) / vals.length;
        }
        else {
            agg[k] = vals.some(v => v === 1) ? 1 : 0;
        }
    }
    return agg;
}
function median(values) {
    if (values.length === 0)
        return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}
function variance(values) {
    if (values.length < 2)
        return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
}
/**
 * Derive timing/length features from a list of probe items. All outputs are
 * 0/1 bucket flags or values normalized to [0,1]. Non-spoofable — reflects
 * upstream provider infrastructure characteristics.
 */
function extractTimingFeatures(items) {
    const tpsList = items.map(i => i?.tps).filter((x) => typeof x === "number" && x > 0);
    const ttftList = items.map(i => i?.ttftMs).filter((x) => typeof x === "number" && x >= 0);
    const outLenList = items.map(i => i?.outputTokens).filter((x) => typeof x === "number" && x >= 0);
    const tpsMed = median(tpsList);
    const ttftMed = median(ttftList);
    const outMed = median(outLenList);
    const tpsVar = variance(tpsList);
    return {
        tps_bucket_slow: tpsMed > 0 && tpsMed < 20 ? 1 : 0,
        tps_bucket_medium: tpsMed >= 20 && tpsMed < 60 ? 1 : 0,
        tps_bucket_fast: tpsMed >= 60 ? 1 : 0,
        ttft_bucket_snappy: ttftMed > 0 && ttftMed < 500 ? 1 : 0,
        ttft_bucket_normal: ttftMed >= 500 && ttftMed < 1500 ? 1 : 0,
        ttft_bucket_slow: ttftMed >= 1500 ? 1 : 0,
        out_len_terse: outMed > 0 && outMed < 50 ? 1 : 0,
        out_len_normal: outMed >= 50 && outMed < 200 ? 1 : 0,
        out_len_verbose: outMed >= 200 ? 1 : 0,
        tps_median: tpsMed, // raw for debugging
        tps_median_norm: Math.min(1, tpsMed / 100),
        ttft_median_norm: Math.min(1, ttftMed / 3000),
        out_median_norm: Math.min(1, outMed / 500),
        tps_unstable: tpsList.length >= 3 && tpsVar > 400 ? 1 : 0,
    };
}
/** Convenience wrapper that drops the raw tps_median (non-normalized) from the
 *  output — use this when handing features to the scorer. */
function aggregateTimingFeatures(items) {
    const raw = extractTimingFeatures(items);
    const { tps_median, ...scoring } = raw;
    return scoring;
}
//# sourceMappingURL=fingerprint-features-v2.js.map