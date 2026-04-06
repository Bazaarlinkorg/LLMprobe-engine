// src/index.ts — Public API for @bazaarlink/probe-engine (MIT)

export { runProbes } from "./runner.js";
export type { RunOptions, RunReport, ProbeResult, BaselineMap } from "./runner.js";

export { PROBE_SUITE, autoScore } from "./probe-suite.js";
export type { ProbeDefinition, ProbeGroup, ScoringMode } from "./probe-suite.js";

export { computeProbeScore } from "./probe-score.js";
export type { ProbeRunItemLike } from "./probe-score.js";

export { classifyPreflightResult } from "./probe-preflight.js";
export type { PreflightOutcome } from "./probe-preflight.js";

export { detectTokenInflation, TOKEN_INFLATION_THRESHOLD } from "./token-inflation.js";
export type { TokenInflationResult } from "./token-inflation.js";

export { checkSSECompliance } from "./sse-compliance.js";
export type { SSEComplianceResult } from "./sse-compliance.js";

export { runContextCheck } from "./context-check.js";
export type { ContextCheckResult } from "./context-check.js";
