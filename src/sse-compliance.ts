// src/sse-compliance.ts — OpenAI SSE stream compliance checker (MIT)

export interface SSEComplianceResult {
  passed: boolean;
  warning: boolean;
  dataLines: number;
  missingChoicesCount: number;
  issues: string[];
}

export function checkSSECompliance(lines: string[]): SSEComplianceResult {
  const issues: string[] = [];
  let warning = false;
  let dataLines = 0;
  let missingChoicesCount = 0;
  let hasDone = false;

  if (lines.length === 0) {
    return { passed: false, warning: false, dataLines: 0, missingChoicesCount: 0, issues: ["Stream is empty"] };
  }

  for (const line of lines) {
    if (line === "[DONE]") { hasDone = true; continue; }
    dataLines++;
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      issues.push(`Invalid JSON in stream chunk: ${line.slice(0, 80)}`);
      continue;
    }
    if (typeof parsed !== "object" || parsed === null) {
      issues.push("Stream chunk is not a JSON object");
      continue;
    }
    const obj = parsed as Record<string, unknown>;
    if (!Array.isArray(obj.choices) || obj.choices.length === 0) {
      missingChoicesCount++;
      warning = true;
    }
  }

  if (!hasDone) issues.push("Stream did not end with [DONE]");
  if (dataLines === 0) issues.push("Stream contained no data chunks");

  const passed = issues.length === 0;
  return { passed, warning: !passed ? false : warning, dataLines, missingChoicesCount, issues };
}
