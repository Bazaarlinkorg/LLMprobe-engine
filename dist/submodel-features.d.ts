export interface SubModelExtractorInput {
    responses: Record<string, string>;
    items: Array<{
        id: string;
        tps: number | null;
        ttftMs: number | null;
    }>;
}
export declare function extractSubModelFeatures(input: SubModelExtractorInput): Record<string, number>;
/**
 * Extract distribution features from the raw per-run answers of pi_fingerprint.
 * Called separately because linguisticResults are not always available in the
 * standard featureResponses map.
 */
export declare function extractPiDistributionFeatures(answers: string[]): Record<string, number>;
//# sourceMappingURL=submodel-features.d.ts.map