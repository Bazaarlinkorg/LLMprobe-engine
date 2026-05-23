import type { SubmodelBaselineV3 } from "./sub-model-baselines-v3.js";
export interface BaselineStore {
    get(): SubmodelBaselineV3[];
    getForFamily(family: string): SubmodelBaselineV3[];
    getFamilies(): string[];
    invalidate(): void;
    hydrateNow(): Promise<SubmodelBaselineV3[]>;
    /** For tests: inspect cache state without side effects. */
    _peek(): {
        cached: SubmodelBaselineV3[];
        cacheExpiresAt: number;
        lastSource: "seed" | "db" | "error";
    };
}
export interface BaselineStoreOptions {
    seed: SubmodelBaselineV3[];
    fetcher: () => Promise<SubmodelBaselineV3[]>;
    ttlMs?: number;
    /** Injected clock for tests. Defaults to Date.now. */
    now?: () => number;
}
export declare function createBaselineStore(opts: BaselineStoreOptions): BaselineStore;
export declare const defaultBaselineStore: BaselineStore;
export declare function getCachedBaselines(): SubmodelBaselineV3[];
export declare function getCachedBaselinesForFamily(f: string): SubmodelBaselineV3[];
export declare function getCachedFamilies(): string[];
export declare function invalidateBaselineCache(): void;
//# sourceMappingURL=sub-model-baselines-v3-store.d.ts.map