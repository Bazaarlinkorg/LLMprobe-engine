import type { RequestProfile } from "./proxy-analyzer.js";
export interface ProxyLogEntry {
    id: string;
    ts: string;
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
export declare class ProxyLogStore {
    private readonly filePath;
    constructor(filePath: string);
    /** Append a single log entry as one JSON line. */
    append(entry: ProxyLogEntry): void;
    /** Read all log entries from the file. Returns [] if file doesn't exist. */
    readAll(): ProxyLogEntry[];
    /** Read last N entries (efficient: reads whole file but only returns tail). */
    readLast(n: number): ProxyLogEntry[];
    get path(): string;
    get entryCount(): number;
}
/** Generate a short unique log entry ID. */
export declare function makeLogId(): string;
//# sourceMappingURL=proxy-log-store.d.ts.map