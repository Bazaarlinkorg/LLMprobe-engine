// src/proxy-analyzer.ts — Request profiling and response injection analysis (MIT)
// Ported from openruterati monitor-analyzer logic, standalone / no framework deps.

export const SENSITIVE_KEYWORDS = [
  "aws", "credential", "secret", "password", "api_key", "apikey",
  "private_key", "access_key", "bearer", "token", "ssh_key", "private key",
] as const;

export const INJECTION_KEYWORDS = [
  "exec(", "eval(", "__import__", "subprocess", "os.system",
  "os.popen", "base64", "socket", "urllib", "requests.get",
  "wget ", "curl ", "sh -c", "powershell", "http://", "https://",
] as const;

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

export type Ac1bVerdict =
  | "insufficient_data"
  | "no_conditional_injection"
  | "conditional_injection_suspected";

export interface Ac1bResult {
  verdict: Ac1bVerdict;
  reason: string;
}

/** Classify the last user message as neutral or sensitive. */
export function profileRequest(userContent: string): RequestProfile {
  const lower = userContent.toLowerCase();
  return SENSITIVE_KEYWORDS.some(kw => lower.includes(kw)) ? "sensitive" : "neutral";
}

/** Scan assistant response for code-injection keywords. */
export function analyzeResponse(assistantContent: string): ResponseAnalysis {
  const lower = assistantContent.toLowerCase();
  const found = INJECTION_KEYWORDS.filter(kw => lower.includes(kw.toLowerCase()));
  return { anomaly: found.length > 0, injectionKeywordsFound: found };
}

/** AC-1.b: detect conditional injection pattern from accumulated stats. */
export function computeAc1b(stats: Ac1bStats): Ac1bResult {
  const { neutralCount, neutralAnomalies, sensitiveCount, sensitiveAnomalies } = stats;

  if (neutralCount < 3 || sensitiveCount < 3) {
    return {
      verdict: "insufficient_data",
      reason: `Need ≥3 neutral (have ${neutralCount}) and ≥3 sensitive (have ${sensitiveCount}) messages`,
    };
  }

  const neutralRate   = neutralAnomalies   / neutralCount;
  const sensitiveRate = sensitiveAnomalies / sensitiveCount;

  const isConditional =
    sensitiveAnomalies >= 1 &&
    (neutralAnomalies === 0 || sensitiveRate >= neutralRate * 2);

  if (isConditional) {
    return {
      verdict: "conditional_injection_suspected",
      reason: `Sensitive anomaly rate ${(sensitiveRate * 100).toFixed(0)}% vs neutral ${(neutralRate * 100).toFixed(0)}% — conditional injection pattern detected`,
    };
  }

  return {
    verdict: "no_conditional_injection",
    reason: `Rates similar: sensitive ${(sensitiveRate * 100).toFixed(0)}% vs neutral ${(neutralRate * 100).toFixed(0)}%`,
  };
}

/** Derive Ac1bStats from a list of log entries. */
export function statsFromLogs(logs: Array<{ profile: RequestProfile; anomaly: boolean }>): Ac1bStats {
  let neutralCount = 0;
  let neutralAnomalies = 0;
  let sensitiveCount = 0;
  let sensitiveAnomalies = 0;

  for (const log of logs) {
    if (log.profile === "neutral") {
      neutralCount++;
      if (log.anomaly) neutralAnomalies++;
    } else {
      sensitiveCount++;
      if (log.anomaly) sensitiveAnomalies++;
    }
  }

  return { neutralCount, neutralAnomalies, sensitiveCount, sensitiveAnomalies };
}
