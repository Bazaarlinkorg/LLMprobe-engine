"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
//# sourceMappingURL=sub-model-baselines-v3e.js.map