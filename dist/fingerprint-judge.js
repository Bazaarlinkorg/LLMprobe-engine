"use strict";
// src/fingerprint-judge.ts — LLM judge signal for model family identification (MIT)
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseJudgeIdentityResult = parseJudgeIdentityResult;
exports.buildJudgeIdentityPrompt = buildJudgeIdentityPrompt;
exports.judgeFingerprint = judgeFingerprint;
const KNOWN_FAMILIES = ["anthropic", "openai", "google", "qwen", "meta", "mistral", "deepseek"];
/** Parse LLM judge response. Returns null on failure. */
function parseJudgeIdentityResult(text) {
    const candidates = [];
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch)
        candidates.push(fenceMatch[1].trim());
    const braceMatch = text.match(/\{[\s\S]*?"family"[\s\S]*?\}/);
    if (braceMatch)
        candidates.push(braceMatch[0]);
    candidates.push(text.trim());
    for (const raw of candidates) {
        try {
            const obj = JSON.parse(raw);
            const family = typeof obj.family === "string" ? obj.family.toLowerCase() : null;
            if (!family || !KNOWN_FAMILIES.includes(family))
                continue;
            const confidence = Math.min(1, Math.max(0, Number(obj.confidence) || 0));
            const reasons = Array.isArray(obj.reasons) ? obj.reasons.map(String).slice(0, 5) : [];
            return { family, confidence, reasons };
        }
        catch { /* try next */ }
    }
    return null;
}
/** Build the judge prompt from probe responses. */
function buildJudgeIdentityPrompt(responses) {
    const sections = Object.entries(responses)
        .map(([id, text]) => `[${id}]\n${text.slice(0, 600)}`)
        .join("\n\n---\n\n");
    return `You are a model fingerprinting expert. Analyze the following AI assistant probe responses and identify which model family produced them.

Known families: anthropic, openai, google, qwen, meta, mistral, deepseek

Look for: self-identification claims, refusal phrasing, writing style, formatting preferences (bold headers, numbered lists, emoji), JSON discipline, and reasoning patterns.

PROBE RESPONSES:
${sections}

Reply with ONLY a JSON object:
{"family": "<family>", "confidence": <0.0-1.0>, "reasons": ["<evidence 1>", "<evidence 2>", "<evidence 3>"]}`;
}
/**
 * Call LLM judge to identify model family from probe responses.
 * Returns FamilyScore[] with the judge's top pick scored and all others at 0.
 * Returns empty array if judge is unavailable or fails.
 */
async function judgeFingerprint(responses, judgeBaseUrl, judgeApiKey, judgeModelId) {
    if (!judgeBaseUrl || !judgeApiKey || !judgeModelId || Object.keys(responses).length === 0) {
        return { scores: [], result: null };
    }
    const prompt = buildJudgeIdentityPrompt(responses);
    let chatUrl;
    try {
        chatUrl = judgeBaseUrl.replace(/\/+$/, "") + "/chat/completions";
        new URL(chatUrl); // validate
    }
    catch {
        return { scores: [], result: null };
    }
    try {
        const res = await fetch(chatUrl, {
            method: "POST",
            headers: { Authorization: `Bearer ${judgeApiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: judgeModelId,
                messages: [
                    { role: "system", content: "You are a strict JSON-only model fingerprinting expert. Respond with exactly one JSON object and nothing else." },
                    { role: "user", content: prompt },
                ],
                stream: false,
                max_tokens: 256,
                temperature: 0,
            }),
            signal: AbortSignal.timeout(60000),
        });
        if (!res.ok)
            return { scores: [], result: null };
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content ?? "";
        const parsed = parseJudgeIdentityResult(text);
        if (!parsed)
            return { scores: [], result: null };
        const scores = KNOWN_FAMILIES.map(f => ({
            family: f,
            score: f === parsed.family ? parsed.confidence : 0,
        }));
        return { scores, result: parsed };
    }
    catch {
        return { scores: [], result: null };
    }
}
//# sourceMappingURL=fingerprint-judge.js.map