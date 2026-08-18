/**
 * Gap to use for the tie-break abstain: distance from the top candidate to the
 * next candidate OF THE SAME FAMILY. Returns Infinity when the top has no
 * same-family runner-up (so a lone same-family top never abstains on foreign noise).
 * `scoredDesc` must be sorted by score descending.
 */
export declare function sameFamilyTieGap<T extends {
    family: string;
    score: number;
}>(scoredDesc: T[]): number;
//# sourceMappingURL=sub-model-tie-break.d.ts.map