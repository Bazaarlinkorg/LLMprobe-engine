import * as http from "http";
import { ProxyLogStore, type ProxyLogEntry } from "./proxy-log-store.js";
export interface ProxyServerOptions {
    port: number;
    upstreamBaseUrl: string;
    logStore: ProxyLogStore;
    /** Called after every logged entry (for live terminal output). */
    onEntry?: (entry: ProxyLogEntry, stats: LiveStats) => void;
}
export interface LiveStats {
    total: number;
    neutralCount: number;
    neutralAnomalies: number;
    sensitiveCount: number;
    sensitiveAnomalies: number;
}
export declare function createProxyServer(opts: ProxyServerOptions): http.Server;
//# sourceMappingURL=proxy-server.d.ts.map