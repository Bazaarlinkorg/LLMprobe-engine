// src/sub-model-baselines-v3-store.ts
// Runtime-updatable baseline cache. Seeded from the V3_BASELINES constant
// (which stays in git as the source of truth). The OSS engine ships with a
// seed-only default store — the fetcher is a no-op that returns the seed
// unchanged. Downstream consumers (e.g. a SaaS that stores baselines in
// Postgres) can replace the default store via createBaselineStore() and
// inject their own fetcher; the public classifier API accepts an optional
// baselines override so the store is not on the hot path.

import type { SubmodelBaselineV3 } from "./sub-model-baselines-v3.js";
import { V3_BASELINES } from "./sub-model-baselines-v3.js";

export interface BaselineStore {
  get(): SubmodelBaselineV3[];
  getForFamily(family: string): SubmodelBaselineV3[];
  getFamilies(): string[];
  invalidate(): void;
  hydrateNow(): Promise<SubmodelBaselineV3[]>;
  /** For tests: inspect cache state without side effects. */
  _peek(): { cached: SubmodelBaselineV3[]; cacheExpiresAt: number; lastSource: "seed" | "db" | "error" };
}

export interface BaselineStoreOptions {
  seed: SubmodelBaselineV3[];
  fetcher: () => Promise<SubmodelBaselineV3[]>;
  ttlMs?: number;
  /** Injected clock for tests. Defaults to Date.now. */
  now?: () => number;
}

const DEFAULT_TTL_MS = 5 * 60 * 1000;
const ERROR_RETRY_MS = 60 * 1000;

export function createBaselineStore(opts: BaselineStoreOptions): BaselineStore {
  const ttl = opts.ttlMs ?? DEFAULT_TTL_MS;
  const now = opts.now ?? Date.now;
  let cached: SubmodelBaselineV3[] = opts.seed;
  let cacheExpiresAt = 0;
  let refreshPromise: Promise<void> | null = null;
  let lastSource: "seed" | "db" | "error" = "seed";

  async function refresh(): Promise<void> {
    try {
      const rows = await opts.fetcher();
      if (rows.length === 0) {
        cacheExpiresAt = now() + ttl;
        return;
      }
      cached = rows;
      lastSource = "db";
      cacheExpiresAt = now() + ttl;
    } catch (err) {
      lastSource = "error";
      cacheExpiresAt = now() + ERROR_RETRY_MS;
      console.error("[v3-baseline-store] refresh failed:", err);
    }
  }

  function maybeRefresh(): void {
    if (now() < cacheExpiresAt || refreshPromise) return;
    refreshPromise = refresh().finally(() => { refreshPromise = null; });
  }

  return {
    get() { maybeRefresh(); return cached; },
    getForFamily(family) { maybeRefresh(); return cached.filter(b => b.family === family); },
    getFamilies() { maybeRefresh(); return Array.from(new Set(cached.map(b => b.family))); },
    invalidate() { cacheExpiresAt = 0; },
    async hydrateNow() { await refresh(); return cached; },
    _peek() { return { cached, cacheExpiresAt, lastSource }; },
  };
}

// Default seed-only singleton. The fetcher returns the seed unchanged so
// the OSS engine has no DB dependency. SaaS consumers can replace this
// entire export by calling createBaselineStore() with their own fetcher.
export const defaultBaselineStore = createBaselineStore({
  seed: V3_BASELINES,
  fetcher: async () => V3_BASELINES,
});

export function getCachedBaselines(): SubmodelBaselineV3[] { return defaultBaselineStore.get(); }
export function getCachedBaselinesForFamily(f: string): SubmodelBaselineV3[] { return defaultBaselineStore.getForFamily(f); }
export function getCachedFamilies(): string[] { return defaultBaselineStore.getFamilies(); }
export function invalidateBaselineCache(): void { defaultBaselineStore.invalidate(); }
