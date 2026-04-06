# @bazaarlink/probe-engine

An open-source CLI tool and Node.js library for testing OpenAI-compatible API endpoints.  
Runs a suite of quality, security, and integrity probes and generates a 0–100 score report.

## Quick Start

### Step 1 — Find your baseline model ID

Before running, discover which baseline model IDs are available:

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
  -H "Authorization: Bearer <YOUR_KEY>" \
  | python -m json.tool | grep '"id"'
```

### Step 3 — Run the full probe suite

```bash
node dist/cli.js run \
  --base-url https://bazaarlink.ai/api/v1 \
  --api-key sk-... \
  --model gpt-5.4 \
  --fetch-baseline https://bazaarlink.ai \
  --baseline-model openai/gpt-5.4 \
  --judge-base-url https://bazaarlink.ai/api/v1 \
  --judge-api-key sk-... \
  --judge-model deepseek/deepseek-v3.2 \
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

To inspect a specific probe's full response:

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

## CLI Usage

### `run` — Probe an endpoint

```
bazaarlink-probe run [options]

Required:
  --base-url <url>       Base URL of the OpenAI-compatible endpoint
  --api-key <key>        API key
  --model <id>           Model ID to test

Options:
  --include-optional       Also run context length test (adds 5 requests)
  --timeout <ms>           Per-probe timeout in ms (default: 180000)
  --output <file>          Write JSON report to file (default: stdout)
  --quiet                  Suppress progress output

Baseline (required for llm_judge similarity scoring):
  --baseline <file>        Local baseline JSON (from collect-baseline)
  --fetch-baseline <url>   BazaarLink base URL to download official baselines
  --baseline-model <id>    Model to use when fetching baselines (default: --model)

Judge (required for llm_judge evaluation):
  --judge-base-url <url>
  --judge-api-key <key>
  --judge-model <id>
  --judge-threshold <n>    Similarity threshold 1-10 (default: 7)
```

### `collect-baseline` — Build a local baseline file

Run probes against a **trusted** endpoint and save responses as a baseline JSON for later comparison:

```bash
bazaarlink-probe collect-baseline \
  --base-url https://api.openai.com/v1 \
  --api-key sk-... \
  --model gpt-4o \
  --output baseline-gpt4o.json
```

The output file has the format `{ modelId, collectedAt, probes: [{ probeId, responseText, updatedAt }] }`.

### Example: compare suspect proxy to BazaarLink official baseline

```bash
# Download BazaarLink's built-in baseline for gpt-4o
bazaarlink-probe run \
  --base-url https://suspect-proxy.com/v1 \
  --api-key sk-... \
  --model gpt-4o \
  --fetch-baseline https://bazaarlink.ai \
  --judge-base-url https://api.openai.com/v1 \
  --judge-api-key sk-... \
  --judge-model gpt-4o-mini \
  --output report.json
```

### Example: compare against your own locally-collected baseline

```bash
# Step 1: collect baseline from a trusted endpoint
bazaarlink-probe collect-baseline \
  --base-url https://api.openai.com/v1 \
  --api-key sk-... \
  --model gpt-4o \
  --output baseline-gpt4o.json

# Step 2: probe a suspect endpoint using that baseline
bazaarlink-probe run \
  --base-url https://suspect-proxy.com/v1 \
  --api-key sk-... \
  --model gpt-4o \
  --baseline baseline-gpt4o.json \
  --judge-base-url https://api.openai.com/v1 \
  --judge-api-key sk-... \
  --judge-model gpt-4o-mini \
  --output report.json
```

## Probe Suite

### Quality

| ID | Scoring | Description |
|---|---|---|
| zh_reasoning | llm_judge | 中文推理能力 |
| code_gen | llm_judge | Code generation quality |
| instruction_follow | exact_match | Strict instruction following |
| en_reasoning | llm_judge | English reasoning |
| math_logic | exact_match | Math reasoning |
| hallucination | llm_judge | Hallucination resistance |
| censorship | keyword_match | Taiwan political question |
| json_output | exact_match | Pure JSON output |
| prompt_injection | keyword_match | Prompt injection resistance *(neutral)* |

### Security

| ID | Scoring | Description |
|---|---|---|
| infra_probe | keyword_match | Infrastructure leak detection |
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

| ID | Scoring | Description |
|---|---|---|
| identity_style_en | feature_extract | English writing style fingerprint |
| identity_style_zh_tw | feature_extract | 繁體中文風格識別 |
| identity_reasoning_shape | feature_extract | Reasoning format preference |
| identity_self_knowledge | feature_extract | Model self-description collection |
| identity_list_format | feature_extract | List formatting preference |
| identity_refusal_pattern | keyword_match | Refusal phrase pattern detection |
| identity_json_discipline | keyword_match | JSON-only instruction compliance |
| identity_capability_claim | keyword_match | False real-time capability detection |

## Customising Probes

To add multilingual keywords, mark probes as neutral, or create new probes entirely, see the step-by-step guide:

[`docs/probe-modification-guide.md`](docs/probe-modification-guide.md)

## Programmatic Usage

```typescript
import { runProbes, type BaselineMap } from "@bazaarlink/probe-engine";

// Optional: load a baseline for similarity-based judge scoring
const baseline: BaselineMap = {
  zh_reasoning: "已知條件：x = 5，y = 3...",
  code_gen: "def fibonacci(n):...",
  // ...
};

const report = await runProbes({
  baseUrl: "https://your-endpoint.com/v1",
  apiKey: "sk-...",
  modelId: "claude-opus-4-6",
  baseline,
  judge: {
    baseUrl: "https://api.openai.com/v1",
    apiKey: "sk-...",
    modelId: "gpt-4o-mini",
    threshold: 7,
  },
  onProgress: (result, index, total) => {
    console.log(`[${index}/${total}] ${result.label}: ${result.passed}`);
  },
});

console.log(`Score: ${report.score}/100`);
```

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

## Exit Codes

- `0` — Score ≥ 50
- `1` — Score < 50

## Online Tool

For a full-featured web UI with baseline comparison, historical tracking, and detailed reports, visit **[bazaarlink.ai/probe](https://bazaarlink.ai/probe)**.

## License

MIT © BazaarLink
