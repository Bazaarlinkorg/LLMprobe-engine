export declare function extractSmartQuotes(text: string): number;
export declare function extractEmDash(text: string): number;
export declare function extractEllipsisStyle(text: string): number;
export declare function extractCodeFenceLang(text: string): string | null;
export declare function extractTableStyle(text: string): number;
export declare function extractBoldStyle(text: string): number;
export declare function extractNumberedListDot(text: string): number;
export declare function extractCjkPunct(text: string): number;
export declare function extractOpeningHedge(text: string): number;
export declare function extractClosingOffer(text: string): number;
export declare function extractAvgSentenceLen(text: string): number;
export declare function extractParagraphCount(text: string): number;
export declare function extractHasCodeBlock(text: string): number;
export declare function extractEmojiUsage(text: string): number;
export declare function extractLatexStyle(text: string): number;
/** Run all extractors against a single response, return Record<string, number> */
export declare function extractTextStructureFeatures(text: string): Record<string, number>;
/** Aggregate features across many responses — OR for booleans, mean for continuous */
export declare function aggregateTextStructure(featureList: Record<string, number>[]): Record<string, number>;
export interface TimedItem {
    ttftMs?: number | null;
    durationMs?: number | null;
    tps?: number | null;
    inputTokens?: number | null;
    outputTokens?: number | null;
}
/**
 * Derive timing/length features from a list of probe items. All outputs are
 * 0/1 bucket flags or values normalized to [0,1]. Non-spoofable — reflects
 * upstream provider infrastructure characteristics.
 */
export declare function extractTimingFeatures(items: TimedItem[]): Record<string, number>;
/** Convenience wrapper that drops the raw tps_median (non-normalized) from the
 *  output — use this when handing features to the scorer. */
export declare function aggregateTimingFeatures(items: TimedItem[]): Record<string, number>;
//# sourceMappingURL=fingerprint-features-v2.d.ts.map