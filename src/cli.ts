#!/usr/bin/env node
// src/cli.ts — CLI entry point for @bazaarlink/probe-engine (MIT)

import { Command } from "commander";
import { runProbes, type ProbeResult, type BaselineMap } from "./runner.js";
import { runCanary } from "./canary-runner.js";
import { PROBE_SUITE } from "./probe-suite.js";
import { createProxyServer } from "./proxy-server.js";
import { ProxyLogStore } from "./proxy-log-store.js";
import { computeAc1b, statsFromLogs } from "./proxy-analyzer.js";
import type { ProxyLogEntry, } from "./proxy-log-store.js";
import type { LiveStats } from "./proxy-server.js";
import * as fs from "fs";
import * as path from "path";

const PASS_ICON  = "✓";
const WARN_ICON  = "⚠";
const FAIL_ICON  = "✗";
const ERROR_ICON = "E";
const SKIP_ICON  = "-";

function icon(r: ProbeResult): string {
  if (r.status === "error") return ERROR_ICON;
  if (r.status === "skipped") return SKIP_ICON;
  if (r.passed === true) return PASS_ICON;
  if (r.passed === "warning") return WARN_ICON;
  if (r.passed === false) return FAIL_ICON;
  return "?";
}

function color(r: ProbeResult, text: string): string {
  if (!process.stdout.isTTY) return text;
  if (r.status === "error" || r.passed === false) return `\x1b[31m${text}\x1b[0m`;
  if (r.passed === true) return `\x1b[32m${text}\x1b[0m`;
  if (r.passed === "warning") return `\x1b[33m${text}\x1b[0m`;
  return `\x1b[90m${text}\x1b[0m`;
}

const program = new Command();

program
  .name("bazaarlink-probe")
  .description("Run OpenAI-compatible API quality & integrity probes")
  .version("0.4.0");

program
  .command("run")
  .description("Run the full probe suite against an endpoint")
  .requiredOption("--base-url <url>", "Base URL of the OpenAI-compatible endpoint (e.g. https://api.example.com/v1)")
  .requiredOption("--api-key <key>", "API key for the endpoint")
  .requiredOption("--model <id>", "Model ID to test (e.g. claude-opus-4-6-thinking)")
  .option("--include-optional", "Also run optional probes (context length test)", false)
  .option("--timeout <ms>", "Per-probe timeout in milliseconds", "180000")
  .option("--output <file>", "Write JSON report to file (default: print to stdout)")
  .option("--baseline <file>", "Path to baseline JSON file (from collect-baseline or BazaarLink download)")
  .option("--fetch-baseline <url>", "BazaarLink base URL to fetch official baselines (e.g. https://bazaarlink.net)")
  .option("--baseline-model <id>", "Model ID to use when fetching baselines (default: same as --model)")
  .option("--judge-base-url <url>", "Judge endpoint base URL (enables llm_judge scoring)")
  .option("--judge-api-key <key>", "Judge endpoint API key")
  .option("--judge-model <id>", "Judge model ID")
  .option("--judge-threshold <n>", "Judge score threshold 1-10 (default: 7)", "7")
  .option("--claimed-model <model>", "Model name the vendor claims — used for identity verification")
  .option("--quiet", "Suppress per-probe progress output", false)
  .action(async (opts: {
    baseUrl: string;
    apiKey: string;
    model: string;
    includeOptional: boolean;
    timeout: string;
    output?: string;
    baseline?: string;
    fetchBaseline?: string;
    baselineModel?: string;
    judgeBaseUrl?: string;
    judgeApiKey?: string;
    judgeModel?: string;
    judgeThreshold: string;
    claimedModel?: string;
    quiet: boolean;
  }) => {
    const timeoutMs = parseInt(opts.timeout, 10) || 180_000;
    const judgeThreshold = parseInt(opts.judgeThreshold, 10) || 7;

    const judge = opts.judgeBaseUrl && opts.judgeApiKey && opts.judgeModel
      ? { baseUrl: opts.judgeBaseUrl, apiKey: opts.judgeApiKey, modelId: opts.judgeModel, threshold: judgeThreshold }
      : undefined;

    // ── Load baseline ────────────────────────────────────────────────────────
    let baseline: BaselineMap | undefined;

    if (opts.baseline) {
      try {
        const raw = JSON.parse(fs.readFileSync(opts.baseline, "utf-8")) as { probes?: Array<{ probeId: string; responseText: string }> };
        if (raw.probes && Array.isArray(raw.probes)) {
          baseline = Object.fromEntries(raw.probes.map((p) => [p.probeId, p.responseText]));
          if (!opts.quiet) console.error(`  Baseline  : loaded ${Object.keys(baseline).length} entries from ${opts.baseline}`);
        } else {
          console.error(`  Warning: baseline file has unexpected format (expected { probes: [...] })`);
        }
      } catch (e) {
        console.error(`  Error reading baseline file: ${(e as Error).message}`);
        process.exit(1);
      }
    } else if (opts.fetchBaseline) {
      const baselineModelId = opts.baselineModel ?? opts.model;
      const url = `${opts.fetchBaseline.replace(/\/$/, "")}/api/probe/baselines?modelId=${encodeURIComponent(baselineModelId)}`;
      if (!opts.quiet) console.error(`  Baseline  : fetching from ${url}`);
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
        if (!res.ok) {
          if (res.status === 404) {
            console.error(`  Warning: no BazaarLink baseline found for model '${baselineModelId}' — llm_judge probes will be skipped`);
          } else {
            console.error(`  Warning: baseline fetch failed (HTTP ${res.status}) — llm_judge probes will be skipped`);
          }
        } else {
          const data = await res.json() as { probes?: Array<{ probeId: string; responseText: string }> };
          if (data.probes && Array.isArray(data.probes)) {
            baseline = Object.fromEntries(data.probes.map((p) => [p.probeId, p.responseText]));
            if (!opts.quiet) console.error(`  Baseline  : downloaded ${Object.keys(baseline).length} entries for '${baselineModelId}'`);
          }
        }
      } catch (e) {
        console.error(`  Warning: baseline fetch error: ${(e as Error).message} — llm_judge probes will be skipped`);
      }
    }

    if (!opts.quiet) {
      console.error(`\nBazaarLink Probe Engine`);
      console.error(`  Endpoint : ${opts.baseUrl}`);
      console.error(`  Model    : ${opts.model}`);
      if (judge) console.error(`  Judge    : ${judge.modelId} @ ${judge.baseUrl} (threshold ${judge.threshold})`);
      if (!baseline && judge) console.error(`  Baseline : none — llm_judge probes will return null`);
      console.error(`  Timeout  : ${timeoutMs}ms per probe\n`);
    }

    if (!opts.quiet && opts.claimedModel) {
      console.error(`  Claimed  : ${opts.claimedModel}`);
    }

    const report = await runProbes({
      baseUrl: opts.baseUrl,
      apiKey: opts.apiKey,
      modelId: opts.model,
      includeOptional: opts.includeOptional,
      timeoutMs,
      judge,
      baseline,
      claimedModel: opts.claimedModel,
      onProgress: (result, index, total) => {
        if (!opts.quiet) {
          const ic = icon(result);
          const label = result.label.padEnd(24);
          const reason = result.passReason ?? result.error ?? "";
          const dur = result.durationMs !== null ? `${(result.durationMs / 1000).toFixed(1)}s` : "---";
          console.error(color(result, `  [${index}/${total}] ${ic} ${label} ${dur.padStart(6)}  ${reason.slice(0, 70)}`));
        }
      },
    });

    // ── Summary ──────────────────────────────────────────────────────────────
    if (!opts.quiet) {
      const passed  = report.results.filter(r => r.passed === true).length;
      const warning = report.results.filter(r => r.passed === "warning").length;
      const failed  = report.results.filter(r => r.passed === false || r.status === "error").length;
      const total   = report.results.length;

      console.error(`\n${"─".repeat(60)}`);
      console.error(`  Score     : ${report.score}${report.score !== report.scoreMax ? `–${report.scoreMax}` : ""} / 100`);
      console.error(`  Results   : ${passed} passed  ${warning} warning  ${failed} failed  (${total} total)`);
      if (report.totalInputTokens) console.error(`  Tokens in : ${report.totalInputTokens}`);
      if (report.totalOutputTokens) console.error(`  Tokens out: ${report.totalOutputTokens}`);

      if (report.identityAssessment) {
        const ia = report.identityAssessment;
        const statusIcon = ia.status === "match" ? PASS_ICON : ia.status === "mismatch" ? FAIL_ICON : "?";
        console.error(`\n  Identity  : ${statusIcon} ${ia.status.toUpperCase()} (confidence: ${(ia.confidence * 100).toFixed(0)}%)`);
        if (ia.claimedModel) console.error(`  Claimed   : ${ia.claimedModel}`);
        if (ia.predictedFamily) console.error(`  Detected  : ${ia.predictedFamily}`);
        if (ia.predictedCandidates.length > 0) {
          console.error(`  Candidates:`);
          for (const c of ia.predictedCandidates) {
            console.error(`    ${(c.score * 100).toFixed(0).padStart(3)}%  ${c.model}`);
          }
        }
        if (ia.evidence.length > 0) {
          console.error(`  Evidence  :`);
          for (const e of ia.evidence) console.error(`    • ${e}`);
        }
        if (ia.riskFlags.length > 0) {
          console.error(`  Risk flags: ${ia.riskFlags.length} endpoint anomalies reduce confidence`);
          for (const f of ia.riskFlags.slice(0, 3)) console.error(`    ${WARN_ICON} ${f.slice(0, 80)}`);
        }
      }

      console.error(`${"─".repeat(60)}\n`);
    }

    const json = JSON.stringify(report, null, 2);

    if (opts.output) {
      fs.writeFileSync(opts.output, json, "utf-8");
      if (!opts.quiet) console.error(`  Report saved to ${opts.output}`);
    } else {
      console.log(json);
    }

    // Exit with non-zero if score < 50
    process.exit(report.score < 50 ? 1 : 0);
  });

// ── collect-baseline command ──────────────────────────────────────────────────

program
  .command("collect-baseline")
  .description("Run probes against a trusted endpoint to build a local baseline file")
  .requiredOption("--base-url <url>", "Base URL of the trusted OpenAI-compatible endpoint")
  .requiredOption("--api-key <key>", "API key for the endpoint")
  .requiredOption("--model <id>", "Model ID to collect responses for")
  .requiredOption("--output <file>", "Output JSON file path (e.g. baseline-gpt4o.json)")
  .option("--timeout <ms>", "Per-probe timeout in milliseconds", "180000")
  .option("--quiet", "Suppress per-probe progress output", false)
  .action(async (opts: {
    baseUrl: string;
    apiKey: string;
    model: string;
    output: string;
    timeout: string;
    quiet: boolean;
  }) => {
    const timeoutMs = parseInt(opts.timeout, 10) || 180_000;
    const chatUrl = `${opts.baseUrl.replace(/\/$/, "")}/chat/completions`;

    // Only collect probes that use normal streaming (skip consistency/context tests)
    const probes = PROBE_SUITE.filter(
      (p) => !p.optional && p.scoring !== "consistency_check" && p.scoring !== "context_check"
    );

    if (!opts.quiet) {
      console.error(`\nBazaarLink Probe Engine — collect-baseline`);
      console.error(`  Endpoint : ${opts.baseUrl}`);
      console.error(`  Model    : ${opts.model}`);
      console.error(`  Probes   : ${probes.length}`);
      console.error(`  Output   : ${opts.output}\n`);
    }

    const collected: Array<{ probeId: string; responseText: string; updatedAt: string }> = [];
    let idx = 0;

    for (const probe of probes) {
      idx++;
      try {
        const res = await fetch(chatUrl, {
          method: "POST",
          headers: { Authorization: `Bearer ${opts.apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: opts.model,
            messages: [{ role: "user", content: probe.prompt }],
            stream: true,
            stream_options: { include_usage: true },
            max_tokens: probe.scoring === "exact_match" ? 512 : 4096,
            temperature: 0,
          }),
          signal: AbortSignal.timeout(timeoutMs),
        });

        if (!res.ok || !res.body) {
          console.error(`  [${idx}/${probes.length}] SKIP ${probe.id} — HTTP ${res.status}`);
          continue;
        }

        let responseText = "";
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6).trim();
            if (payload === "[DONE]") continue;
            try {
              const chunk = JSON.parse(payload) as { choices?: Array<{ delta?: { content?: string } }> };
              const delta = chunk.choices?.[0]?.delta?.content;
              if (delta) responseText += delta;
            } catch { /* ignore */ }
          }
        }

        if (!responseText) {
          if (!opts.quiet) console.error(`  [${idx}/${probes.length}] SKIP ${probe.id} — empty response`);
          continue;
        }

        collected.push({ probeId: probe.id, responseText, updatedAt: new Date().toISOString() });
        if (!opts.quiet) console.error(`  [${idx}/${probes.length}] OK   ${probe.id} (${responseText.length} chars)`);
      } catch (e) {
        console.error(`  [${idx}/${probes.length}] ERR  ${probe.id} — ${(e as Error).message?.slice(0, 80)}`);
      }
    }

    const output = {
      modelId: opts.model,
      collectedAt: new Date().toISOString(),
      probes: collected,
    };

    fs.writeFileSync(opts.output, JSON.stringify(output, null, 2), "utf-8");

    if (!opts.quiet) {
      console.error(`\n  Collected ${collected.length}/${probes.length} probe baselines`);
      console.error(`  Saved to  ${opts.output}\n`);
    }

    process.exit(collected.length === 0 ? 1 : 0);
  });


// ── proxy-watch command ───────────────────────────────────────────────────────

program
  .command("proxy-watch")
  .description("Start a local transparent proxy that logs & analyzes every request for AC-1.b conditional injection")
  .requiredOption("--upstream <url>", "Upstream API base URL to proxy (e.g. https://openrouter.ai/api/v1)")
  .option("--port <n>", "Local port to listen on (default: 8787)", "8787")
  .option("--log-file <path>", "Path to NDJSON log file (default: ./proxy-watch.ndjson)", "./proxy-watch.ndjson")
  .option("--report-file <path>", "Write a final summary report to this file on exit (optional)")
  .option("--alert-on-suspected", "Print a prominent ALERT and exit code 2 if AC-1.b detects conditional injection", false)
  .action((opts: {
    upstream: string;
    port: string;
    logFile: string;
    reportFile?: string;
    alertOnSuspected: boolean;
  }) => {
    const port      = parseInt(opts.port, 10) || 8787;
    const logFile   = path.resolve(opts.logFile);
    const isTTY     = process.stderr.isTTY;

    const logStore = new ProxyLogStore(logFile);

    const prevCount = logStore.entryCount;
    if (prevCount > 0) {
      console.error(`  Log file  : ${logFile} (resuming, ${prevCount} existing entries)`);
    }

    function colorVerdict(verdict: string): string {
      if (!isTTY) return verdict;
      if (verdict === "conditional_injection_suspected") return `\x1b[31;1m${verdict}\x1b[0m`;
      if (verdict === "no_conditional_injection")        return `\x1b[32m${verdict}\x1b[0m`;
      return `\x1b[90m${verdict}\x1b[0m`;
    }

    function printEntry(entry: ProxyLogEntry, stats: LiveStats): void {
      const ts       = new Date(entry.ts).toTimeString().slice(0, 8);
      const profile  = entry.profile === "sensitive"
        ? (isTTY ? `\x1b[33msensitive\x1b[0m` : "sensitive")
        : "neutral  ";
      const anomaly  = entry.anomaly
        ? (isTTY ? `\x1b[31m⚠ anomaly\x1b[0m` : "⚠ anomaly")
        : "✓ clean  ";
      const model    = entry.model.slice(0, 30).padEnd(30);
      const dur      = `${entry.durationMs}ms`.padStart(7);

      console.error(`  ${ts}  ${profile}  ${anomaly}  ${model}  ${dur}`);

      if (entry.anomaly && entry.injectionKeywordsFound.length > 0) {
        console.error(`           ↳ keywords: ${entry.injectionKeywordsFound.slice(0, 5).join(", ")}`);
      }

      // Print AC-1.b status every 5 requests
      if (stats.total > 0 && stats.total % 5 === 0) {
        const allLogs = logStore.readAll();
        const ac1bStats = statsFromLogs(allLogs);
        const { verdict, reason } = computeAc1b(ac1bStats);
        console.error(`\n  AC-1.b [${stats.total} req]: ${colorVerdict(verdict)}`);
        console.error(`           ${reason}\n`);
      }
    }

    console.error(`\nBazaarLink Probe Engine — proxy-watch`);
    console.error(`  Upstream  : ${opts.upstream}`);
    console.error(`  Listen    : http://localhost:${port}/v1`);
    console.error(`  Log file  : ${logFile}`);
    if (opts.reportFile) console.error(`  Report    : ${opts.reportFile}`);
    console.error(`${"─".repeat(60)}`);
    console.error(`  Point your app's base_url at: http://localhost:${port}/v1`);
    console.error(`  Your API key passes through unchanged.`);
    console.error(`  Ctrl+C to stop and see final AC-1.b summary.\n`);
    console.error(`  Time      Profile     Status     Model                           Duration`);
    console.error(`  ${"─".repeat(72)}`);

    const server = createProxyServer({
      port,
      upstreamBaseUrl: opts.upstream,
      logStore,
      onEntry: printEntry,
    });

    server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        console.error(`\nError: Port ${port} is already in use. Try --port <other-port>\n`);
        process.exit(1);
      }
      throw err;
    });

    // Graceful shutdown: print final report on SIGINT
    let shuttingDown = false;
    function shutdown(): void {
      if (shuttingDown) return;
      shuttingDown = true;

      console.error(`\n${"─".repeat(60)}`);
      console.error(`  proxy-watch stopped.\n`);

      const allLogs = logStore.readAll();
      const sessionLogs = allLogs;
      const ac1bStats = statsFromLogs(sessionLogs);
      const { verdict, reason } = computeAc1b(ac1bStats);

      console.error(`  AC-1.b Assessment`);
      console.error(`  Verdict   : ${colorVerdict(verdict)}`);
      console.error(`  Reason    : ${reason}`);
      console.error(`  Neutral   : ${ac1bStats.neutralCount} requests, ${ac1bStats.neutralAnomalies} anomalies`);
      console.error(`  Sensitive : ${ac1bStats.sensitiveCount} requests, ${ac1bStats.sensitiveAnomalies} anomalies`);
      console.error(`  Total     : ${sessionLogs.length} requests logged`);
      console.error(`  Log file  : ${logFile}`);
      console.error(`${"─".repeat(60)}\n`);

      // Write optional report file
      if (opts.reportFile) {
        const report = {
          endedAt: new Date().toISOString(),
          upstream: opts.upstream,
          logFile,
          totalRequests: sessionLogs.length,
          ac1b: { verdict, reason, ...ac1bStats },
          recentLogs: sessionLogs.slice(-20).map(e => ({
            ts: e.ts, model: e.model, profile: e.profile,
            anomaly: e.anomaly, keywords: e.injectionKeywordsFound,
            statusCode: e.statusCode, durationMs: e.durationMs,
          })),
        };
        fs.writeFileSync(path.resolve(opts.reportFile), JSON.stringify(report, null, 2), "utf-8");
        console.error(`  Report saved to ${opts.reportFile}\n`);
      }

      server.close(() => {
        const exitCode = opts.alertOnSuspected && verdict === "conditional_injection_suspected" ? 2 : 0;
        process.exit(exitCode);
      });
    }

    process.on("SIGINT",  shutdown);
    process.on("SIGTERM", shutdown);
  });

program
  .command("monitor")
  .description("Repeatedly run the probe suite and track score over time")
  .requiredOption("--base-url <url>", "Base URL of the OpenAI-compatible endpoint")
  .requiredOption("--api-key <key>", "API key for the endpoint")
  .requiredOption("--model <id>", "Model ID to test")
  .option("--interval <seconds>", "Seconds between probe runs (default: 300)", "300")
  .option("--runs <n>", "Stop after N runs (default: unlimited)", "0")
  .option("--alert-below <score>", "Print ALERT and exit with code 2 if score drops below this (default: 60)", "60")
  .option("--timeout <ms>", "Per-probe timeout in milliseconds (default: 180000)", "180000")
  .option("--history-file <path>", "Append each run's summary as JSON lines to this file")
  .option("--baseline <file>", "Path to baseline JSON file (enables llm_judge scoring)")
  .option("--judge-base-url <url>", "Judge endpoint base URL")
  .option("--judge-api-key <key>", "Judge endpoint API key")
  .option("--judge-model <id>", "Judge model ID")
  .option("--judge-threshold <n>", "Judge score threshold 1-10 (default: 7)", "7")
  .option("--claimed-model <model>", "Model name the vendor claims — used for identity verification")
  .action(async (opts: {
    baseUrl: string;
    apiKey: string;
    model: string;
    interval: string;
    runs: string;
    alertBelow: string;
    timeout: string;
    historyFile?: string;
    baseline?: string;
    judgeBaseUrl?: string;
    judgeApiKey?: string;
    judgeModel?: string;
    judgeThreshold: string;
    claimedModel?: string;
  }) => {
    const intervalMs  = (parseInt(opts.interval,      10) || 300)    * 1000;
    const maxRuns     =  parseInt(opts.runs,           10) || 0;
    const alertBelow  =  parseInt(opts.alertBelow,     10) ?? 60;
    const timeoutMs   =  parseInt(opts.timeout,        10) || 180_000;
    const judgeThreshold = parseInt(opts.judgeThreshold, 10) || 7;
    const isTTY       = process.stdout.isTTY;

    const judge = opts.judgeBaseUrl && opts.judgeApiKey && opts.judgeModel
      ? { baseUrl: opts.judgeBaseUrl, apiKey: opts.judgeApiKey, modelId: opts.judgeModel, threshold: judgeThreshold }
      : undefined;

    // Load local baseline if provided
    let baseline: BaselineMap | undefined;
    if (opts.baseline) {
      try {
        const raw = JSON.parse(fs.readFileSync(opts.baseline, "utf-8")) as { probes?: Array<{ probeId: string; responseText: string }> };
        if (raw.probes) {
          baseline = Object.fromEntries(raw.probes.map(p => [p.probeId, p.responseText]));
        }
      } catch (e) {
        console.error(`  Error reading baseline: ${(e as Error).message}`);
        process.exit(1);
      }
    }

    console.error(`\nBazaarLink Probe Engine — monitor`);
    console.error(`  Endpoint  : ${opts.baseUrl}`);
    console.error(`  Model     : ${opts.model}`);
    console.error(`  Interval  : ${opts.interval}s`);
    if (maxRuns > 0) console.error(`  Max runs  : ${maxRuns}`);
    console.error(`  Alert if  : score < ${alertBelow}`);
    if (opts.historyFile) console.error(`  History   : ${opts.historyFile}`);
    console.error(`${"─".repeat(60)}`);

    const history: Array<{ runAt: string; score: number; scoreMax: number; durationMs: number }> = [];
    let runCount = 0;
    let lastAlertScore = Infinity;

    // Column header
    const padR = (s: string, n: number) => s.padEnd(n);
    const padL = (s: string, n: number) => s.padStart(n);
    console.error(`\n  ${"#".padEnd(4)} ${"Time".padEnd(8)} ${"Score".padStart(9)} ${"Δ".padStart(5)}  ${"P".padStart(3)} ${"W".padStart(3)} ${"F".padStart(3)}  Duration`);
    console.error(`  ${"─".repeat(52)}`);

    async function runOnce(): Promise<void> {
      runCount++;
      const t0 = Date.now();

      const report = await runProbes({
        baseUrl: opts.baseUrl,
        apiKey: opts.apiKey,
        modelId: opts.model,
        timeoutMs,
        judge,
        baseline,
        claimedModel: opts.claimedModel,
      });

      const elapsedMs = Date.now() - t0;
      const now = new Date();
      const timeStr = now.toTimeString().slice(0, 8);

      const passed  = report.results.filter(r => r.passed === true).length;
      const warning = report.results.filter(r => r.passed === "warning").length;
      const failed  = report.results.filter(r => r.passed === false || r.status === "error").length;

      const prev    = history.length > 0 ? history[history.length - 1].score : null;
      const delta   = prev !== null ? report.score - prev : null;
      const deltaStr = delta !== null
        ? (delta > 0 ? `+${delta}` : String(delta))
        : "  --";

      // Score range display: "72" or "60-80"
      const scoreDisp = report.score !== report.scoreMax
        ? `${report.score}–${report.scoreMax}`
        : String(report.score);

      // Color coding for TTY
      const scoreColor = isTTY
        ? report.score >= alertBelow
          ? `\x1b[32m${scoreDisp.padStart(9)}\x1b[0m`
          : `\x1b[31m${scoreDisp.padStart(9)}\x1b[0m`
        : scoreDisp.padStart(9);

      const deltaColor = isTTY && delta !== null
        ? delta > 0
          ? `\x1b[32m${deltaStr.padStart(5)}\x1b[0m`
          : delta < 0
            ? `\x1b[31m${deltaStr.padStart(5)}\x1b[0m`
            : deltaStr.padStart(5)
        : deltaStr.padStart(5);

      const durStr = `${(elapsedMs / 1000).toFixed(1)}s`;

      console.error(
        `  ${String(runCount).padEnd(4)} ${timeStr} ${scoreColor} ${deltaColor}  ` +
        `${String(passed).padStart(3)} ${String(warning).padStart(3)} ${String(failed).padStart(3)}  ${durStr}`
      );

      // Identity verdict
      if (report.identityAssessment) {
        const ia = report.identityAssessment;
        const statusIcon = ia.status === "match" ? PASS_ICON : ia.status === "mismatch" ? FAIL_ICON : "?";
        console.error(`         Identity: ${statusIcon} ${ia.status} (${(ia.confidence * 100).toFixed(0)}% confidence)`);
        if (ia.predictedFamily) console.error(`         Detected: ${ia.predictedFamily}`);
      }

      const entry = { runAt: now.toISOString(), score: report.score, scoreMax: report.scoreMax, durationMs: elapsedMs };
      history.push(entry);

      // Append to history file if configured
      if (opts.historyFile) {
        const line = JSON.stringify({
          ...entry,
          modelId: report.modelId,
          baseUrl: report.baseUrl,
          passed, warning, failed,
          totalProbes: report.results.length,
        });
        fs.appendFileSync(opts.historyFile, line + "\n", "utf-8");
      }

      // Alert check
      if (report.score < alertBelow && report.score !== lastAlertScore) {
        lastAlertScore = report.score;
        const alertMsg = `[ALERT] Score ${report.score} dropped below threshold ${alertBelow} at ${now.toISOString()}`;
        if (isTTY) {
          console.error(`\n\x1b[31;1m${alertMsg}\x1b[0m\n`);
        } else {
          console.error(`\n${alertMsg}\n`);
        }
      } else if (report.score >= alertBelow) {
        lastAlertScore = Infinity; // reset alert state
      }
    }

    // Graceful exit on SIGINT (Ctrl+C)
    let interrupted = false;
    process.on("SIGINT", () => {
      interrupted = true;
    });

    // First run immediately
    await runOnce();

    while (!interrupted && (maxRuns === 0 || runCount < maxRuns)) {
      // Wait for interval, but check for interruption
      await new Promise<void>(resolve => {
        let waited = 0;
        const step = 200;
        const timer = setInterval(() => {
          waited += step;
          if (interrupted || waited >= intervalMs) {
            clearInterval(timer);
            resolve();
          }
        }, step);
      });
      if (interrupted) break;
      await runOnce();
    }

    // Final summary
    if (history.length > 0) {
      const scores = history.map(h => h.score);
      const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      const min = Math.min(...scores);
      const max = Math.max(...scores);
      console.error(`\n${"─".repeat(60)}`);
      console.error(`  Completed : ${history.length} run(s)`);
      console.error(`  Score avg : ${avg} / 100`);
      console.error(`  Score min : ${min} / 100`);
      console.error(`  Score max : ${max} / 100`);
      if (opts.historyFile) console.error(`  History   : ${opts.historyFile}`);
      console.error(`${"─".repeat(60)}\n`);
    }

    // Exit with code 2 if last run scored below alert threshold
    const lastScore = history[history.length - 1]?.score ?? 100;
    process.exit(lastScore < alertBelow ? 2 : 0);
  });

// ── canary command ────────────────────────────────────────────────────────────

program
  .command("canary")
  .description("Run 10 deterministic canary checks (no LLM judge) — fast proxy quality baseline")
  .requiredOption("--base-url <url>", "Base URL of the OpenAI-compatible endpoint")
  .requiredOption("--api-key <key>", "API key for the endpoint")
  .requiredOption("--model <id>", "Model ID to test")
  .option("--timeout <ms>", "Per-request timeout in milliseconds (default: 60000)", "60000")
  .option("--output <file>", "Write JSON report to file (default: print to stdout)")
  .option("--quiet", "Suppress per-check progress output", false)
  .action(async (opts: {
    baseUrl:   string;
    apiKey:    string;
    model:     string;
    timeout:   string;
    output?:   string;
    quiet:     boolean;
  }) => {
    const timeoutMs = parseInt(opts.timeout, 10) || 60_000;

    if (!opts.quiet) {
      console.error(`\nBazaarLink Probe Engine — canary`);
      console.error(`  Endpoint : ${opts.baseUrl}`);
      console.error(`  Model    : ${opts.model}`);
      console.error(`  Checks   : 10 (math, logic, format, recall, code)\n`);
    }

    const result = await runCanary({
      baseUrl:   opts.baseUrl,
      apiKey:    opts.apiKey,
      modelId:   opts.model,
      timeoutMs,
    });

    if (!opts.quiet) {
      const verdictColor = (v: string) => {
        if (!process.stderr.isTTY) return v;
        if (v === "healthy")  return `\x1b[32m${v}\x1b[0m`;
        if (v === "degraded") return `\x1b[33m${v}\x1b[0m`;
        return `\x1b[31m${v}\x1b[0m`;
      };

      for (const d of result.details) {
        const ic = d.passed ? PASS_ICON : FAIL_ICON;
        const latStr = `${d.latencyMs}ms`.padStart(7);
        const line = `  ${ic} ${d.id.padEnd(20)} ${latStr}  actual: ${(d.actual ?? "").slice(0, 60)}`;
        if (process.stderr.isTTY) {
          console.error(d.passed ? `\x1b[32m${line}\x1b[0m` : `\x1b[31m${line}\x1b[0m`);
        } else {
          console.error(line);
        }
      }

      console.error(`\n${"─".repeat(60)}`);
      console.error(`  Verdict  : ${verdictColor(result.verdict)}`);
      console.error(`  Score    : ${result.passedChecks}/${result.totalChecks} (${(result.score * 100).toFixed(0)}%)`);
      console.error(`  Avg lat  : ${result.avgLatencyMs}ms`);
      if (result.servedModel) console.error(`  Model ID : ${result.servedModel}`);
      if (result.error) console.error(`  Error    : ${result.error}`);
      console.error(`${"─".repeat(60)}\n`);
    }

    const json = JSON.stringify(result, null, 2);
    if (opts.output) {
      fs.writeFileSync(opts.output, json, "utf-8");
      if (!opts.quiet) console.error(`  Report saved to ${opts.output}`);
    } else if (opts.quiet) {
      console.log(json);
    }

    const exitCode = result.verdict === "error" || result.verdict === "failed" ? 1 : 0;
    process.exit(exitCode);
  });

program.parse();
