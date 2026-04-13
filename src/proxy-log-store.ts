// src/proxy-log-store.ts — Local NDJSON log store for proxy-watch (MIT)
// Persists one JSON line per request to a .ndjson file.
// No database required — grep/jq friendly.

import * as fs from "fs";
import * as path from "path";
import type { RequestProfile, ResponseAnalysis } from "./proxy-analyzer.js";

export interface ProxyLogEntry {
  id: string;            // e.g. "plg_1713890400000_abc"
  ts: string;            // ISO-8601
  model: string;
  userContent: string;
  assistantContent: string | null;
  profile: RequestProfile;
  anomaly: boolean;
  injectionKeywordsFound: string[];
  inputTokens: number | null;
  outputTokens: number | null;
  durationMs: number;
  statusCode: number;
  error: string | null;
}

export class ProxyLogStore {
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = path.resolve(filePath);
    // Ensure parent directory exists
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  /** Append a single log entry as one JSON line. */
  append(entry: ProxyLogEntry): void {
    const line = JSON.stringify(entry) + "\n";
    fs.appendFileSync(this.filePath, line, "utf-8");
  }

  /** Read all log entries from the file. Returns [] if file doesn't exist. */
  readAll(): ProxyLogEntry[] {
    if (!fs.existsSync(this.filePath)) return [];
    const raw = fs.readFileSync(this.filePath, "utf-8");
    const entries: ProxyLogEntry[] = [];
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        entries.push(JSON.parse(trimmed) as ProxyLogEntry);
      } catch {
        // skip malformed lines
      }
    }
    return entries;
  }

  /** Read last N entries (efficient: reads whole file but only returns tail). */
  readLast(n: number): ProxyLogEntry[] {
    const all = this.readAll();
    return all.slice(-n);
  }

  get path(): string {
    return this.filePath;
  }

  get entryCount(): number {
    return this.readAll().length;
  }
}

/** Generate a short unique log entry ID. */
export function makeLogId(): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 7);
  return `plg_${ts}_${rand}`;
}
