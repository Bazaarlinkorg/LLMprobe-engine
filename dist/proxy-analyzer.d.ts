export declare const SENSITIVE_KEYWORDS: readonly ["aws", "credential", "secret", "password", "api_key", "apikey", "private_key", "access_key", "bearer", "token", "ssh_key", "private key"];
export declare const INJECTION_KEYWORDS: readonly ["exec(", "eval(", "__import__", "subprocess", "os.system", "os.popen", "base64", "socket", "urllib", "requests.get", "wget ", "curl ", "sh -c", "powershell", "http://", "https://"];
export type RequestProfile = "neutral" | "sensitive";
export interface ResponseAnalysis {
    anomaly: boolean;
    injectionKeywordsFound: string[];
}
export interface Ac1bStats {
    neutralCount: number;
    neutralAnomalies: number;
    sensitiveCount: number;
    sensitiveAnomalies: number;
}
export type Ac1bVerdict = "insufficient_data" | "no_conditional_injection" | "conditional_injection_suspected";
export interface Ac1bResult {
    verdict: Ac1bVerdict;
    reason: string;
}
/** Classify the last user message as neutral or sensitive. */
export declare function profileRequest(userContent: string): RequestProfile;
/** Scan assistant response for code-injection keywords. */
export declare function analyzeResponse(assistantContent: string): ResponseAnalysis;
/** AC-1.b: detect conditional injection pattern from accumulated stats. */
export declare function computeAc1b(stats: Ac1bStats): Ac1bResult;
/** Derive Ac1bStats from a list of log entries. */
export declare function statsFromLogs(logs: Array<{
    profile: RequestProfile;
    anomaly: boolean;
}>): Ac1bStats;
//# sourceMappingURL=proxy-analyzer.d.ts.map