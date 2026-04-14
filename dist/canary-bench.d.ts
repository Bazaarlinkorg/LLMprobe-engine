export type CanaryCategory = "math" | "logic" | "format" | "recall" | "code";
export interface CanaryItem {
    id: string;
    prompt: string;
    /** Case-insensitive exact match after trim + strip trailing "." */
    expectedExact?: string;
    /** Applied to trimmed actual; compiled with "i" flag */
    expectedRegex?: string;
    category: CanaryCategory;
}
export declare const CANARY_BENCH: CanaryItem[];
export interface CanaryAnswerResult {
    id: string;
    passed: boolean;
    actual: string | null;
    expected: string;
}
export declare function scoreCanaryAnswer(item: CanaryItem, actual: string | null): CanaryAnswerResult;
//# sourceMappingURL=canary-bench.d.ts.map