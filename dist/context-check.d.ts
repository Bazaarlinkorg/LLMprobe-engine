export interface ContextCheckResult {
    passed: boolean;
    warning: boolean;
    maxTestedChars: number;
    lastPassChars: number | null;
    firstFailChars: number | null;
    reason: string;
}
type SendFn = (message: string) => Promise<string>;
export declare function runContextCheck(send: SendFn): Promise<ContextCheckResult>;
export {};
//# sourceMappingURL=context-check.d.ts.map