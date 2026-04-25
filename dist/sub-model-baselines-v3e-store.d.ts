import type { SubmodelBaselineV3E } from "./sub-model-baselines-v3e.js";
/**
 * Load the bundled `baselines-v3e-snapshot.json` and cache it in memory.
 * Subsequent calls return the cached array unless `setV3EBaselines` was used.
 */
export declare function loadV3EBaselinesFromSnapshot(): SubmodelBaselineV3E[];
/** Override the cached baselines (e.g., for tests or fresh retrains). */
export declare function setV3EBaselines(baselines: SubmodelBaselineV3E[]): void;
/** Read-only view of the currently cached baselines (or empty if none loaded). */
export declare function getCachedV3EBaselines(): SubmodelBaselineV3E[];
/** Reset the cache. Mainly for tests. */
export declare function clearV3ECache(): void;
//# sourceMappingURL=sub-model-baselines-v3e-store.d.ts.map