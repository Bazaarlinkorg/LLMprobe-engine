export declare function normalizeModelCore(id: string): string;
/** Canonical family token. Collapses the zhipu ⟷ z-ai split: family SCORES and the
 *  linguistic override speak "zhipu", but every baseline / model id is "z-ai/glm-*".
 *  Comparing a family name to a modelId's org prefix (candidate assembly, display
 *  scoping) MUST go through this or GLM's V3H never fires. Others pass through
 *  lowercased. (2026-07-03 — found by real end-to-end probe.) */
export declare function canonicalFamily(f: string | null | undefined): string;
/** True iff two model ids refer to the same canonical model, tolerant of
 *  vendor prefixes and dated version tags. */
export declare function modelIdsMatch(a: string, b: string): boolean;
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
export declare function canonicalizeModelId(id: string): string;
/**
 * Stable grouping key for analytics rows. Strips provider prefixes and
 * routing-only suffixes while keeping capability-changing suffixes separate.
 */
export declare function baseModelId(model: string): string;
//# sourceMappingURL=model-id-normalize.d.ts.map