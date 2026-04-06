"use strict";
// src/fingerprint-baseline.ts — Rule-based model family signal weights (MIT)
Object.defineProperty(exports, "__esModule", { value: true });
exports.FAMILY_BASELINES = void 0;
exports.claimedModelToFamily = claimedModelToFamily;
/**
 * Signal weight table per model family.
 * Positive weight: signal supports this family.
 * Negative weight: signal contradicts this family.
 */
exports.FAMILY_BASELINES = [
    {
        family: "anthropic",
        displayName: "Anthropic / Claude",
        signals: [
            ["selfClaim", "claude", 3.0],
            ["refusal", "claude_style", 2.0],
            ["lexical", "opener_direct", 1.0],
            ["lexical", "uses_bold_headers", 0.5],
            ["jsonDiscipline", "pure_json", 1.0],
            ["jsonDiscipline", "markdown_polluted", -1.5],
            ["lexical", "opener_certainly", -0.5],
            ["reasoning", "starts_with_letme", -0.5],
        ],
    },
    {
        family: "openai",
        displayName: "OpenAI / GPT",
        signals: [
            ["selfClaim", "openai", 3.0],
            ["lexical", "opener_certainly", 2.0],
            ["lexical", "opener_great", 1.5],
            ["refusal", "gpt_style", 2.0],
            ["reasoning", "starts_with_letme", 1.0],
            ["jsonDiscipline", "pure_json", 0.5],
            ["jsonDiscipline", "markdown_polluted", -0.5],
            ["selfClaim", "claude", -3.0],
        ],
    },
    {
        family: "qwen",
        displayName: "Alibaba / Qwen",
        signals: [
            ["selfClaim", "qwen", 3.0],
            ["refusal", "chinese_refusal", 2.0],
            ["lexical", "verbose_zh", 1.0],
            ["jsonDiscipline", "preamble_text", 1.0],
            ["jsonDiscipline", "markdown_polluted", 0.5],
            ["selfClaim", "claude", -3.0],
            ["selfClaim", "openai", -3.0],
        ],
    },
    {
        family: "google",
        displayName: "Google / Gemini",
        signals: [
            ["selfClaim", "gemini", 3.0],
            ["lexical", "uses_numbered_list", 1.0],
            ["reasoning", "uses_therefore", 0.5],
            ["selfClaim", "claude", -3.0],
            ["selfClaim", "openai", -3.0],
        ],
    },
    {
        family: "meta",
        displayName: "Meta / Llama",
        signals: [
            ["selfClaim", "llama", 3.0],
            ["jsonDiscipline", "markdown_polluted", 1.0],
            ["refusal", "no_refusal", 1.5],
            ["selfClaim", "claude", -3.0],
            ["selfClaim", "openai", -3.0],
        ],
    },
    {
        family: "mistral",
        displayName: "Mistral AI",
        signals: [
            ["selfClaim", "mistral", 3.0],
            ["lexical", "concise_en", 1.0],
            ["selfClaim", "claude", -3.0],
            ["selfClaim", "openai", -3.0],
        ],
    },
    {
        family: "deepseek",
        displayName: "DeepSeek",
        signals: [
            ["selfClaim", "deepseek", 3.0],
            ["reasoning", "uses_chain_of_thought", 1.0],
            ["selfClaim", "claude", -3.0],
            ["selfClaim", "openai", -3.0],
        ],
    },
];
/** Map a claimedModel string to its expected family identifier. Returns undefined if unknown. */
function claimedModelToFamily(claimedModel) {
    const m = claimedModel.toLowerCase();
    if (m.includes("claude") || m.includes("anthropic"))
        return "anthropic";
    if (m.includes("gpt") || m.includes("chatgpt") || m.includes("openai") ||
        m.startsWith("o1") || m.startsWith("o3") || m.startsWith("o4"))
        return "openai";
    if (m.includes("qwen") || m.includes("tongyi"))
        return "qwen";
    if (m.includes("gemini") || m.includes("bard") || m.includes("google"))
        return "google";
    if (m.includes("llama") || m.includes("meta"))
        return "meta";
    if (m.includes("mistral") || m.includes("mixtral"))
        return "mistral";
    if (m.includes("deepseek"))
        return "deepseek";
    return undefined;
}
//# sourceMappingURL=fingerprint-baseline.js.map