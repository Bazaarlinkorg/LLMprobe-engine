// src/proxy-server.ts — Local transparent proxy for AC-1.b monitoring (MIT)
// Listens on localhost:PORT, forwards every /v1/chat/completions request to
// the configured upstream, logs + analyzes each exchange for injection anomalies.
// Pure Node.js 18+ — no extra dependencies.

import * as http from "http";
import { profileRequest, analyzeResponse, type RequestProfile } from "./proxy-analyzer.js";
import { ProxyLogStore, makeLogId, type ProxyLogEntry } from "./proxy-log-store.js";

export interface ProxyServerOptions {
  port: number;
  upstreamBaseUrl: string;   // e.g. "https://openrouter.ai/api/v1"
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

/** Extract last user message content from messages array. */
function extractUserContent(body: unknown): string {
  if (
    typeof body !== "object" || body === null ||
    !Array.isArray((body as Record<string, unknown>).messages)
  ) return "";
  const messages = (body as { messages: Array<{ role?: string; content?: unknown }> }).messages;
  // Find last message with role=user
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role === "user") {
      if (typeof msg.content === "string") return msg.content;
      // Content blocks array (multimodal)
      if (Array.isArray(msg.content)) {
        return msg.content
          .filter((b): b is { type: string; text: string } => typeof b === "object" && b !== null && (b as Record<string, unknown>).type === "text")
          .map(b => b.text)
          .join(" ");
      }
    }
  }
  return "";
}

/** Extract model string from request body. */
function extractModel(body: unknown): string {
  if (typeof body !== "object" || body === null) return "unknown";
  return String((body as Record<string, unknown>).model ?? "unknown");
}

/** Accumulate in-memory live stats (reset on server restart). */
function makeLiveStats(): LiveStats {
  return { total: 0, neutralCount: 0, neutralAnomalies: 0, sensitiveCount: 0, sensitiveAnomalies: 0 };
}

function updateStats(stats: LiveStats, profile: RequestProfile, anomaly: boolean): void {
  stats.total++;
  if (profile === "neutral") {
    stats.neutralCount++;
    if (anomaly) stats.neutralAnomalies++;
  } else {
    stats.sensitiveCount++;
    if (anomaly) stats.sensitiveAnomalies++;
  }
}

export function createProxyServer(opts: ProxyServerOptions): http.Server {
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
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const rawBody = Buffer.concat(chunks);
      let parsedBody: unknown = null;
      try { parsedBody = JSON.parse(rawBody.toString("utf-8")); } catch { /* non-JSON body */ }

      const userContent = extractUserContent(parsedBody);
      const model       = extractModel(parsedBody);
      const profile     = profileRequest(userContent);

      // Build upstream URL: strip our /v1 prefix, use upstream base
      const upstreamPath = reqUrl.slice(3); // "/v1/chat/completions" → "/chat/completions"
      const upstreamUrl  = `${upstream}${upstreamPath}`;

      // Forward headers (copy Authorization, Content-Type, custom headers)
      const forwardHeaders: Record<string, string> = {};
      for (const [k, v] of Object.entries(req.headers)) {
        if (k.toLowerCase() === "host") continue; // don't forward Host
        if (typeof v === "string") forwardHeaders[k] = v;
        else if (Array.isArray(v)) forwardHeaders[k] = v[0] ?? "";
      }
      if (rawBody.length > 0) forwardHeaders["content-length"] = String(rawBody.length);

      // Determine stream mode from request body
      const isStream = parsedBody !== null &&
        typeof parsedBody === "object" &&
        (parsedBody as Record<string, unknown>).stream === true;

      const upstreamReq = makeUpstreamRequest(upstreamUrl, req.method ?? "POST", forwardHeaders, rawBody, isStream ? 300_000 : 120_000);

      let statusCode = 502;
      let responseHeaders: Record<string, string> = {};
      const responseChunks: Buffer[] = [];
      let streamAccumulator = "";

      upstreamReq.on("response", (upstreamRes) => {
        statusCode = upstreamRes.statusCode ?? 502;
        responseHeaders = {};
        for (const [k, v] of Object.entries(upstreamRes.headers)) {
          if (typeof v === "string") responseHeaders[k] = v;
          else if (Array.isArray(v)) responseHeaders[k] = v.join(", ");
        }

        // Forward status + headers to caller
        res.writeHead(statusCode, upstreamRes.headers);

        upstreamRes.on("data", (chunk: Buffer) => {
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
          let assistantContent: string | null = null;
          let inputTokens: number | null = null;
          let outputTokens: number | null = null;

          if (isStream) {
            assistantContent = extractAssistantFromSSE(streamAccumulator);
            const usageData = extractUsageFromSSE(streamAccumulator);
            inputTokens  = usageData?.prompt_tokens    ?? null;
            outputTokens = usageData?.completion_tokens ?? null;
          } else {
            const rawResp = Buffer.concat(responseChunks).toString("utf-8");
            try {
              const parsed = JSON.parse(rawResp) as {
                choices?: Array<{ message?: { content?: string } }>;
                usage?: { prompt_tokens?: number; completion_tokens?: number };
              };
              assistantContent = parsed.choices?.[0]?.message?.content ?? null;
              inputTokens  = parsed.usage?.prompt_tokens    ?? null;
              outputTokens = parsed.usage?.completion_tokens ?? null;
            } catch { /* non-JSON response */ }
          }

          const analysis = assistantContent ? analyzeResponse(assistantContent) : { anomaly: false, injectionKeywordsFound: [] };

          const entry: ProxyLogEntry = {
            id: makeLogId(),
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

function makeUpstreamRequest(
  url: string,
  method: string,
  headers: Record<string, string>,
  body: Buffer,
  timeoutMs: number,
): http.ClientRequest {
  const parsed = new URL(url);
  const isHttps = parsed.protocol === "https:";

  const options: http.RequestOptions = {
    hostname: parsed.hostname,
    port: parsed.port || (isHttps ? 443 : 80),
    path: parsed.pathname + parsed.search,
    method,
    headers,
    timeout: timeoutMs,
  };

  if (isHttps) {
    // Dynamic import avoided — use https module
    const https = require("https") as typeof import("https");
    return https.request(options);
  }
  return http.request(options);
}

function extractAssistantFromSSE(raw: string): string {
  let content = "";
  for (const line of raw.split("\n")) {
    if (!line.startsWith("data: ")) continue;
    const payload = line.slice(6).trim();
    if (payload === "[DONE]") continue;
    try {
      const chunk = JSON.parse(payload) as { choices?: Array<{ delta?: { content?: string } }> };
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) content += delta;
    } catch { /* ignore */ }
  }
  return content;
}

function extractUsageFromSSE(raw: string): { prompt_tokens?: number; completion_tokens?: number } | null {
  for (const line of raw.split("\n").reverse()) {
    if (!line.startsWith("data: ")) continue;
    const payload = line.slice(6).trim();
    if (payload === "[DONE]") continue;
    try {
      const chunk = JSON.parse(payload) as { usage?: { prompt_tokens?: number; completion_tokens?: number } };
      if (chunk.usage) return chunk.usage;
    } catch { /* ignore */ }
  }
  return null;
}

function logErrorEntry(
  errorMsg: string,
  model: string,
  userContent: string,
  profile: RequestProfile,
  t0: number,
  logStore: ProxyLogStore,
  liveStats: LiveStats,
  onEntry?: ProxyServerOptions["onEntry"],
): void {
  const entry: ProxyLogEntry = {
    id: makeLogId(),
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
