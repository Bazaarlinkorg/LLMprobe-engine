// src/sub-model-baselines-v3e-store.ts — file-based loader for V3E baselines.
//
// In the SaaS deployment of this engine the V3E baselines live in a Postgres
// table that is hot-swappable from the admin panel. The open-source release
// instead bundles a frozen JSON snapshot of the latest published baselines
// (`baselines-v3e-snapshot.json`); load it via `loadV3EBaselinesFromSnapshot`.
//
// Users with custom or freshly retrained baselines can:
//   1) call `setV3EBaselines(custom)` to override the cache, OR
//   2) pass an array directly to `classifySubmodelV3E(...)` per call.

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import type { SubmodelBaselineV3E, V3EBaselineSnapshot } from "./sub-model-baselines-v3e.js";

let cached: SubmodelBaselineV3E[] | null = null;

/**
 * Resolve the location of the bundled snapshot JSON. Works whether the package
 * is consumed as compiled output (`dist/baselines-v3e-snapshot.json`) or as
 * source via ts-node / Vitest (which read from `src/`).
 */
function findSnapshotPath(): string {
  // __dirname under CommonJS is the directory of the compiled .js. For Vitest
  // running source TS the value points at `src/__tests__/..` etc. We probe a
  // few likely locations.
  const candidates = [
    resolve(__dirname, "baselines-v3e-snapshot.json"),
    resolve(__dirname, "..", "src", "baselines-v3e-snapshot.json"),
    resolve(__dirname, "..", "..", "src", "baselines-v3e-snapshot.json"),
    resolve(process.cwd(), "src", "baselines-v3e-snapshot.json"),
    resolve(process.cwd(), "dist", "baselines-v3e-snapshot.json"),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  throw new Error(
    "[v3e-store] baselines-v3e-snapshot.json not found. Searched: " + candidates.join(", "),
  );
}

/**
 * Load the bundled `baselines-v3e-snapshot.json` and cache it in memory.
 * Subsequent calls return the cached array unless `setV3EBaselines` was used.
 */
export function loadV3EBaselinesFromSnapshot(): SubmodelBaselineV3E[] {
  if (cached) return cached;
  const path = findSnapshotPath();
  const raw = readFileSync(path, "utf-8");
  const snapshot = JSON.parse(raw) as V3EBaselineSnapshot;
  cached = snapshot.baselines;
  return cached;
}

/** Override the cached baselines (e.g., for tests or fresh retrains). */
export function setV3EBaselines(baselines: SubmodelBaselineV3E[]): void {
  cached = baselines;
}

/** Read-only view of the currently cached baselines (or empty if none loaded). */
export function getCachedV3EBaselines(): SubmodelBaselineV3E[] {
  return cached ?? [];
}

/** Reset the cache. Mainly for tests. */
export function clearV3ECache(): void {
  cached = null;
}
