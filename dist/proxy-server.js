"use strict";
// src/proxy-server.ts — Local transparent proxy for AC-1.b monitoring (MIT)
// Listens on localhost:PORT, forwards every /v1/chat/completions request to
// the configured upstream, logs + analyzes each exchange for injection anomalies.
// Pure Node.js 18+ — no extra dependencies.
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
exports.createProxyServer = createProxyServer;
const http = __importStar(require("http"));
const proxy_analyzer_js_1 = require("./proxy-analyzer.js");
const proxy_log_store_js_1 = require("./proxy-log-store.js");
/** Extract last user message content from messages array. */
function extractUserContent(body) {
    if (typeof body !== "object" || body === null ||
        !Array.isArray(body.messages))
        return "";
    const messages = body.messages;
    // Find last message with role=user
    for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        if (msg.role === "user") {
            if (typeof msg.content === "string")
                return msg.content;
            // Content blocks array (multimodal)
            if (Array.isArray(msg.content)) {
                return msg.content
                    .filter((b) => typeof b === "object" && b !== null && b.type === "text")
                    .map(b => b.text)
                    .join(" ");
            }
        }
    }
    return "";
}
/** Extract model string from request body. */
function extractModel(body) {
    if (typeof body !== "object" || body === null)
        return "unknown";
    return String(body.model ?? "unknown");
}
/** Accumulate in-memory live stats (reset on server restart). */
function makeLiveStats() {
    return { total: 0, neutralCount: 0, neutralAnomalies: 0, sensitiveCount: 0, sensitiveAnomalies: 0 };
}
function updateStats(stats, profile, anomaly) {
    stats.total++;
    if (profile === "neutral") {
        stats.neutralCount++;
        if (anomaly)
            stats.neutralAnomalies++;
    }
    else {
        stats.sensitiveCount++;
        if (anomaly)
            stats.sensitiveAnomalies++;
    }
}
function createProxyServer(opts) {
    const { port, upstreamBaseUrl, logStore, onEntry } = opts;
    const upstream = upstreamBaseUrl.replace(/\/$/, "");
    const liveStats = makeLiveStats();
    const server = http.createServer((req, res) => {
        const reqUrl = req.url ?? "/";
        // Health check
        if (reqUrl === "/health" || reqUrl === "/_probe_health") {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: true, upstream, stats: liveStats }));
            return;
        }
        // Only proxy /v1/* paths through; reject others
        if (!reqUrl.startsWith("/v1/")) {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: { message: `proxy-watch only handles /v1/* paths (got ${reqUrl})`, code: "not_found" } }));
            return;
        }
        const t0 = Date.now();
        // Collect request body
        const chunks = [];
        req.on("data", (chunk) => chunks.push(chunk));
        req.on("end", () => {
            const rawBody = Buffer.concat(chunks);
            let parsedBody = null;
            try {
                parsedBody = JSON.parse(rawBody.toString("utf-8"));
            }
            catch { /* non-JSON body */ }
            const userContent = extractUserContent(parsedBody);
            const model = extractModel(parsedBody);
            const profile = (0, proxy_analyzer_js_1.profileRequest)(userContent);
            // Build upstream URL: strip our /v1 prefix, use upstream base
            const upstreamPath = reqUrl.slice(3); // "/v1/chat/completions" → "/chat/completions"
            const upstreamUrl = `${upstream}${upstreamPath}`;
            // Forward headers (copy Authorization, Content-Type, custom headers)
            const forwardHeaders = {};
            for (const [k, v] of Object.entries(req.headers)) {
                if (k.toLowerCase() === "host")
                    continue; // don't forward Host
                if (typeof v === "string")
                    forwardHeaders[k] = v;
                else if (Array.isArray(v))
                    forwardHeaders[k] = v[0] ?? "";
            }
            if (rawBody.length > 0)
                forwardHeaders["content-length"] = String(rawBody.length);
            // Determine stream mode from request body
            const isStream = parsedBody !== null &&
                typeof parsedBody === "object" &&
                parsedBody.stream === true;
            const upstreamReq = makeUpstreamRequest(upstreamUrl, req.method ?? "POST", forwardHeaders, rawBody, isStream ? 300000 : 120000);
            let statusCode = 502;
            let responseHeaders = {};
            const responseChunks = [];
            let streamAccumulator = "";
            upstreamReq.on("response", (upstreamRes) => {
                statusCode = upstreamRes.statusCode ?? 502;
                responseHeaders = {};
                for (const [k, v] of Object.entries(upstreamRes.headers)) {
                    if (typeof v === "string")
                        responseHeaders[k] = v;
                    else if (Array.isArray(v))
                        responseHeaders[k] = v.join(", ");
                }
                // Forward status + headers to caller
                res.writeHead(statusCode, upstreamRes.headers);
                upstreamRes.on("data", (chunk) => {
                    responseChunks.push(chunk);
                    res.write(chunk); // forward immediately (streaming support)
                    if (isStream) {
                        streamAccumulator += chunk.toString("utf-8");
                    }
                });
                upstreamRes.on("end", () => {
                    res.end();
                    const durationMs = Date.now() - t0;
                    // Extract assistant content
                    let assistantContent = null;
                    let inputTokens = null;
                    let outputTokens = null;
                    if (isStream) {
                        assistantContent = extractAssistantFromSSE(streamAccumulator);
                        const usageData = extractUsageFromSSE(streamAccumulator);
                        inputTokens = usageData?.prompt_tokens ?? null;
                        outputTokens = usageData?.completion_tokens ?? null;
                    }
                    else {
                        const rawResp = Buffer.concat(responseChunks).toString("utf-8");
                        try {
                            const parsed = JSON.parse(rawResp);
                            assistantContent = parsed.choices?.[0]?.message?.content ?? null;
                            inputTokens = parsed.usage?.prompt_tokens ?? null;
                            outputTokens = parsed.usage?.completion_tokens ?? null;
                        }
                        catch { /* non-JSON response */ }
                    }
                    const analysis = assistantContent ? (0, proxy_analyzer_js_1.analyzeResponse)(assistantContent) : { anomaly: false, injectionKeywordsFound: [] };
                    const entry = {
                        id: (0, proxy_log_store_js_1.makeLogId)(),
                        ts: new Date().toISOString(),
                        model,
                        userContent: userContent.slice(0, 2000),
                        assistantContent: assistantContent ? assistantContent.slice(0, 4000) : null,
                        profile,
                        anomaly: analysis.anomaly,
                        injectionKeywordsFound: analysis.injectionKeywordsFound,
                        inputTokens,
                        outputTokens,
                        durationMs,
                        statusCode,
                        error: null,
                    };
                    logStore.append(entry);
                    updateStats(liveStats, profile, analysis.anomaly);
                    onEntry?.(entry, { ...liveStats });
                });
                upstreamRes.on("error", (err) => {
                    res.end();
                    logErrorEntry(err.message, model, userContent, profile, t0, logStore, liveStats, onEntry);
                });
            });
            upstreamReq.on("error", (err) => {
                if (!res.headersSent) {
                    res.writeHead(502, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ error: { message: `Upstream error: ${err.message}`, code: "upstream_error" } }));
                }
                logErrorEntry(err.message, model, userContent, profile, t0, logStore, liveStats, onEntry);
            });
            upstreamReq.end(rawBody);
        });
    });
    server.listen(port);
    return server;
}
// ── Helpers ───────────────────────────────────────────────────────────────
function makeUpstreamRequest(url, method, headers, body, timeoutMs) {
    const parsed = new URL(url);
    const isHttps = parsed.protocol === "https:";
    const options = {
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method,
        headers,
        timeout: timeoutMs,
    };
    if (isHttps) {
        // Dynamic import avoided — use https module
        const https = require("https");
        return https.request(options);
    }
    return http.request(options);
}
function extractAssistantFromSSE(raw) {
    let content = "";
    for (const line of raw.split("\n")) {
        if (!line.startsWith("data: "))
            continue;
        const payload = line.slice(6).trim();
        if (payload === "[DONE]")
            continue;
        try {
            const chunk = JSON.parse(payload);
            const delta = chunk.choices?.[0]?.delta?.content;
            if (delta)
                content += delta;
        }
        catch { /* ignore */ }
    }
    return content;
}
function extractUsageFromSSE(raw) {
    for (const line of raw.split("\n").reverse()) {
        if (!line.startsWith("data: "))
            continue;
        const payload = line.slice(6).trim();
        if (payload === "[DONE]")
            continue;
        try {
            const chunk = JSON.parse(payload);
            if (chunk.usage)
                return chunk.usage;
        }
        catch { /* ignore */ }
    }
    return null;
}
function logErrorEntry(errorMsg, model, userContent, profile, t0, logStore, liveStats, onEntry) {
    const entry = {
        id: (0, proxy_log_store_js_1.makeLogId)(),
        ts: new Date().toISOString(),
        model,
        userContent: userContent.slice(0, 2000),
        assistantContent: null,
        profile,
        anomaly: false,
        injectionKeywordsFound: [],
        inputTokens: null,
        outputTokens: null,
        durationMs: Date.now() - t0,
        statusCode: 502,
        error: errorMsg.slice(0, 200),
    };
    logStore.append(entry);
    updateStats(liveStats, profile, false);
    onEntry?.(entry, { ...liveStats });
}
//# sourceMappingURL=proxy-server.js.map