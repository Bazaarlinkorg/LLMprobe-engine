"use strict";
// lib/fingerprint-baseline.ts — Rule-based model family signal weights
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
            ["linguisticFingerprint", "meta_creator_xai", -3.0], // "created by xAI" is never anthropic (attack-resistant column)
            ["selfClaim", "grok", -4.0], // a Grok self-ID is never anthropic (xai family added 2026-07-10)
            ["selfClaim", "claude", 3.0],
            ["selfClaim", "kiro", 1.5], // Kiro runs on Claude; self-ID as Kiro suggests Anthropic base
            ["selfClaim", "deepseek", -4.0],
            ["selfClaim", "qwen", -4.0],
            ["selfClaim", "gemini", -4.0],
            ["selfClaim", "llama", -4.0],
            ["selfClaim", "openai", -4.0],
            ["refusal", "claude_style", 0.8], // REDUCED: 29% of openai sessions false-positive here
            ["refusal", "gpt_style", -2.0], // GPT-style refusal contradicts anthropic
            ["lexical", "opener_direct", 0.5],
            ["lexical", "uses_bold_headers", 0.1], // reduced: Google also uses bold headers
            ["lexical", "uses_dash_bullets", 3.0], // Claude strongly prefers dash bullets (21% vs 0% openai)
            ["lexical", "verbose_zh", 0.1], // reduced: Gemini also produces verbose Chinese output
            ["lexical", "opener_great", 0.5], // neutralize: Claude also uses "Great!" opener sometimes
            ["jsonDiscipline", "pure_json", 1.0],
            ["jsonDiscipline", "markdown_polluted", -0.8],
            ["lexical", "opener_certainly", -0.5],
            ["reasoning", "starts_with_letme", -0.5],
            ["linguisticFingerprint", "overall_stability", 2.5],
            ["linguisticFingerprint", "jp_pm_ishiba", 1.5], // Oct 2024+ cutoff — equal with openai (both GPT-5 and Claude know Ishiba)
            ["linguisticFingerprint", "jp_pm_recent", 0.5], // Claude also knows recent PMs
            ["linguisticFingerprint", "jp_pm_kishida", 0.3], // Recal 2026-04-17: fires 22% in anthropic data (Claude 4.6+ now answers Ishiba). Keep small positive — older Claude still does.
            ["linguisticFingerprint", "fr_pm_bayrou", 0], // Recal 2026-04-17b: fires 55% in anthropic too — Claude 4.6+ also knows Bayrou. Neutralize.
            ["linguisticFingerprint", "fr_pm_barnier", 0.5], // Sept-Dec 2024 (also valid Claude)
            ["linguisticFingerprint", "overall_instability", 0], // Recal 2026-04-17: was -1.2, causes false-neg on unstable Claude sessions
            ["linguisticFingerprint", "jp_pm_old", -1.5],
            ["linguisticFingerprint", "fr_pm_old", -1.0],
            // Calibrated 2026-04-15 via OpenRouter (opus-4-6, sonnet-4-6 vs gpt-4o, 3x each)
            // Direction E self-knowledge — reduced weight (system prompt can override self-reported identity)
            ["linguisticFingerprint", "meta_creator_anthropic", 0.5], // reduced: spoofable via system prompt
            ["linguisticFingerprint", "meta_creator_openai", -0.5], // reduced penalty
            ["linguisticFingerprint", "meta_ctx_200k", 0.5], // reduced: spoofable
            ["linguisticFingerprint", "meta_ctx_small", -0.3], // reduced penalty
            // Direction C: tokenizer self-knowledge (calibrated — BPE=Claude, tiktoken=OpenAI)
            ["linguisticFingerprint", "tok_knows_bpe", 1.5], // Claude uses BPE (not tiktoken)
            ["linguisticFingerprint", "tok_knows_tiktoken", -2.0], // tiktoken = OpenAI, not Claude
            // Direction G: temporal knowledge probes (calibrated 2026-04-15)
            // uk_pm_starmer: 100% anthropic (Starmer), 0% openai (Sunak) — perfect discriminator
            ["linguisticFingerprint", "uk_pm_starmer", 3.0],
            // kr_knows_crisis: 100% anthropic knows Dec 2024 events, 0% openai (Oct 2023 cutoff)
            ["linguisticFingerprint", "kr_knows_crisis", 2.0],
            // de_chan_merz: only Sonnet 4.6 knows Merz; Opus says Scholz — weak signal for anthropic family
            ["linguisticFingerprint", "de_chan_merz", 0.3],
            // kr_num_sino: Claude Opus=사십이 (Sino-Korean). A=0.66 O=0.00 — strong discriminator. Recal 2026-04-17
            ["linguisticFingerprint", "kr_num_sino", 4.0],
            // tok_count_3: Claude Sonnet answers 3 tokens for "1234567890". A=0.29 O=0.00. Recal 2026-04-17
            ["linguisticFingerprint", "tok_count_3", 2.5],
            // uk_pm_sunak: penalty — Claude 4.x knows Starmer, not Sunak
            ["linguisticFingerprint", "uk_pm_sunak", -2.0],
            // subModelSignals — response verbosity (Opus > Sonnet > others)
            ["subModelSignals", "total_response_length", 0.3],
            ["subModelSignals", "vocab_richness", 0.1],
            // Performance: Opus is slower (large model), Sonnet faster
            ["subModelSignals", "tps_slow", 0.5], // Opus tends to be slow but GPT-5 too
            ["subModelSignals", "tps_fast", -0.3], // Sonnet is fast, but still anthropic
            ["subModelSignals", "ttft_fast", -0.2], // Opus has higher TTFT
            // Task 3: v2 textStructure weights from historical feasibility analysis (2026-04-15)
            // Sample: 36 anthropic vs 31 openai historical probe sessions.
            ["textStructure", "smart_quotes", -1.5], // O=100%, A=11% — reduced: some claude sessions have smart_quotes
            ["textStructure", "code_block", 2.0], // A=64%, O=26%
            ["textStructure", "emoji_usage", 2.0], // A=61%, O=26%
            ["textStructure", "latex_style", -1.2], // O=71%, A=44%
            ["textStructure", "opening_hedge", 1.2], // A=33%, O=10%
            ["textStructure", "em_dash", 1.5], // A=94%, O=74% — increased to help counter smart_quotes
            ["textStructure", "numbered_dot", -0.8], // O=100%, A=81%
            ["textStructure", "closing_offer", -0.8], // O=84%, A=67%
            ["textStructure", "table_style", 0.5], // A=14%, O=0% — weak one-sided
            // Task 3: v2 timing weights (merged into subModelSignals)
            ["subModelSignals", "ttft_bucket_slow", 1.8], // A=61%, O=32% — increased to counter openai signals
            ["subModelSignals", "tps_bucket_slow", 0.3], // actual DB key — mild anthropic signal
            ["subModelSignals", "out_len_terse", -0.6], // O=90%, A=67% — reduced: gap only 23pp
            ["subModelSignals", "out_len_verbose", -2.5], // Verbose output is Gemini-like, not Claude — only present in google rows in dataset
            ["subModelSignals", "ttft_bucket_snappy", -0.5], // O=19%, A=6%
        ],
    },
    {
        family: "openai",
        displayName: "OpenAI / GPT",
        signals: [
            ["linguisticFingerprint", "meta_creator_xai", -3.0], // "created by xAI" is never openai (attack-resistant column)
            ["selfClaim", "grok", -4.0], // a Grok self-ID is never openai (xai family added 2026-07-10)
            ["selfClaim", "openai", 4.0],
            ["selfClaim", "deepseek", -4.0],
            ["selfClaim", "qwen", -4.0],
            ["selfClaim", "gemini", -4.0],
            ["selfClaim", "llama", -4.0],
            ["lexical", "verbose_zh", 0.3],
            ["lexical", "opener_certainly", 2.0],
            ["lexical", "opener_great", 0.5],
            ["refusal", "gpt_style", 2.0],
            ["refusal", "no_refusal", 0.2], // tie-break
            ["refusal", "claude_style", -0.3], // reduced: 29% of openai sessions have claude_style (noisy)
            ["reasoning", "starts_with_letme", 1.0],
            ["jsonDiscipline", "pure_json", 1.0],
            ["jsonDiscipline", "markdown_polluted", -0.5],
            ["selfClaim", "claude", -3.0],
            ["linguisticFingerprint", "overall_stability", 2.5],
            ["linguisticFingerprint", "fr_pm_bayrou", 1.0], // Recal 2026-04-17: GPT-5.4=0.91 — strong openai signal
            ["linguisticFingerprint", "fr_pm_barnier", 0.5],
            ["linguisticFingerprint", "jp_pm_ishiba", 1.5], // GPT-5 era knows Ishiba — same as anthropic, neutral
            ["linguisticFingerprint", "jp_pm_kishida", 0], // Recal 2026-04-17: fires 11% — not discriminative for openai
            ["linguisticFingerprint", "jp_pm_recent", 0.3], // weak signal — Claude knows too
            // Calibrated 2026-04-15 via OpenRouter (gpt-4o vs claude-opus/sonnet-4-6, 3x each)
            // Direction E self-knowledge — reduced weight (system prompt can override self-reported identity)
            ["linguisticFingerprint", "meta_creator_openai", 2.0], // Recal 2026-04-17: A=0.02 O=0.27 — reliable openai signal
            ["linguisticFingerprint", "meta_creator_anthropic", -0.5], // reduced penalty
            ["linguisticFingerprint", "meta_ctx_200k", -0.5], // reduced penalty
            ["linguisticFingerprint", "meta_ctx_128k", 2.0], // Recal 2026-04-17: A=0.02 O=0.27 — GPT context window
            // kr_num_native: GPT-5.4=마흔둘 (native Korean). A=0.12 O=0.82. Recal 2026-04-17
            ["linguisticFingerprint", "kr_num_native", 4.0],
            // Direction C: tokenizer self-knowledge
            ["linguisticFingerprint", "tok_knows_tiktoken", 2.0], // tiktoken = OpenAI signature
            ["linguisticFingerprint", "tok_knows_bpe", -1.5], // BPE = Claude, not OpenAI
            // Direction G: temporal knowledge probes (calibrated 2026-04-15, re-calibrated 2026-04-17)
            // uk_pm_sunak: GPT-5.x era no longer answers Sunak — fires 0% in data — neutralize.
            ["linguisticFingerprint", "uk_pm_sunak", 0],
            // uk_pm_starmer: GPT-5.x knows Starmer (fires 67% in data) but anthropic also fires 60% —
            // mild positive for openai (previously -2.0 penalty was wrong-direction).
            ["linguisticFingerprint", "uk_pm_starmer", 0.5],
            // kr_knows_crisis: GPT-4o doesn't know Dec 2024 (Oct 2023 cutoff) — penalty
            ["linguisticFingerprint", "kr_knows_crisis", -1.5],
            ["lexical", "opener_direct", 0.5],
            ["lexical", "uses_bold_headers", 0.2],
            ["lexical", "uses_numbered_list", 0.8], // GPT-4o uses numbered lists (present in data)
            ["subModelSignals", "total_response_length", 0.3],
            ["subModelSignals", "vocab_richness", 0.1],
            ["subModelSignals", "tps_slow", 0.5], // match anthropic — not a discriminator
            ["subModelSignals", "tps_fast", -0.2],
            // Task 3: v2 textStructure weights from historical feasibility analysis (2026-04-15)
            ["textStructure", "smart_quotes", 2.5], // O=100%, A=11% — reduced: net gap calibration
            ["textStructure", "code_block", -1.5], // A=64%, O=26%
            ["textStructure", "emoji_usage", -1.5], // A=61%, O=26%
            ["textStructure", "latex_style", 1.2], // O=71%, A=44%
            ["textStructure", "opening_hedge", -1.0], // A=33%, O=10%
            ["textStructure", "em_dash", -0.6], // A=94%, O=74% — subtle
            ["textStructure", "numbered_dot", 0.8], // O=100%, A=81%
            ["textStructure", "closing_offer", 0.8], // O=84%, A=67%
            // Task 3: v2 timing weights
            ["subModelSignals", "ttft_bucket_slow", -0.8], // A=61%, O=32%
            ["subModelSignals", "tps_bucket_slow", -0.2], // GPT tends to be faster — weak signal
            ["subModelSignals", "out_len_terse", 1.2], // O=90%, A=67%
            ["subModelSignals", "ttft_bucket_snappy", 0.8], // O=19%, A=6%
        ],
    },
    {
        family: "qwen",
        displayName: "Alibaba / Qwen",
        signals: [
            ["linguisticFingerprint", "meta_creator_xai", -3.0], // "created by xAI" is never qwen (attack-resistant column)
            ["selfClaim", "grok", -4.0], // a Grok self-ID is never qwen (xai family added 2026-07-10)
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
            ["linguisticFingerprint", "meta_creator_xai", -3.0], // "created by xAI" is never google (attack-resistant column)
            ["selfClaim", "grok", -4.0], // a Grok self-ID is never google (xai family added 2026-07-10)
            ["selfClaim", "gemini", 3.0],
            ["lexical", "uses_numbered_list", 1.0],
            ["reasoning", "uses_therefore", 0.5],
            ["subModelSignals", "tps_unstable", 1.5], // Gemini thinking models have unstable TPS
            ["subModelSignals", "ttft_median_norm", 1.0], // Gemini slow TTFT with median norm — present in all 3 failing google rows; NOT in gpt-4o rows
            ["subModelSignals", "out_len_verbose", 1.5], // Gemini tends to produce verbose output
            // TODO(2026-04-27): weights below are inherited from Anthropic's pre-2026-04-17
            // calibration values (high). Anthropic and OpenAI both went through a
            // "reduce because spoofable, then bump back up after firing-rate data" arc.
            // Google jumps straight to high weights without that data check. Recalibrate
            // against Gemini firing rates after Phase C baseline rebuild lands.
            // Direction E self-knowledge (added 2026-04-27 — was missing entirely)
            ["linguisticFingerprint", "meta_creator_google", 2.5], // Gemini self-reports as Google/DeepMind
            ["linguisticFingerprint", "meta_creator_anthropic", -1.0], // contradicts google
            ["linguisticFingerprint", "meta_creator_openai", -1.0], // contradicts google
            ["linguisticFingerprint", "meta_ctx_1m_plus", 2.5], // Gemini 1.5+/3.x report 1M-2M context
            ["linguisticFingerprint", "meta_ctx_200k", -1.0], // 200k = Claude territory, not Gemini
            ["linguisticFingerprint", "meta_ctx_128k", -1.0], // 128k = GPT, not Gemini
            // Gemini exhibits stable self-reporting across runs
            ["linguisticFingerprint", "overall_stability", 1.5],
            ["selfClaim", "claude", -3.0],
            ["selfClaim", "openai", -3.0],
        ],
    },
    {
        family: "meta",
        displayName: "Meta / Llama",
        signals: [
            ["linguisticFingerprint", "meta_creator_xai", -3.0], // "created by xAI" is never meta (attack-resistant column)
            ["selfClaim", "grok", -4.0], // a Grok self-ID is never meta (xai family added 2026-07-10)
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
            ["linguisticFingerprint", "meta_creator_xai", -3.0], // "created by xAI" is never mistral (attack-resistant column)
            ["selfClaim", "grok", -4.0], // a Grok self-ID is never mistral (xai family added 2026-07-10)
            ["selfClaim", "mistral", 3.0],
            ["lexical", "concise_en", 1.0],
            ["selfClaim", "claude", -3.0],
            ["selfClaim", "openai", -3.0],
            ["selfClaim", "kiro", -4.0], // KIRO self-claim is never Mistral
        ],
    },
    {
        family: "deepseek",
        displayName: "DeepSeek",
        signals: [
            ["linguisticFingerprint", "meta_creator_xai", -3.0], // "created by xAI" is never deepseek (attack-resistant column)
            ["selfClaim", "grok", -4.0], // a Grok self-ID is never deepseek (xai family added 2026-07-10)
            ["selfClaim", "deepseek", 3.0],
            ["reasoning", "uses_chain_of_thought", 1.0],
            ["lexical", "uses_dash_bullets", 1.5], // DeepSeek also uses dash bullets
            ["selfClaim", "claude", -3.0],
            ["selfClaim", "openai", -3.0],
        ],
    },
    {
        family: "zhipu",
        displayName: "Zhipu AI / GLM",
        signals: [
            ["linguisticFingerprint", "meta_creator_xai", -3.0], // "created by xAI" is never zhipu (attack-resistant column)
            ["selfClaim", "grok", -4.0], // a Grok self-ID is never zhipu (xai family added 2026-07-10)
            ["selfClaim", "vague", 1.5],
            ["selfClaim", "kiro", -4.0], // KIRO self-claim is never Zhipu
            ["linguisticFingerprint", "overall_instability", 1.2],
            ["linguisticFingerprint", "jp_pm_old", 1.5], // GLM knows 野田佳彦 (2011) — reduced: Claude sometimes knows older PMs
            ["linguisticFingerprint", "fr_pm_old", 2.0], // GLM doesn't know Barnier/Bayrou
            ["linguisticFingerprint", "kr_num_sino", 0.5],
            ["linguisticFingerprint", "fr_pm_barnier", -0.5], // Barnier knowledge → NOT old Zhipu
            ["linguisticFingerprint", "fr_pm_bayrou", -1.5], // Bayrou knowledge → definitely not Zhipu
            ["linguisticFingerprint", "jp_pm_ishiba", -2.0], // Ishiba knowledge → definitely not Zhipu
            ["linguisticFingerprint", "overall_stability", -1.5],
            ["selfClaim", "claude", -3.0],
            ["selfClaim", "openai", -3.0],
            ["subModelSignals", "tps_fast", 0.3], // GLM can be fast
            ["subModelSignals", "tps_slow", -0.3],
            // Direction G: temporal knowledge probes (calibrated 2026-04-15)
            // Zhipu GLM has older cutoff, similar to GPT-4o base model
            ["linguisticFingerprint", "uk_pm_starmer", -2.5], // Zhipu doesn't know Starmer
            ["linguisticFingerprint", "kr_knows_crisis", -2.0], // Zhipu doesn't know Dec 2024 crisis
            ["linguisticFingerprint", "de_chan_merz", -1.5], // Zhipu doesn't know Merz (Feb 2025)
            ["linguisticFingerprint", "uk_pm_sunak", 1.5], // Zhipu knows Sunak (pre-2024 cutoff)
            ["linguisticFingerprint", "de_chan_scholz", 1.0], // Zhipu knows Scholz (pre-2025 cutoff)
        ],
    },
    {
        // xAI / Grok (added 2026-07-10). Before this entry every grok id scored against the other
        // eight baselines, and modelIdToFamily() returned "unknown" — which closes the V3H gate
        // (`family !== "unknown"`) and left the sub-model layer blind while 14 grok routes sold.
        // The self-claim carries the signal: both live models identify unprompted
        // ("I am Grok, a curious AI built by xAI." / "I am Grok 4, an AI model built by xAI.").
        // Behavioural weights are deliberately sparse — only signals we measured ship here, and the
        // other families' negative selfClaim/grok weights do most of the discriminating work.
        family: "xai",
        displayName: "xAI / Grok",
        signals: [
            ["linguisticFingerprint", "meta_creator_xai", 3.0], // measured: both live Grok models answer "xAI"
            ["linguisticFingerprint", "meta_creator_anthropic", -3.0],
            ["linguisticFingerprint", "meta_creator_openai", -3.0],
            ["linguisticFingerprint", "meta_creator_google", -3.0],
            ["linguisticFingerprint", "meta_creator_zhipu", -3.0],
            ["selfClaim", "grok", 3.0],
            ["selfClaim", "claude", -4.0],
            ["selfClaim", "openai", -4.0],
            ["selfClaim", "deepseek", -4.0],
            ["selfClaim", "qwen", -4.0],
            ["selfClaim", "gemini", -4.0],
            ["selfClaim", "llama", -4.0],
            ["selfClaim", "mistral", -4.0],
            ["selfClaim", "kiro", -4.0],
        ],
    },
];
function claimedModelToFamily(claimedModel) {
    const m = claimedModel.toLowerCase();
    if (m.includes("claude") || m.includes("anthropic"))
        return "anthropic";
    if (m.includes("gpt") || m.includes("chatgpt") || m.includes("openai") ||
        m.startsWith("o1") || m.startsWith("o3") || m.startsWith("o4"))
        return "openai";
    if (m.includes("qwen") || m.includes("tongyi"))
        return "qwen";
    if (m.includes("gemini") || m.includes("bard") || m.includes("google/gemini"))
        return "google";
    if (m.includes("llama") || m.includes("meta/"))
        return "meta";
    if (m.includes("mistral") || m.includes("mixtral"))
        return "mistral";
    if (m.includes("deepseek"))
        return "deepseek";
    if (m.includes("glm") || m.includes("zhipu") || m.includes("z-ai"))
        return "zhipu";
    // xAI (2026-07-10). MUST mirror modelIdToFamily() in lib/backtest-scorer.ts. This map labels
    // every probe_baselines corpus row; an unlabelled row never votes for its family, and the
    // baselineMatchVotes signal carries llmmapWeight=10 — far above any FAMILY_BASELINES weight.
    // Omitting it made a real grok-4.5 endpoint score anthropic @82% on corpus similarity alone
    // (dev end-to-end 2026-07-10), after which V3H strong-passed claude-haiku-4.5 → a false 已替換.
    if (m.includes("grok") || m.includes("x-ai") || m.includes("xai"))
        return "xai";
    return undefined;
}
//# sourceMappingURL=fingerprint-baseline.js.map