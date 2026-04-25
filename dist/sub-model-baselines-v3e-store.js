"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadV3EBaselinesFromSnapshot = loadV3EBaselinesFromSnapshot;
exports.setV3EBaselines = setV3EBaselines;
exports.getCachedV3EBaselines = getCachedV3EBaselines;
exports.clearV3ECache = clearV3ECache;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
let cached = null;
/**
 * Resolve the location of the bundled snapshot JSON. Works whether the package
 * is consumed as compiled output (`dist/baselines-v3e-snapshot.json`) or as
 * source via ts-node / Vitest (which read from `src/`).
 */
function findSnapshotPath() {
    // __dirname under CommonJS is the directory of the compiled .js. For Vitest
    // running source TS the value points at `src/__tests__/..` etc. We probe a
    // few likely locations.
    const candidates = [
        (0, node_path_1.resolve)(__dirname, "baselines-v3e-snapshot.json"),
        (0, node_path_1.resolve)(__dirname, "..", "src", "baselines-v3e-snapshot.json"),
        (0, node_path_1.resolve)(__dirname, "..", "..", "src", "baselines-v3e-snapshot.json"),
        (0, node_path_1.resolve)(process.cwd(), "src", "baselines-v3e-snapshot.json"),
        (0, node_path_1.resolve)(process.cwd(), "dist", "baselines-v3e-snapshot.json"),
    ];
    for (const p of candidates) {
        if ((0, node_fs_1.existsSync)(p))
            return p;
    }
    throw new Error("[v3e-store] baselines-v3e-snapshot.json not found. Searched: " + candidates.join(", "));
}
/**
 * Load the bundled `baselines-v3e-snapshot.json` and cache it in memory.
 * Subsequent calls return the cached array unless `setV3EBaselines` was used.
 */
function loadV3EBaselinesFromSnapshot() {
    if (cached)
        return cached;
    const path = findSnapshotPath();
    const raw = (0, node_fs_1.readFileSync)(path, "utf-8");
    const snapshot = JSON.parse(raw);
    cached = snapshot.baselines;
    return cached;
}
/** Override the cached baselines (e.g., for tests or fresh retrains). */
function setV3EBaselines(baselines) {
    cached = baselines;
}
/** Read-only view of the currently cached baselines (or empty if none loaded). */
function getCachedV3EBaselines() {
    return cached ?? [];
}
/** Reset the cache. Mainly for tests. */
function clearV3ECache() {
    cached = null;
}
//# sourceMappingURL=sub-model-baselines-v3e-store.js.map