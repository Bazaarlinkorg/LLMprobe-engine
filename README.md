# @bazaarlink/probe-engine

An open-source CLI tool and Node.js library for testing OpenAI-compatible API endpoints.  
Runs a suite of quality, security, and integrity probes and generates a 0–100 score report.

## Quick Start (CLI)

```bash
npx @bazaarlink/probe-engine run \
  --base-url https://your-endpoint.com/v1 \
  --api-key sk-... \
  --model claude-opus-4-6-thinking
```

## Install

```bash
npm install -g @bazaarlink/probe-engine
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
  --api-key sk-openai-... \
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
  --fetch-baseline https://bazaarlink.net \
  --judge-base-url https://api.openai.com/v1 \
  --judge-api-key sk-openai-... \
  --judge-model gpt-4o-mini \
  --output report.json
```

### Example: compare against your own locally-collected baseline

```bash
# Step 1: collect baseline from a trusted endpoint
bazaarlink-probe collect-baseline \
  --base-url https://api.openai.com/v1 \
  --api-key sk-openai-... \
  --model gpt-4o \
  --output baseline-gpt4o.json

# Step 2: probe a suspect endpoint using that baseline
bazaarlink-probe run \
  --base-url https://suspect-proxy.com/v1 \
  --api-key sk-... \
  --model gpt-4o \
  --baseline baseline-gpt4o.json \
  --judge-base-url https://api.openai.com/v1 \
  --judge-api-key sk-openai-... \
  --judge-model gpt-4o-mini \
  --output report.json
```

## Probe Suite

| ID | Group | Scoring | Description |
|---|---|---|---|
| zh_reasoning | quality | llm_judge | 中文推理能力 |
| code_gen | quality | llm_judge | Code generation quality |
| instruction_follow | quality | exact_match | Strict instruction following |
| en_reasoning | quality | llm_judge | English reasoning |
| math_logic | quality | exact_match | Math reasoning |
| hallucination | quality | llm_judge | Hallucination resistance |
| censorship | quality | keyword_match | Taiwan political question |
| json_output | quality | exact_match | Pure JSON output |
| prompt_injection | quality | keyword_match | Prompt injection resistance (neutral) |
| infra_probe | security | keyword_match | Infrastructure leak detection |
| bedrock_probe | security | keyword_match | AWS Bedrock identifier leak |
| identity_leak | security | keyword_match | System prompt leak detection |
| knowledge_cutoff | integrity | keyword_match | Knowledge cutoff honesty |
| symbol_exact | integrity | exact_match | Unicode symbol pass-through |
| cache_detection | integrity | header_check | Response cache detection |
| token_inflation | integrity | token_check | Hidden system prompt detection |
| sse_compliance | integrity | sse_compliance | SSE stream format validation |
| thinking_block | integrity | thinking_check | Anthropic beta header forwarding |
| consistency_check | integrity | consistency_check | Response caching detection |
| context_length *(optional)* | integrity | context_check | Actual context window measurement |

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
    apiKey: "sk-openai-...",
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
      "group": "quality | security | integrity",
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

For a full-featured web UI with baseline comparison, historical tracking, and detailed reports, visit **[bazaarlink.net/probe](https://bazaarlink.net/probe)**.

## License

MIT © BazaarLink
