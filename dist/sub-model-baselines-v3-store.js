"use strict";
// src/sub-model-baselines-v3-store.ts
// Runtime-updatable baseline cache. Seeded from the V3_BASELINES constant
// (which stays in git as the source of truth). The OSS engine ships with a
// seed-only default store — the fetcher is a no-op that returns the seed
// unchanged. Downstream consumers (e.g. a SaaS that stores baselines in
// Postgres) can replace the default store via createBaselineStore() and
// inject their own fetcher; the public classifier API accepts an optional
// baselines override so the store is not on the hot path.
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultBaselineStore = void 0;
exports.createBaselineStore = createBaselineStore;
exports.getCachedBaselines = getCachedBaselines;
exports.getCachedBaselinesForFamily = getCachedBaselinesForFamily;
exports.getCachedFamilies = getCachedFamilies;
exports.invalidateBaselineCache = invalidateBaselineCache;
const sub_model_baselines_v3_js_1 = require("./sub-model-baselines-v3.js");
const DEFAULT_TTL_MS = 5 * 60 * 1000;
const ERROR_RETRY_MS = 60 * 1000;
function createBaselineStore(opts) {
    const ttl = opts.ttlMs ?? DEFAULT_TTL_MS;
    const now = opts.now ?? Date.now;
    let cached = opts.seed;
    let cacheExpiresAt = 0;
    let refreshPromise = null;
    let lastSource = "seed";
    async function refresh() {
        try {
            const rows = await opts.fetcher();
            if (rows.length === 0) {
                cacheExpiresAt = now() + ttl;
                return;
            }
            cached = rows;
            lastSource = "db";
            cacheExpiresAt = now() + ttl;
        }
        catch (err) {
            lastSource = "error";
            cacheExpiresAt = now() + ERROR_RETRY_MS;
            console.error("[v3-baseline-store] refresh failed:", err);
        }
    }
    function maybeRefresh() {
        if (now() < cacheExpiresAt || refreshPromise)
            return;
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
exports.defaultBaselineStore = createBaselineStore({
    seed: sub_model_baselines_v3_js_1.V3_BASELINES,
    fetcher: async () => sub_model_baselines_v3_js_1.V3_BASELINES,
});
function getCachedBaselines() { return exports.defaultBaselineStore.get(); }
function getCachedBaselinesForFamily(f) { return exports.defaultBaselineStore.getForFamily(f); }
function getCachedFamilies() { return exports.defaultBaselineStore.getFamilies(); }
function invalidateBaselineCache() { exports.defaultBaselineStore.invalidate(); }
//# sourceMappingURL=sub-model-baselines-v3-store.js.map