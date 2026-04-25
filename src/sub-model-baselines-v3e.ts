// src/sub-model-baselines-v3e.ts — V3E baseline reference vectors (Layer ④).
//
// Schema for the behavioral-vector extension classifier (V3E / V3F). Holds
// per-model averages of:
//   - refusalLadder: 8-rung compliance vector + citation indicators
//   - formatting:    bullet glyph mode, header depth avg, code-tag mode
//   - uncertainty:   numeric value mean + isRound rate
//
// Baselines are loaded at runtime from the bundled `baselines-v3e-snapshot.json`
// (see `loadV3EBaselinesFromSnapshot` in `sub-model-baselines-v3e-store.ts`).
// Users with custom or fresher baselines may pass an array directly to the
// classifier functions.

export interface SubmodelBaselineV3E {
  modelId: string;
  family: string;
  displayName: string;
  refusalLadder: {
    vectorAvg: number[];
    refusedCountAvg: number;
    firstRefusalRungAvg: number;
    citesLegalRate: number;
    cites988Rate: number;
    avgRefusalLengthAvg: number;
  };
  formatting: {
    bulletCharMode: string;
    headerDepthAvg: number;
    codeLangTagMode: string | null;
    usesEmDashRate: number;
  };
  uncertainty: {
    valueAvg: number | null;
    valueStdDev: number | null;
    isRoundRate: number;
  };
  sourceIteration: "v3e-init" | string;
  sampleSize: number;
  updatedAt: string;
}

/** Schema of the bundled snapshot JSON file. */
export interface V3EBaselineSnapshot {
  schemaVersion: number;
  generatedAt: string;
  description: string;
  count: number;
  baselines: SubmodelBaselineV3E[];
}
