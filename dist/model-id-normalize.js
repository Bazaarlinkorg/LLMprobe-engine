"use strict";
// lib/model-id-normalize.ts — canonical model-id normalizer used everywhere
// we want to decide "is claimed == detected". Strips vendor prefix
// ("anthropic/..."), dated suffixes ("-20250615", "-2025-05-22",
// "-20250615-preview"), and all non-alphanumerics.
//
// Without this, "claude-opus-4-5-20250615" and "anthropic/claude-opus-4.5"
// get normalized to "claudeopus4520250615" and "anthropicclaudeopus45",
// which don't substring-match — causing false "子模型不吻合" warnings.
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeModelCore = normalizeModelCore;
exports.canonicalFamily = canonicalFamily;
exports.modelIdsMatch = modelIdsMatch;
exports.canonicalizeModelId = canonicalizeModelId;
exports.baseModelId = baseModelId;
function normalizeModelCore(id) {
    if (!id)
        return "";
    let s = id.toLowerCase();
    if (s.includes("/"))
        s = s.slice(s.lastIndexOf("/") + 1);
    s = s.replace(/-(\d{4,8}|\d{4}-\d{2}-\d{2})(-[a-z]+)*$/, "");
    return s.replace(/[^a-z0-9]/g, "");
}
/** Canonical family token. Collapses the zhipu ⟷ z-ai split: family SCORES and the
 *  linguistic override speak "zhipu", but every baseline / model id is "z-ai/glm-*".
 *  Comparing a family name to a modelId's org prefix (candidate assembly, display
 *  scoping) MUST go through this or GLM's V3H never fires. Others pass through
 *  lowercased. (2026-07-03 — found by real end-to-end probe.) */
function canonicalFamily(f) {
    const s = (f ?? "").toLowerCase();
    if (s === "zhipu" || s === "zai")
        return "z-ai";
    // Same collapse for xAI (2026-07-10): family scores and modelIdToFamily speak "xai", but every
    // grok baseline id is "x-ai/grok-*". Without this, candidateSiblingsForFamily("xai") returns []
    // and grok's V3H never fires — the exact failure the zhipu⟷z-ai line above exists to prevent.
    if (s === "xai" || s === "x-ai")
        return "x-ai";
    return s;
}
/** True iff two model ids refer to the same canonical model, tolerant of
 *  vendor prefixes and dated version tags. */
function modelIdsMatch(a, b) {
    const na = normalizeModelCore(a);
    const nb = normalizeModelCore(b);
    if (!na || !nb)
        return false;
    return na === nb;
}
/** Canonical grouping key for probeHistory rows.
 *
 *  Purpose: merge reseller-tagged variants of the same upstream model so the
 *  public stats pages (`/probe/stats/<id>`) and `IntegritySummary` see a
 *  complete picture. Kept separate from `normalizeModelCore` because the
 *  matching contract is different: this function preserves variant suffixes
 *  like `-thinking` and `-1m` that DO change the fingerprint, while stripping
 *  reseller prefixes (`[官]`, `【按次】`, `Chat:`, `R-`, `AWS/`, `or/…`, CJK
 *  prefixes) and date stamps.
 */
function canonicalizeModelId(id) {
    if (!id)
        return "";
    let s = id.toLowerCase().trim();
    if (!s)
        return "";
    // 1. Strip all bracketed tags anywhere: [foo], 【bar】, (baz).
    s = s.replace(/[\[【(][^\]】)]*[\]】)]/g, "");
    // 2. Drop vendor/pool prefix by taking the last "/"-separated segment.
    if (s.includes("/"))
        s = s.slice(s.lastIndexOf("/") + 1);
    // 3. Strip "chat:" / "channel:" / "api:" prefix.
    s = s.replace(/^(chat|channel|api):/i, "");
    // 4. Strip leading CJK + optional ASCII run followed by "-".
    s = s.replace(/^[一-龥]+[a-z]*-/i, "");
    // 5. Strip single-letter reseller prefix "X-" when followed by a known
    //    model keyword, to avoid eating short legitimate model names like "o3-".
    s = s.replace(/^[a-z]-(?=(claude|gpt|gemini|deepseek|llama|qwen|mistral|grok))/i, "");
    // 6. Strip trailing "-r" single-letter reseller suffix.
    s = s.replace(/-r$/i, "");
    // 7. Strip date suffix (YYYYMMDD or YYYY-MM-DD) in-place, preserving any
    //    variant suffix that follows (e.g. "-thinking", "-preview", "-1m").
    s = s.replace(/-(\d{8}|\d{4}-\d{2}-\d{2})(?=-|$)/g, "");
    // 8. Strip remaining non-alphanumerics.
    return s.replace(/[^a-z0-9]/g, "");
}
const ROUTING_VARIANTS = new Set(["free", "nitro", "floor", "online", "extended"]);
/**
 * Stable grouping key for analytics rows. Strips provider prefixes and
 * routing-only suffixes while keeping capability-changing suffixes separate.
 */
function baseModelId(model) {
    if (!model)
        return "";
    const trimmed = model.trim();
    if (!trimmed)
        return "";
    const withoutProvider = trimmed.includes("/")
        ? trimmed.slice(trimmed.lastIndexOf("/") + 1)
        : trimmed;
    const colonIdx = withoutProvider.indexOf(":");
    if (colonIdx === -1)
        return withoutProvider;
    const variant = withoutProvider.slice(colonIdx + 1).toLowerCase();
    if (ROUTING_VARIANTS.has(variant)) {
        return withoutProvider.slice(0, colonIdx);
    }
    return withoutProvider;
}
//# sourceMappingURL=model-id-normalize.js.map