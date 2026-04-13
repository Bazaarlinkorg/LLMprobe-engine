"use strict";
// src/proxy-log-store.ts — Local NDJSON log store for proxy-watch (MIT)
// Persists one JSON line per request to a .ndjson file.
// No database required — grep/jq friendly.
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
exports.ProxyLogStore = void 0;
exports.makeLogId = makeLogId;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class ProxyLogStore {
    constructor(filePath) {
        this.filePath = path.resolve(filePath);
        // Ensure parent directory exists
        const dir = path.dirname(this.filePath);
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
    }
    /** Append a single log entry as one JSON line. */
    append(entry) {
        const line = JSON.stringify(entry) + "\n";
        fs.appendFileSync(this.filePath, line, "utf-8");
    }
    /** Read all log entries from the file. Returns [] if file doesn't exist. */
    readAll() {
        if (!fs.existsSync(this.filePath))
            return [];
        const raw = fs.readFileSync(this.filePath, "utf-8");
        const entries = [];
        for (const line of raw.split("\n")) {
            const trimmed = line.trim();
            if (!trimmed)
                continue;
            try {
                entries.push(JSON.parse(trimmed));
            }
            catch {
                // skip malformed lines
            }
        }
        return entries;
    }
    /** Read last N entries (efficient: reads whole file but only returns tail). */
    readLast(n) {
        const all = this.readAll();
        return all.slice(-n);
    }
    get path() {
        return this.filePath;
    }
    get entryCount() {
        return this.readAll().length;
    }
}
exports.ProxyLogStore = ProxyLogStore;
/** Generate a short unique log entry ID. */
function makeLogId() {
    const ts = Date.now();
    const rand = Math.random().toString(36).slice(2, 7);
    return `plg_${ts}_${rand}`;
}
//# sourceMappingURL=proxy-log-store.js.map