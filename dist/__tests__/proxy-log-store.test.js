"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const proxy_log_store_js_1 = require("../proxy-log-store.js");
function tmpFile() {
    return path.join(os.tmpdir(), `probe-log-test-${Date.now()}-${Math.random().toString(36).slice(2)}.ndjson`);
}
function makeEntry(overrides = {}) {
    return {
        id: (0, proxy_log_store_js_1.makeLogId)(),
        ts: new Date().toISOString(),
        model: "test-model",
        userContent: "Hello",
        assistantContent: "Hi there",
        profile: "neutral",
        anomaly: false,
        injectionKeywordsFound: [],
        inputTokens: 5,
        outputTokens: 10,
        durationMs: 500,
        statusCode: 200,
        error: null,
        ...overrides,
    };
}
(0, vitest_1.describe)("ProxyLogStore", () => {
    let filePath;
    let store;
    (0, vitest_1.beforeEach)(() => {
        filePath = tmpFile();
        store = new proxy_log_store_js_1.ProxyLogStore(filePath);
    });
    (0, vitest_1.afterEach)(() => {
        if (fs.existsSync(filePath))
            fs.unlinkSync(filePath);
    });
    (0, vitest_1.it)("returns empty array when file does not exist", () => {
        const fresh = new proxy_log_store_js_1.ProxyLogStore(tmpFile() + "_nonexistent");
        (0, vitest_1.expect)(fresh.readAll()).toEqual([]);
    });
    (0, vitest_1.it)("appends and reads a single entry", () => {
        const entry = makeEntry({ userContent: "What is TypeScript?" });
        store.append(entry);
        const all = store.readAll();
        (0, vitest_1.expect)(all).toHaveLength(1);
        (0, vitest_1.expect)(all[0].userContent).toBe("What is TypeScript?");
        (0, vitest_1.expect)(all[0].id).toBe(entry.id);
    });
    (0, vitest_1.it)("appends multiple entries and reads them in order", () => {
        store.append(makeEntry({ userContent: "First" }));
        store.append(makeEntry({ userContent: "Second" }));
        store.append(makeEntry({ userContent: "Third" }));
        const all = store.readAll();
        (0, vitest_1.expect)(all).toHaveLength(3);
        (0, vitest_1.expect)(all[0].userContent).toBe("First");
        (0, vitest_1.expect)(all[2].userContent).toBe("Third");
    });
    (0, vitest_1.it)("readLast returns only the last N entries", () => {
        for (let i = 1; i <= 5; i++) {
            store.append(makeEntry({ userContent: `Message ${i}` }));
        }
        const last2 = store.readLast(2);
        (0, vitest_1.expect)(last2).toHaveLength(2);
        (0, vitest_1.expect)(last2[0].userContent).toBe("Message 4");
        (0, vitest_1.expect)(last2[1].userContent).toBe("Message 5");
    });
    (0, vitest_1.it)("readLast returns all entries if N > total", () => {
        store.append(makeEntry());
        store.append(makeEntry());
        (0, vitest_1.expect)(store.readLast(100)).toHaveLength(2);
    });
    (0, vitest_1.it)("entryCount reflects number of appended entries", () => {
        (0, vitest_1.expect)(store.entryCount).toBe(0);
        store.append(makeEntry());
        (0, vitest_1.expect)(store.entryCount).toBe(1);
        store.append(makeEntry());
        (0, vitest_1.expect)(store.entryCount).toBe(2);
    });
    (0, vitest_1.it)("persists entries across store instances (same file)", () => {
        store.append(makeEntry({ userContent: "Persistent message" }));
        const store2 = new proxy_log_store_js_1.ProxyLogStore(filePath);
        const all = store2.readAll();
        (0, vitest_1.expect)(all).toHaveLength(1);
        (0, vitest_1.expect)(all[0].userContent).toBe("Persistent message");
    });
    (0, vitest_1.it)("skips malformed lines without throwing", () => {
        // Write a good line, a bad line, and another good line
        fs.writeFileSync(filePath, `${JSON.stringify(makeEntry({ userContent: "GoodA" }))}\n` +
            `{THIS IS NOT JSON}\n` +
            `${JSON.stringify(makeEntry({ userContent: "GoodB" }))}\n`, "utf-8");
        const all = store.readAll();
        (0, vitest_1.expect)(all).toHaveLength(2);
        (0, vitest_1.expect)(all.map(e => e.userContent)).toEqual(["GoodA", "GoodB"]);
    });
    (0, vitest_1.it)("path property returns resolved file path", () => {
        (0, vitest_1.expect)(typeof store.path).toBe("string");
        (0, vitest_1.expect)(store.path.length).toBeGreaterThan(0);
    });
});
(0, vitest_1.describe)("makeLogId", () => {
    (0, vitest_1.it)("generates a string starting with 'plg_'", () => {
        (0, vitest_1.expect)((0, proxy_log_store_js_1.makeLogId)().startsWith("plg_")).toBe(true);
    });
    (0, vitest_1.it)("generates unique IDs", () => {
        const ids = new Set(Array.from({ length: 100 }, () => (0, proxy_log_store_js_1.makeLogId)()));
        (0, vitest_1.expect)(ids.size).toBe(100);
    });
});
//# sourceMappingURL=proxy-log-store.test.js.map