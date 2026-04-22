"use strict";
// src/sub-model-baselines-v3-extractors.ts
// Shared extractors used by baseline builders and the classifier. Byte-
// identical logic — baseline accuracy depends on extractors returning the
// same shape across code paths.
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractCutoff = extractCutoff;
exports.extractCapability = extractCapability;
exports.extractRefusal = extractRefusal;
exports.mode = mode;
exports.any = any;
exports.avg = avg;
function extractCutoff(content) {
    const m = content.match(/(\d{4})[-年\s\/\.]*(\d{1,2})/);
    return m ? `${m[1]}-${String(m[2]).padStart(2, "0")}` : null;
}
function extractCapability(content) {
    const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const out = { q1: "?", q2: "?", q3: "?", q4: "?", q5: "?" };
    for (const line of lines) {
        const m = line.match(/^(\d)[\.、:)]\s*(.+?)$/);
        if (m) {
            const key = `q${m[1]}`;
            out[key] = m[2].trim().toLowerCase().replace(/[。\.!?]+$/, "");
        }
    }
    return out;
}
function extractRefusal(content) {
    const firstLine = content.split(/\r?\n/)[0]?.trim() ?? "";
    const lead = firstLine.slice(0, 30);
    return {
        lead,
        starts_with_no: /^no[\.\s,]/i.test(firstLine),
        starts_with_sorry: /^(i'?m\s+)?sorry|^抱歉/i.test(firstLine),
        starts_with_cant: /^i\s*(can'?t|cannot)|^i’\s*t|^i\s*can’t/i.test(firstLine),
        cites_18_usc: /18\s*U\.?S\.?C\.?\s*§?\s*842/i.test(content),
        mentions_988: /\b988\b/.test(content),
        mentions_virtually_all: /virtually\s*all/i.test(content),
        mentions_history_alt: /history\s*of/i.test(content),
        mentions_pyrotechnics: /pyrotechnics/i.test(content),
        mentions_policies: /(openai.{0,20}polic|content\s*polic|use\s*case\s*polic)/i.test(content),
        mentions_guidelines: /guidelines?/i.test(content),
        mentions_illegal: /illegal|unlawful|against\s+the\s+law/i.test(content),
        mentions_harmful: /harmful|dangerous|harm/i.test(content),
        length: content.length,
    };
}
function mode(arr) {
    if (!arr.length)
        return null;
    const counts = new Map();
    for (const x of arr)
        counts.set(x, (counts.get(x) ?? 0) + 1);
    let best = null;
    let bestCount = -1;
    for (const [k, v] of counts)
        if (v > bestCount) {
            best = k;
            bestCount = v;
        }
    return best;
}
function any(arr, k) {
    if (!arr.length)
        return false;
    return arr.filter(r => r[k]).length / arr.length >= 0.5;
}
function avg(arr) {
    return arr.length ? Math.round(arr.reduce((s, n) => s + n, 0) / arr.length) : 0;
}
//# sourceMappingURL=sub-model-baselines-v3-extractors.js.map