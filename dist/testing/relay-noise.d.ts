/**
 * Blank the refusal-class response keys — a relay that strips a native refusal to empty.
 * Only keys whose name matches /refusal/i are emptied (e.g. `submodel_refusal`);
 * a `submodel_cutoff` key is untouched. Downstream the empty string normalizes to the
 * "(blank)" signal token — it is NOT filtered.
 */
export declare function blankRefusals(responses: Record<string, string>): Record<string, string>;
/**
 * Wrap non-empty responses with a fixed prefix — a relay that injects boilerplate
 * (system banner, disclaimer) ahead of the real output. Empty values stay empty
 * (a blank refusal must not be resurrected into a non-blank).
 */
export declare function wrapResponses(responses: Record<string, string>, prefix: string): Record<string, string>;
/**
 * Thin per-probe samples down to `ceil(ratio * n)` — a relay that starves sampling
 * (fewer completions returned than requested). Keeps a seeded pseudo-random subset so
 * the survivors are not just a prefix. `ratio` is clamped to [0,1]; the kept count is
 * `min(n, max(0, ceil(ratio*n)))`.
 */
export declare function thinBiasSamples(samples: Record<string, string[]>, ratio: number, seed: number): Record<string, string[]>;
/**
 * Swap `ceil(rate * n)` drawn answers per probe to "" — a relay that intermittently
 * blanks completions (partial refusal-strip / dropped tokens). The "" values normalize
 * to the "(blank)" signal downstream (never filtered). Positions to blank are chosen by
 * a seeded LCG, so the count and which slots are deterministic. `rate` clamped to [0,1].
 */
export declare function injectBlanks(samples: Record<string, string[]>, rate: number, seed: number): Record<string, string[]>;
//# sourceMappingURL=relay-noise.d.ts.map