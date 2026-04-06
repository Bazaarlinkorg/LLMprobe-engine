#!/usr/bin/env node
// src/cli.ts — CLI entry point for @bazaarlink/probe-engine (MIT)

import { Command } from "commander";
import { runProbes, type ProbeResult, type BaselineMap } from "./runner.js";
import { PROBE_SUITE } from "./probe-suite.js";
import * as fs from "fs";

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
  .version("0.2.0");

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

program.parse();
