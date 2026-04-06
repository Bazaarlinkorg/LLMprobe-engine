**繁體中文** | [English](README.en.md)

# @bazaarlink/probe-engine

針對 OpenAI-compatible API 端點的開源 CLI 測試工具與 Node.js 函式庫。  
執行品質、安全性、完整性探針，產出 0–100 評分報告。

---

## 快速開始

### 第一步 — 查詢可用的 Baseline 模型 ID

執行前先確認目標模型有哪些官方 baseline 可用：

```bash
curl https://bazaarlink.ai/api/probe/baselines
```

回應範例：
```json
{"models":["openai/gpt-5.4","openai/gpt-5.4-mini","anthropic/claude-sonnet-4.6",...]}
```

> **注意：** Baseline 的模型 ID（例如 `openai/gpt-5.4`）可能與你的端點所接受的 ID（例如 `gpt-5.4`）不同。請用 `--baseline-model` 單獨指定 baseline 查詢用的 ID。

### 第二步 — 查詢可用的 Judge 模型

```bash
curl https://bazaarlink.ai/api/v1/models \
  -H "Authorization: Bearer <你的API金鑰>" \
  | python -m json.tool | grep '"id"'
```

### 第三步 — 執行完整探針套件

> **以下範例使用 BazaarLink 端點做示範，各參數請依你的實際環境替換。**  
> `--fetch-baseline` 與 `--judge-*` 為**選填**，僅影響 `llm_judge` 類型的探針。不填時這些探針會被跳過，其餘探針正常執行。

```bash
node dist/cli.js run \
  --base-url https://bazaarlink.ai/api/v1 \
  --api-key <你的API金鑰> \
  --model gpt-5.4 \
  --fetch-baseline https://bazaarlink.ai \        # 選填：下載官方 baseline
  --baseline-model openai/gpt-5.4 \              # 選填：baseline 查詢用的模型 ID
  --judge-base-url https://bazaarlink.ai/api/v1 \ # 選填：judge 端點
  --judge-api-key <judge用的API金鑰> \             # 選填
  --judge-model deepseek/deepseek-v3.2 \         # 選填：用來評分的模型
  --output report.json
```

### 第四步 — 查看報告

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

查看特定探針的完整回應：

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

## 安裝

### 方式 A：本地執行（無需發布 npm）

```bash
git clone https://github.com/Bazaarlinkorg/LLMprobe-engine
cd LLMprobe-engine
npm install
npm run build
node dist/cli.js run --help
```

### 方式 B：全域 CLI（透過 npm）

```bash
npm install -g @bazaarlink/probe-engine
bazaarlink-probe run --help
```

---

## CLI 完整參數

### `run` — 對端點執行探針

```
bazaarlink-probe run [options]

必填：
  --base-url <url>       OpenAI-compatible 端點的 Base URL
  --api-key <key>        API 金鑰
  --model <id>           要測試的模型 ID

選填：
  --include-optional       額外執行 context length 測試（增加約 5 次請求）
  --timeout <ms>           每個探針的逾時時間，毫秒（預設：180000）
  --output <file>          將 JSON 報告寫入檔案（預設：stdout）
  --quiet                  不顯示執行過程

Baseline（llm_judge 相似度評分所需，不填則跳過 llm_judge 探針）：
  --baseline <file>        本地 baseline JSON（由 collect-baseline 產生）
  --fetch-baseline <url>   從 BazaarLink 下載官方 baseline
  --baseline-model <id>    下載 baseline 時使用的模型 ID（預設：同 --model）

Judge（llm_judge 評分所需，不填則跳過 llm_judge 探針）：
  --judge-base-url <url>
  --judge-api-key <key>
  --judge-model <id>
  --judge-threshold <n>    相似度閾值 1-10（預設：7）
```

### `collect-baseline` — 建立本地 baseline 檔案

對**可信任**的端點執行探針，將回應存成 baseline JSON 供後續比對：

```bash
bazaarlink-probe collect-baseline \
  --base-url https://api.openai.com/v1 \
  --api-key <OpenAI金鑰> \
  --model gpt-4o \
  --output baseline-gpt4o.json
```

輸出格式：`{ modelId, collectedAt, probes: [{ probeId, responseText, updatedAt }] }`

### 範例：對比可疑 Proxy 與 BazaarLink 官方 baseline

```bash
bazaarlink-probe run \
  --base-url https://suspect-proxy.com/v1 \
  --api-key <Proxy金鑰> \
  --model gpt-4o \
  --fetch-baseline https://bazaarlink.ai \
  --judge-base-url https://api.openai.com/v1 \
  --judge-api-key <OpenAI金鑰> \
  --judge-model gpt-4o-mini \
  --output report.json
```

### 範例：對比可疑 Proxy 與自行收集的 baseline

```bash
# 第一步：從可信任端點收集 baseline
bazaarlink-probe collect-baseline \
  --base-url https://api.openai.com/v1 \
  --api-key <OpenAI金鑰> \
  --model gpt-4o \
  --output baseline-gpt4o.json

# 第二步：用該 baseline 測試可疑端點
bazaarlink-probe run \
  --base-url https://suspect-proxy.com/v1 \
  --api-key <Proxy金鑰> \
  --model gpt-4o \
  --baseline baseline-gpt4o.json \
  --judge-base-url https://api.openai.com/v1 \
  --judge-api-key <OpenAI金鑰> \
  --judge-model gpt-4o-mini \
  --output report.json
```

---

## 探針清單

### Quality（品質）

| ID | 評分方式 | 說明 |
|---|---|---|
| zh_reasoning | llm_judge | 中文推理能力 |
| code_gen | llm_judge | 程式碼生成品質 |
| instruction_follow | exact_match | 嚴格指令遵從 |
| en_reasoning | llm_judge | 英文推理能力 |
| math_logic | exact_match | 數學邏輯推理 |
| hallucination | llm_judge | 幻覺抵抗能力 |
| censorship | keyword_match | 審查偵測（台灣政治問題） |
| json_output | exact_match | 純 JSON 輸出 |
| prompt_injection | keyword_match | 提示注入抵抗 *(neutral)* |

### Security（安全性）

| ID | 評分方式 | 說明 |
|---|---|---|
| infra_probe | keyword_match | 基礎設施資訊洩露偵測 |
| bedrock_probe | keyword_match | AWS Bedrock 識別碼洩露 |
| identity_leak | keyword_match | System prompt 洩露偵測 *(多語言：英/韓/繁中)* |

### Integrity（完整性）

| ID | 評分方式 | 說明 |
|---|---|---|
| knowledge_cutoff | keyword_match | 知識截止誠實性 |
| symbol_exact | exact_match | Unicode 字符精確回傳 |
| cache_detection | header_check | 回應快取偵測 |
| token_inflation | token_check | 隱藏 system prompt 偵測 |
| sse_compliance | sse_compliance | SSE 串流格式驗證 |
| thinking_block | thinking_check | Anthropic beta header 轉發 *(neutral)* |
| consistency_check | consistency_check | 回應快取一致性偵測 |
| context_length *(optional)* | context_check | 實際 context window 測量 |

### Identity（身份識別）*(全部 neutral — 僅收集特徵，不計入評分)*

| ID | 評分方式 | 說明 |
|---|---|---|
| identity_style_en | feature_extract | 英文寫作風格特徵 |
| identity_style_zh_tw | feature_extract | 繁體中文風格識別 |
| identity_reasoning_shape | feature_extract | 推理格式偏好 |
| identity_self_knowledge | feature_extract | 模型自我描述收集 |
| identity_list_format | feature_extract | 條列格式偏好 |
| identity_refusal_pattern | keyword_match | 拒答慣用語偵測 |
| identity_json_discipline | keyword_match | JSON-only 指令遵守度 |
| identity_capability_claim | keyword_match | 虛假即時能力偵測 |

---

## 自訂探針

如需新增多語言關鍵字、將探針標記為 neutral、或新增全新探針，請參考逐步說明：

[`docs/probe-modification-guide.md`](docs/probe-modification-guide.md)

---

## 程式化使用

```typescript
import { runProbes, type BaselineMap } from "@bazaarlink/probe-engine";

const baseline: BaselineMap = {
  zh_reasoning: "已知條件：x = 5，y = 3...",
  code_gen: "def fibonacci(n):...",
};

const report = await runProbes({
  baseUrl: "https://your-endpoint.com/v1",
  apiKey: "<你的API金鑰>",
  modelId: "claude-opus-4-6",
  baseline,           // 選填
  judge: {            // 選填
    baseUrl: "https://api.openai.com/v1",
    apiKey: "<Judge用的API金鑰>",
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

## 報告 JSON 格式

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

## 結束碼

- `0` — 分數 ≥ 50
- `1` — 分數 < 50

---

## 線上工具

完整 Web UI（含 baseline 比對、歷史追蹤、詳細報告）：**[bazaarlink.ai/probe](https://bazaarlink.ai/probe)**

---

## 授權

MIT © BazaarLink
