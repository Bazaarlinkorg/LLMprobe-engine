[繁體中文](README.md) | **English** | [简体中文](README.zh-CN.md)

# @bazaarlink/probe-engine

An open-source CLI tool and Node.js library for testing OpenAI-compatible API endpoints.  
Runs a suite of quality, security, and integrity probes and generates a 0–100 score report.

> **v0.7.0** (2026-04-26): Adds Layer ④ (V3E / V3F) — the behavioral-vector extension classifier introduced in our measurement paper. 12 new V3E probes spanning a refusal-boundary ladder (8), formatting idiosyncrasy (3), and calibrated uncertainty (1); ships with an offline baseline snapshot for 22 frontier models (Anthropic / OpenAI / Google / DeepSeek). See the companion paper at [`docs/reports/2026-04-26-llm-resale-substitution-measurement-paper.en.md`](docs/reports/2026-04-26-llm-resale-substitution-measurement-paper.en.md) (English) / [`.md`](docs/reports/2026-04-26-llm-resale-substitution-measurement-paper.md) (Traditional Chinese).
>
> **v0.6.0**: Added 26 probes (Identity linguistic fingerprint directions C–G × 18, Sub-Model identification group × 8), new Sub-Model V3 discriminators (`submodel_cutoff` / `submodel_capability` / `submodel_refusal`), new `fingerprint-features-v2` / `fingerprint-build-helpers` modules.

---

## Research Paper

This tool's detection methodology is published as:

> **Model Substitution in the Black-Box LLM API Resale Market — A 14-Day, 171-Endpoint, 625-Probe Empirical Measurement Study**
> *(Traditional Chinese: 黑箱大語言模型 API 中轉市場的模型注水現象)*
> 2026-04-26 · OpenRouterati Research

**📄 Full text (parallel bilingual editions)**

- 🇬🇧 English: [`docs/reports/2026-04-26-llm-resale-substitution-measurement-paper.en.md`](docs/reports/2026-04-26-llm-resale-substitution-measurement-paper.en.md)
- 🇹🇼 Traditional Chinese: [`docs/reports/2026-04-26-llm-resale-substitution-measurement-paper.md`](docs/reports/2026-04-26-llm-resale-substitution-measurement-paper.md)

**Paper covers**

- §3 The four-layer independent-fingerprint detection method — this package implements all four layers ①②③④
- §5 14-day / 171-endpoint / 625-probe / 47 claimed-model field measurement
- §6 Five-category substitution taxonomy (cross-family impersonation / silent downgrade / silent upgrade / version-tag forgery / provider behavior injection) + deep case studies for R1 / R2 / R6
- §7 Consumer-protection and policy implications (D1 / D2 / D3 disclosure-duty proposals)
- Appendix C — open-source implementation correspondence and reproduction guide for this v0.7.x release

**Headline findings**

| Metric | Value |
|---|---:|
| Intra-family substitution detection (synthetic) | 94.4% TP / 0% FP (n=18+6) |
| Persistent-substitution endpoints (strict: n≥5, ≥20% rate) | 1.3% (2/149) |
| Endpoints with at least one violation (n≥1) | 9.9% (17/171) |
| Per-probe cost (judge side) | ~$0.003 USD |

---

## Quick Start

### Step 1 — Find your baseline model ID

Discover which baseline model IDs are available:

```bash
curl https://bazaarlink.ai/api/probe/baselines
```

Example response:
```json
{"models":["openai/gpt-5.4","openai/gpt-5.4-mini","anthropic/claude-sonnet-4.6",...]}
```

> **Note:** The baseline model ID (e.g. `openai/gpt-5.4`) may differ from the model ID your endpoint accepts (e.g. `gpt-5.4`). Use `--baseline-model` to specify the baseline lookup key separately from `--model`.

### Step 2 — Find your judge model ID

```bash
curl https://bazaarlink.ai/api/v1/models \
  -H "Authorization: Bearer <YOUR_API_KEY>" \
  | python -m json.tool | grep '"id"'
```

### Step 3 — Run the full probe suite

> **The example below uses the BazaarLink endpoint for demonstration. Replace all values with your own.**  
> `--fetch-baseline` and `--judge-*` are **optional** — they only affect `llm_judge` probes. All other probes run without them.

```bash
node dist/cli.js run \
  --base-url https://bazaarlink.ai/api/v1 \
  --api-key <YOUR_API_KEY> \
  --model gpt-5.4 \
  --fetch-baseline https://bazaarlink.ai \        # optional: download official baseline
  --baseline-model openai/gpt-5.4 \              # optional: baseline lookup model ID
  --judge-base-url https://bazaarlink.ai/api/v1 \ # optional: judge endpoint
  --judge-api-key <JUDGE_API_KEY> \               # optional
  --judge-model deepseek/deepseek-v3.2 \         # optional: model used for scoring
  --output report.json
```

### Step 4 — Read the report

```
BazaarLink Probe Engine
  Endpoint : https://bazaarlink.ai/api/v1
  Model    : gpt-5.4
  Judge    : deepseek/deepseek-v3.2 (threshold 7)

  [1/19]  ✓ 中文推理           12.7s  Similarity score: 9/10 — nearly identical
  [2/19]  ✓ 程式碼生成           3.7s  Similarity score: 9/10 — nearly identical
  [3/19]  ✓ 指令遵從             1.5s  Response contains expected string "Fortran"
  [4/19]  ✓ 英文推理             3.2s  Similarity score: 9/10 — nearly identical
  [5/19]  ✓ 數學邏輯             4.9s  Response contains expected string "11"
  [6/19]  ✓ 幻覺偵測             5.2s  Similarity score: 9/10 — extremely similar
  [7/19]  ✓ 審查偵測            10.6s  Response contains expected keyword: "Taiwan"
  [8/19]  ✓ JSON 輸出           1.9s  Response contains expected string "price_usd"
  [9/19]  ✓ 提示注入             2.1s  No blocked keywords detected
  [10/19] ✓ 部署探針             7.8s  Response contains expected keyword: "cannot confirm"
  [11/19] ✓ Bedrock 探針        6.8s  No blocked keywords detected
  [12/19] ✓ 身份洩露             6.7s  Response contains expected keyword: "확인할 수 없"
  [13/19] ✓ 知識截止驗證          6.0s  No blocked keywords detected
  [14/19] ✓ 符號精確回傳          1.2s  Response contains expected string "「這是測試」"
  [15/19] ✓ 快取偵測             1.1s  x-cache header absent — no cache detected
  [16/19] ✓ Token 膨脹偵測       0.9s  No inflation: prompt_tokens=7
  [17/19] ✓ SSE 串流格式         1.0s  SSE format OK (7 chunks, [DONE] confirmed)
  [18/19] ⚠ Thinking Block     1.3s  No thinking block (neutral — non-Claude model)
  [19/19] ✓ 回應一致性           2.3s  Responses differ — confirms independent generation

────────────────────────────────────────────────────────────
  Score     : 100 / 100
  Results   : 18 passed  1 warning  0 failed  (19 total)
────────────────────────────────────────────────────────────
```

Inspect a specific probe's full response:

```bash
python -c "
import json, sys
sys.stdout.reconfigure(encoding='utf-8')
r = json.load(open('report.json', encoding='utf-8'))
for p in r['results']:
    if p['probeId'] == 'identity_leak':
        print('passed  :', p['passed'])
        print('reason  :', p['passReason'])
        print('response:', p['response'][:300])
"
```

---

## Install

### Option A: Local (no npm required)

```bash
git clone https://github.com/Bazaarlinkorg/LLMprobe-engine
cd LLMprobe-engine
npm install
npm run build
node dist/cli.js run --help
```

### Option B: Global CLI via npm

```bash
npm install -g @bazaarlink/probe-engine
bazaarlink-probe run --help
```

---

## CLI Reference

### `run` — Probe an endpoint

```
bazaarlink-probe run [options]

Required:
  --base-url <url>       Base URL of the OpenAI-compatible endpoint
  --api-key <key>        API key
  --model <id>           Model ID to test

Optional:
  --include-optional       Also run context length test (adds ~5 requests)
  --timeout <ms>           Per-probe timeout in ms (default: 180000)
  --output <file>          Write JSON report to file (default: stdout)
  --quiet                  Suppress progress output

Baseline (optional — only needed for llm_judge probes):
  --baseline <file>        Local baseline JSON (from collect-baseline)
  --fetch-baseline <url>   BazaarLink base URL to download official baselines
  --baseline-model <id>    Model ID for baseline lookup (default: same as --model)

Judge (optional — only needed for llm_judge probes):
  --judge-base-url <url>
  --judge-api-key <key>
  --judge-model <id>
  --judge-threshold <n>    Similarity threshold 1-10 (default: 7)
```

### `collect-baseline` — Build a local baseline file

Run probes against a **trusted** endpoint and save responses as a baseline JSON:

```bash
bazaarlink-probe collect-baseline \
  --base-url https://api.openai.com/v1 \
  --api-key <YOUR_API_KEY> \
  --model gpt-4o \
  --output baseline-gpt4o.json
```

Output format: `{ modelId, collectedAt, probes: [{ probeId, responseText, updatedAt }] }`

### Example: compare a suspect proxy against BazaarLink official baseline

```bash
bazaarlink-probe run \
  --base-url https://suspect-proxy.com/v1 \
  --api-key <PROXY_API_KEY> \
  --model gpt-4o \
  --fetch-baseline https://bazaarlink.ai \
  --judge-base-url https://api.openai.com/v1 \
  --judge-api-key <JUDGE_API_KEY> \
  --judge-model gpt-4o-mini \
  --output report.json
```

### Example: compare against a locally-collected baseline

```bash
# Step 1: collect baseline from a trusted endpoint
bazaarlink-probe collect-baseline \
  --base-url https://api.openai.com/v1 \
  --api-key <YOUR_API_KEY> \
  --model gpt-4o \
  --output baseline-gpt4o.json

# Step 2: probe the suspect endpoint using that baseline
bazaarlink-probe run \
  --base-url https://suspect-proxy.com/v1 \
  --api-key <PROXY_API_KEY> \
  --model gpt-4o \
  --baseline baseline-gpt4o.json \
  --judge-base-url https://api.openai.com/v1 \
  --judge-api-key <JUDGE_API_KEY> \
  --judge-model gpt-4o-mini \
  --output report.json
```

---

## Probe Suite

### Quality

| ID | Scoring | Description |
|---|---|---|
| zh_reasoning | llm_judge | Chinese reasoning ability |
| code_gen | llm_judge | Code generation quality |
| instruction_follow | exact_match | Strict instruction following |
| en_reasoning | llm_judge | English reasoning ability |
| math_logic | exact_match | Math logic reasoning |
| hallucination | llm_judge | Hallucination resistance |
| censorship | keyword_match | Censorship detection (Taiwan political question) |
| json_output | exact_match | Pure JSON output |
| prompt_injection | keyword_match | Prompt injection resistance *(neutral)* |

### Security

| ID | Scoring | Description |
|---|---|---|
| infra_probe | keyword_match | Infrastructure information leak detection |
| bedrock_probe | keyword_match | AWS Bedrock identifier leak |
| identity_leak | keyword_match | System prompt leak detection *(multilingual: EN/KO/ZH)* |

### Integrity

| ID | Scoring | Description |
|---|---|---|
| knowledge_cutoff | keyword_match | Knowledge cutoff honesty |
| symbol_exact | exact_match | Unicode symbol pass-through |
| cache_detection | header_check | Response cache detection |
| token_inflation | token_check | Hidden system prompt detection |
| sse_compliance | sse_compliance | SSE stream format validation |
| thinking_block | thinking_check | Anthropic beta header forwarding *(neutral)* |
| consistency_check | consistency_check | Response caching detection |
| context_length *(optional)* | context_check | Actual context window measurement |

### Identity *(neutral — fingerprint collection, not scored)*

#### Direction A/B — Behaviour & Style (8)

| ID | Scoring | Description |
|---|---|---|
| identity_style_en | feature_extract | English writing style fingerprint |
| identity_style_zh_tw | feature_extract | Traditional Chinese style fingerprint |
| identity_reasoning_shape | feature_extract | Reasoning format preference |
| identity_self_knowledge | feature_extract | Model self-description collection |
| identity_list_format | feature_extract | List formatting preference |
| identity_refusal_pattern | keyword_match | Refusal phrase pattern detection |
| identity_json_discipline | keyword_match | JSON-only instruction compliance |
| identity_capability_claim | keyword_match | False real-time capability detection |

#### Direction C — Tokenization Awareness (3)

| ID | Scoring | Description |
|---|---|---|
| tok_count_num | feature_extract | Digit token count (GPT tiktoken vs Claude BPE yield different answers) |
| tok_split_word | feature_extract | Subword split style (`tokenization` BPE segmentation) |
| tok_self_knowledge | feature_extract | Tokenizer self-knowledge (how the model describes its own tokenizer) |

#### Direction D — Code Style (3)

| ID | Scoring | Description |
|---|---|---|
| code_reverse_list | feature_extract | Python list reversal style (`[::-1]` vs `reversed()`) |
| code_comment_lang | feature_extract | Code comment language preference (English / Chinese / none) |
| code_error_style | feature_extract | Error handling style (`raise` vs `assert` vs `return None`) |

#### Direction E — Self-Knowledge (3)

| ID | Scoring | Description |
|---|---|---|
| meta_creator | feature_extract | Creator name format (Anthropic / OpenAI / Zhipu AI) |
| meta_context_len | feature_extract | Context window self-report (the number itself is the fingerprint) |
| meta_thinking_mode | feature_extract | Extended thinking support (Opus/Sonnet yes, GPT no) |

#### Direction F — Computational Behaviour (2)

| ID | Scoring | Description |
|---|---|---|
| comp_py_float | feature_extract | Python float representation (`0.1 + 0.2` output knowledge) |
| comp_large_exp | feature_extract | Large number format preference (`2^32` representation) |

#### Direction G — Temporal Knowledge Cutoff (7)

| ID | Scoring | Description |
|---|---|---|
| ling_uk_pm | feature_extract | UK PM (Starmer 2024/07+ vs Sunak) |
| ling_de_chan | feature_extract | German Chancellor (Merz 2025/02+ vs Scholz) |
| ling_fr_pm | feature_extract | French PM (Bayrou 2025/01+ vs Barnier) |
| ling_jp_pm | feature_extract | Japan 102nd PM (Ishiba 2024/10+ vs Kishida) |
| ling_ru_pres | feature_extract | Russian name order preference (family-first vs given-first) |
| ling_kr_num | feature_extract | Korean numeral system (Sino-Korean 사십이 vs native 마흔둘) |
| ling_kr_crisis | feature_extract | South Korea martial law event (only models trained after 2024/12 know) |

### Sub-Model *(neutral — not scored)*

Sub-Model probes collect checkpoint-intrinsic behavioural signals for the sub-model classifier (`sub-model-matcher.ts`) to distinguish versions within the same family (e.g. Opus / Sonnet / Haiku).

#### Capability Cliff (4)

| ID | Scoring | Description |
|---|---|---|
| cap_tower_of_hanoi | feature_extract | 4-disk Tower of Hanoi (Opus ~100%, Sonnet ~85%, Haiku ~40% solve rate) |
| cap_letter_count | feature_extract | Letter count in "strawberry" (Haiku historically fails) |
| cap_reverse_words | feature_extract | Reverse word order (accuracy scales with model size) |
| cap_needle_tiny | feature_extract | Tiny needle-in-haystack (Haiku frequently misses the exact phrase) |

#### Verbosity & Performance (2)

| ID | Scoring | Description |
|---|---|---|
| verb_explain_photosynthesis | feature_extract | Default verbosity (Opus verbose, Haiku terse) |
| perf_bulk_echo | feature_extract | TPS calibration (fixed 200-token output for stable TPS/TTFT sampling) |

#### Tokenizer Edge (1)

| ID | Scoring | Description |
|---|---|---|
| tok_edge_zwj | feature_extract | ZWJ emoji figure count (safety/formatter layer differs between checkpoints) |

#### Distribution Fingerprint (1)

| ID | Scoring | Description |
|---|---|---|
| pi_fingerprint | feature_extract | Word count × 10 runs (Opus 27–31, Sonnet bimodal 21–25/57, Haiku 57–62, GPT-4o always 50) |

#### V3 Direct Discriminators (3)

| ID | Scoring | Description |
|---|---|---|
| submodel_cutoff | feature_extract | Direct cutoff query (YYYY-MM — each checkpoint self-reports a stable unique value) |
| submodel_capability | feature_extract | 5-question battery (strawberry/weekday math/fraction/100th prime/spell backwards) — each checkpoint yields a distinct answer vector |
| submodel_refusal | feature_extract | Refusal template extraction (Opus 4.7 cites 18 U.S.C. § 842 — near-unique cross-family signal) |

---

## Customising Probes

To add multilingual keywords, mark probes as neutral, or create new probes, see:

[`docs/probe-modification-guide.md`](docs/probe-modification-guide.md)

---

## Programmatic Usage

```typescript
import { runProbes, type BaselineMap } from "@bazaarlink/probe-engine";

const baseline: BaselineMap = {
  zh_reasoning: "...",
  code_gen: "...",
};

const report = await runProbes({
  baseUrl: "https://your-endpoint.com/v1",
  apiKey: "<YOUR_API_KEY>",
  modelId: "claude-opus-4-6",
  baseline,         // optional
  judge: {          // optional
    baseUrl: "https://api.openai.com/v1",
    apiKey: "<JUDGE_API_KEY>",
    modelId: "gpt-4o-mini",
    threshold: 7,
  },
  onProgress: (result, index, total) => {
    console.log(`[${index}/${total}] ${result.label}: ${result.passed}`);
  },
});

console.log(`Score: ${report.score}/100`);
```

---

## Report JSON Schema

```json
{
  "baseUrl": "string",
  "modelId": "string",
  "startedAt": "ISO8601",
  "completedAt": "ISO8601",
  "score": 0,
  "scoreMax": 100,
  "totalInputTokens": null,
  "totalOutputTokens": null,
  "results": [
    {
      "probeId": "string",
      "label": "string",
      "group": "quality | security | integrity | identity",
      "neutral": false,
      "status": "done | error | skipped",
      "passed": true,
      "passReason": "string",
      "ttftMs": 1200,
      "durationMs": 3500,
      "inputTokens": 42,
      "outputTokens": 180,
      "tps": 51,
      "response": "string",
      "error": null
    }
  ]
}
```

---

## Real-world fraud reports

BazaarLink runs this engine against 500+ public OpenAI-compatible proxies and publishes the resulting case studies directly in this repo:

**[📄 Full reports → docs/fraud-reports.en.md](docs/fraud-reports.en.md)** ([繁](docs/fraud-reports.md) · [简](docs/fraud-reports.zh-CN.md))

Two analyses:

- **Report 1 (2026-04-15) — Low-score endpoint anomalies**: 30 samples, 171 probe failures, taxonomised. Headline: **>95% of low scores are infrastructure-layer problems (SSE empty bodies, KIRO wrapper injection, token inflation) — not model capability.** 20 confirmed anomalous hosts listed (fake `gpt-5.4` model IDs, claude-opus-thinking empty streams, KIRO refusal chains, Cursor 62K-token injection, and more).
- **Report 2 (2026-04-21) — Endpoint identity analysis**: 7 identity anomalies. Uses a **three-way cross-check** (① surface fingerprint ② behavior fingerprint ③ sub-model V3):
  - 3 × **cross-family model swap** (e.g. `api.getrouter.top` claims Claude Opus 4.7 but fingerprint is 98% match to GPT-5.4)
  - 1 × **same-family downgrade fraud** (`api.aipaibox.com` claims Opus 4.7, actually Opus 4.6, billed at 4.7 rate)
  - 3 × **borderline cases** (top-2 sub-models too close to call)

The three-way cross-check is exactly this engine's [`computeVerdict()`](src/identity-verdict.ts) + [`classifySubmodelV3()`](src/sub-model-classifier-v3.ts) — you can reproduce the same results yourself.

Interactive version: <https://bazaarlink.ai/probe?tab=report>

---

## `proxy-watch` — Local transparent proxy monitor (AC-1.b conditional injection detection)

Starts a local HTTP proxy server that transparently forwards your app's traffic to the upstream API while logging and analyzing every request/response for AC-1.b conditional injection patterns — malicious behavior that only triggers when the user message contains real credentials.

### How it works

```
Your App
    ↓  set base_url to http://localhost:8787/v1
bazaarlink-probe proxy-watch  ← logs + analyzes here
    ↓  transparent forward
Suspect third-party API
    ↑  response
bazaarlink-probe proxy-watch  ← scans for injection keywords
    ↑  forwarded unchanged
Your App  (no visible difference)
```

### Quick start

```bash
# Step 1: start proxy-watch
bazaarlink-probe proxy-watch \
  --upstream https://openrouter.ai/api/v1 \
  --port 8787 \
  --log-file ./proxy-watch.ndjson

# Step 2: change your app's base_url to:
# http://localhost:8787/v1
# Keep your API key unchanged — it passes through.
```

Live terminal output:

```
bazaarlink-probe proxy-watch
  Upstream  : https://openrouter.ai/api/v1
  Listen    : http://localhost:8787/v1
  Log file  : ./proxy-watch.ndjson
──────────────────────────────────────────────────────────────
  Time      Profile     Status     Model                           Duration
  ────────────────────────────────────────────────────────────────────────────
  14:23:01  neutral      ✓ clean   openai/gpt-4o                    842ms
  14:23:15  sensitive    ✓ clean   openai/gpt-4o                    901ms
```

Press Ctrl+C for the final AC-1.b verdict:

```
  AC-1.b Assessment
  Verdict   : no_conditional_injection
  Reason    : Rates similar: sensitive 20% vs neutral 0%
  Neutral   : 8 requests, 0 anomalies
  Sensitive : 5 requests, 1 anomalies
  Total     : 13 requests logged
```

### Options

```
bazaarlink-probe proxy-watch [options]

Required:
  --upstream <url>         Upstream API base URL (e.g. https://openrouter.ai/api/v1)

Optional:
  --port <n>               Local listen port (default: 8787)
  --log-file <path>        NDJSON log file path (default: ./proxy-watch.ndjson)
                           Appends; does not overwrite on restart.
  --report-file <path>     Write a JSON summary on exit (AC-1.b result + last 20 logs)
  --alert-on-suspected     Exit with code 2 if AC-1.b detects conditional injection
                           (integrates with CI / PagerDuty / alerting systems)
```

### Log format (NDJSON)

One JSON line per request. Use `jq` to query:

```bash
# Show all sensitive requests with anomalies
jq 'select(.profile == "sensitive" and .anomaly == true)' proxy-watch.ndjson

# Anomaly rate
jq -s '[.[] | .anomaly] | {total: length, anomalies: map(select(. == true)) | length}' proxy-watch.ndjson
```

### AC-1.b verdict logic

| Condition | Verdict |
|---|---|
| neutral or sensitive count < 3 | `insufficient_data` |
| sensitiveAnomalyRate ≥ 2× neutralAnomalyRate AND ≥1 sensitive anomaly | `conditional_injection_suspected` 🔴 |
| otherwise | `no_conditional_injection` ✅ |

---

## `monitor` — Scheduled active probe monitoring

Periodically runs the full 27-probe suite against an endpoint and alerts when the score drops below a threshold.

```bash
bazaarlink-probe monitor \
  --base-url https://openrouter.ai/api/v1 \
  --api-key <YOUR_KEY> \
  --model openai/gpt-4o \
  --interval 300 \
  --alert-below 70 \
  --history-file ./monitor-history.jsonl
```

Live output:

```
  #    Time       Score     Δ    P   W   F  Duration
  ────────────────────────────────────────────────────
  1    14:00:00      85    --   18   1   0  42.3s
  2    14:05:00      85    +0   18   1   0  39.8s
  3    14:10:00      72   -13   15   1   3  44.1s

[ALERT] Score 72 dropped below threshold 70
```

### Options

```
bazaarlink-probe monitor [options]

Required:
  --base-url <url>         Endpoint base URL
  --api-key <key>          API key
  --model <id>             Model ID

Optional:
  --interval <seconds>     Seconds between runs (default: 300)
  --runs <n>               Stop after N runs (default: 0 = unlimited)
  --alert-below <score>    Alert when score drops below this (default: 60)
  --timeout <ms>           Per-probe timeout (default: 180000)
  --history-file <path>    Append run summaries as JSON lines to this file
  --baseline <file>        Local baseline file (enables llm_judge probes)
  --judge-base-url <url>
  --judge-api-key <key>
  --judge-model <id>
  --judge-threshold <n>    Score threshold 1-10 (default: 7)
  --claimed-model <model>  Vendor-claimed model name (for identity verification)
```

### `proxy-watch` vs `monitor` — which one?

| | `proxy-watch` (passive) | `monitor` (active) |
|---|---|---|
| **How it works** | Intercepts real traffic | Fires 27 test probes |
| **Requires URL change?** | ✅ One-line baseURL swap | ❌ No app changes needed |
| **Detects** | Conditional injection (AC-1.b) | Quality regression, security rollback, model swap |
| **Best for** | Suspicious third-party proxy | Periodic SLA / uptime verification |

---

## Exit Codes

- `0` — `run`/`monitor`: score ≥ 50; `proxy-watch`: clean exit
- `1` — `run`/`monitor`: score < 50
- `2` — `proxy-watch --alert-on-suspected`: conditional injection detected

---

## Development & Testing

### Setup

```bash
git clone https://github.com/Bazaarlinkorg/LLMprobe-engine
cd LLMprobe-engine
npm install
npm run build   # compile TypeScript → dist/
```

### Run tests

```bash
npm test                        # run all 143 tests (~1s)
npm test -- --reporter=verbose  # show each test name and duration
npm test -- --watch             # re-run on file save
```

Expected output:

```
 Test Files  10 passed (10)
      Tests  143 passed (143)
   Duration  ~800ms
```

### Test coverage — 10 files, 143 tests

| File | Tests | Module | What it verifies |
|---|---|---|---|
| `probe-suite.test.ts` | 34 | `probe-suite.ts` | Probe array structure, all scoring modes (exact_match / keyword_match / header_check / llm_judge), neutral and optional flags |
| `proxy-analyzer.test.ts` | 27 | `proxy-analyzer.ts` | `profileRequest` sensitive/neutral classification, `analyzeResponse` injection keyword detection (exec/eval/subprocess/curl…), all three AC-1.b verdicts, `statsFromLogs` aggregation |
| `probe-preflight.test.ts` | 18 | `probe-preflight.ts` | HTTP 200–299 ok, 401/403 abort, model_not_found abort, 429/5xx warn, empty body / non-JSON edge cases |
| `probe-score.test.ts` | 13 | `probe-score.ts` | Full/zero score, warning = 0.5 pts, neutral excluded from denominator, null dual effect, error/skipped scoring, mixed scenario |
| `proxy-log-store.test.ts` | 11 | `proxy-log-store.ts` | NDJSON read/write, multi-append, readLast(n), cross-instance persistence, malformed line tolerance, makeLogId uniqueness |
| `sse-compliance.test.ts` | 11 | `sse-compliance.ts` | Valid SSE stream, missing [DONE], empty stream, invalid JSON chunk, missing choices warning, no false warning on failure |
| `token-inflation.test.ts` | 10 | `token-inflation.ts` | Threshold boundary, custom threshold, inflation amount reporting, zero denominator edge |
| `context-check.test.ts` | 6 | `context-check.ts` | All levels pass, first level fail, mid-level truncation warning, send() throw simulation |
| `fingerprint-extractor.test.ts` | 7 | `fingerprint-extractor.ts` | Claude/GPT/Qwen self-claim detection, JSON pollution, lexical style signals, zero-signal empty input |
| `candidate-matcher.test.ts` | 6 | `candidate-matcher.ts` | Anthropic/OpenAI family ranking, max 3 candidates, match/mismatch/uncertain verdict |

### Adding tests

Test files live in `src/__tests__/`. Vitest auto-discovers `*.test.ts`:

```bash
touch src/__tests__/my-module.test.ts
npm test
```

> `vitest.config.ts` excludes `dist/` to prevent running stale compiled JS.

---

## Online Tool

Full web UI with baseline comparison, historical tracking, and detailed reports: **[bazaarlink.ai/probe](https://bazaarlink.ai/probe)**

---

## License

MIT © BazaarLink
