import type { FamilyScore } from "./identity-report.js";
export interface JudgeIdentityResult {
    family: string;
    confidence: number;
    reasons: string[];
}
/** Parse LLM judge response. Returns null on failure. */
export declare function parseJudgeIdentityResult(text: string): JudgeIdentityResult | null;
/** Build the judge prompt from probe responses. */
export declare function buildJudgeIdentityPrompt(responses: Record<string, string>): string;
/**
 * Call LLM judge to identify model family from probe responses.
 * Returns FamilyScore[] with the judge's top pick scored and all others at 0.
 * Returns empty array if judge is unavailable or fails.
 */
export declare function judgeFingerprint(responses: Record<string, string>, judgeBaseUrl: string, judgeApiKey: string, judgeModelId: string): Promise<{
    scores: FamilyScore[];
    result: JudgeIdentityResult | null;
    costUsd: number | null;
}>;
//# sourceMappingURL=fingerprint-judge.d.ts.map