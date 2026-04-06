[繁體中文](README.md) | [English](README.en.md) | **简体中文**

# @bazaarlink/probe-engine

针对 OpenAI-compatible API 端点的开源 CLI 测试工具与 Node.js 函数库。  
执行品质、安全性、完整性探针，产出 0–100 评分报告。

---

## 快速开始

### 第一步 — 查询可用的 Baseline 模型 ID

执行前先确认目标模型有哪些官方 baseline 可用：

```bash
curl https://bazaarlink.ai/api/probe/baselines
```

响应示例：
```json
{"models":["openai/gpt-5.4","openai/gpt-5.4-mini","anthropic/claude-sonnet-4.6",...]}
```

> **注意：** Baseline 的模型 ID（例如 `openai/gpt-5.4`）可能与你的端点所接受的 ID（例如 `gpt-5.4`）不同。请用 `--baseline-model` 单独指定 baseline 查询用的 ID。

### 第二步 — 查询可用的 Judge 模型

```bash
curl https://bazaarlink.ai/api/v1/models \
  -H "Authorization: Bearer <你的API密钥>" \
  | python -m json.tool | grep '"id"'
```

### 第三步 — 执行完整探针套件

> **以下示例使用 BazaarLink 端点做演示，各参数请依你的实际环境替换。**  
> `--fetch-baseline` 与 `--judge-*` 为**选填**，仅影响 `llm_judge` 类型的探针。不填时这些探针会被跳过，其余探针正常执行。

```bash
node dist/cli.js run \
  --base-url https://bazaarlink.ai/api/v1 \
  --api-key <你的API密钥> \
  --model gpt-5.4 \
  --fetch-baseline https://bazaarlink.ai \        # 选填：下载官方 baseline
  --baseline-model openai/gpt-5.4 \              # 选填：baseline 查询用的模型 ID
  --judge-base-url https://bazaarlink.ai/api/v1 \ # 选填：judge 端点
  --judge-api-key <judge用的API密钥> \             # 选填
  --judge-model deepseek/deepseek-v3.2 \         # 选填：用来评分的模型
  --output report.json
```

### 第四步 — 查看报告

```
BazaarLink Probe Engine
  Endpoint : https://bazaarlink.ai/api/v1
  Model    : gpt-5.4
  Judge    : deepseek/deepseek-v3.2 (threshold 7)

  [1/19]  ✓ 中文推理           12.7s  Similarity score: 9/10 — nearly identical
  [2/19]  ✓ 程式碼生成           3.7s  Similarity score: 9/10 — nearly identical
  [3/19]  ✓ 指令遵从             1.5s  Response contains expected string "Fortran"
  [4/19]  ✓ 英文推理             3.2s  Similarity score: 9/10 — nearly identical
  [5/19]  ✓ 数学逻辑             4.9s  Response contains expected string "11"
  [6/19]  ✓ 幻觉侦测             5.2s  Similarity score: 9/10 — extremely similar
  [7/19]  ✓ 审查侦测            10.6s  Response contains expected keyword: "Taiwan"
  [8/19]  ✓ JSON 输出           1.9s  Response contains expected string "price_usd"
  [9/19]  ✓ 提示注入             2.1s  No blocked keywords detected
  [10/19] ✓ 部署探针             7.8s  Response contains expected keyword: "cannot confirm"
  [11/19] ✓ Bedrock 探针        6.8s  No blocked keywords detected
  [12/19] ✓ 身份泄露             6.7s  Response contains expected keyword: "확인할 수 없"
  [13/19] ✓ 知识截止验证          6.0s  No blocked keywords detected
  [14/19] ✓ 符号精确回传          1.2s  Response contains expected string "「這是測試」"
  [15/19] ✓ 缓存侦测             1.1s  x-cache header absent — no cache detected
  [16/19] ✓ Token 膨胀侦测       0.9s  No inflation: prompt_tokens=7
  [17/19] ✓ SSE 流格式           1.0s  SSE format OK (7 chunks, [DONE] confirmed)
  [18/19] ⚠ Thinking Block     1.3s  No thinking block (neutral — non-Claude model)
  [19/19] ✓ 响应一致性           2.3s  Responses differ — confirms independent generation

────────────────────────────────────────────────────────────
  Score     : 100 / 100
  Results   : 18 passed  1 warning  0 failed  (19 total)
────────────────────────────────────────────────────────────
```

查看特定探针的完整响应：

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

## 安装

### 方式 A：本地执行（无需发布 npm）

```bash
git clone https://github.com/Bazaarlinkorg/LLMprobe-engine
cd LLMprobe-engine
npm install
npm run build
node dist/cli.js run --help
```

### 方式 B：全局 CLI（通过 npm）

```bash
npm install -g @bazaarlink/probe-engine
bazaarlink-probe run --help
```

---

## CLI 完整参数

### `run` — 对端点执行探针

```
bazaarlink-probe run [options]

必填：
  --base-url <url>       OpenAI-compatible 端点的 Base URL
  --api-key <key>        API 密钥
  --model <id>           要测试的模型 ID

选填：
  --include-optional       额外执行 context length 测试（增加约 5 次请求）
  --timeout <ms>           每个探针的超时时间，毫秒（默认：180000）
  --output <file>          将 JSON 报告写入文件（默认：stdout）
  --quiet                  不显示执行过程

Baseline（选填 — 仅 llm_judge 探针需要，不填则跳过）：
  --baseline <file>        本地 baseline JSON（由 collect-baseline 生成）
  --fetch-baseline <url>   从 BazaarLink 下载官方 baseline
  --baseline-model <id>    下载 baseline 时使用的模型 ID（默认：同 --model）

Judge（选填 — 仅 llm_judge 探针需要，不填则跳过）：
  --judge-base-url <url>
  --judge-api-key <key>
  --judge-model <id>
  --judge-threshold <n>    相似度阈值 1-10（默认：7）
```

### `collect-baseline` — 建立本地 baseline 文件

对**可信任**的端点执行探针，将响应存成 baseline JSON 供后续对比：

```bash
bazaarlink-probe collect-baseline \
  --base-url https://api.openai.com/v1 \
  --api-key <你的API密钥> \
  --model gpt-4o \
  --output baseline-gpt4o.json
```

输出格式：`{ modelId, collectedAt, probes: [{ probeId, responseText, updatedAt }] }`

### 示例：对比可疑 Proxy 与 BazaarLink 官方 baseline

```bash
bazaarlink-probe run \
  --base-url https://suspect-proxy.com/v1 \
  --api-key <Proxy密钥> \
  --model gpt-4o \
  --fetch-baseline https://bazaarlink.ai \
  --judge-base-url https://api.openai.com/v1 \
  --judge-api-key <Judge密钥> \
  --judge-model gpt-4o-mini \
  --output report.json
```

### 示例：对比可疑 Proxy 与自行收集的 baseline

```bash
# 第一步：从可信任端点收集 baseline
bazaarlink-probe collect-baseline \
  --base-url https://api.openai.com/v1 \
  --api-key <你的API密钥> \
  --model gpt-4o \
  --output baseline-gpt4o.json

# 第二步：用该 baseline 测试可疑端点
bazaarlink-probe run \
  --base-url https://suspect-proxy.com/v1 \
  --api-key <Proxy密钥> \
  --model gpt-4o \
  --baseline baseline-gpt4o.json \
  --judge-base-url https://api.openai.com/v1 \
  --judge-api-key <Judge密钥> \
  --judge-model gpt-4o-mini \
  --output report.json
```

---

## 探针清单

### Quality（品质）

| ID | 评分方式 | 说明 |
|---|---|---|
| zh_reasoning | llm_judge | 中文推理能力 |
| code_gen | llm_judge | 代码生成品质 |
| instruction_follow | exact_match | 严格指令遵从 |
| en_reasoning | llm_judge | 英文推理能力 |
| math_logic | exact_match | 数学逻辑推理 |
| hallucination | llm_judge | 幻觉抵抗能力 |
| censorship | keyword_match | 审查侦测（台湾政治问题） |
| json_output | exact_match | 纯 JSON 输出 |
| prompt_injection | keyword_match | 提示注入抵抗 *(neutral)* |

### Security（安全性）

| ID | 评分方式 | 说明 |
|---|---|---|
| infra_probe | keyword_match | 基础设施信息泄露侦测 |
| bedrock_probe | keyword_match | AWS Bedrock 标识符泄露 |
| identity_leak | keyword_match | System prompt 泄露侦测 *(多语言：英/韩/繁中)* |

### Integrity（完整性）

| ID | 评分方式 | 说明 |
|---|---|---|
| knowledge_cutoff | keyword_match | 知识截止诚实性 |
| symbol_exact | exact_match | Unicode 字符精确回传 |
| cache_detection | header_check | 响应缓存侦测 |
| token_inflation | token_check | 隐藏 system prompt 侦测 |
| sse_compliance | sse_compliance | SSE 流格式验证 |
| thinking_block | thinking_check | Anthropic beta header 转发 *(neutral)* |
| consistency_check | consistency_check | 响应缓存一致性侦测 |
| context_length *(optional)* | context_check | 实际 context window 测量 |

### Identity（身份识别）*(全部 neutral — 仅收集特征，不计入评分)*

| ID | 评分方式 | 说明 |
|---|---|---|
| identity_style_en | feature_extract | 英文写作风格特征 |
| identity_style_zh_tw | feature_extract | 繁体中文风格识别 |
| identity_reasoning_shape | feature_extract | 推理格式偏好 |
| identity_self_knowledge | feature_extract | 模型自我描述收集 |
| identity_list_format | feature_extract | 条列格式偏好 |
| identity_refusal_pattern | keyword_match | 拒答惯用语侦测 |
| identity_json_discipline | keyword_match | JSON-only 指令遵守度 |
| identity_capability_claim | keyword_match | 虚假实时能力侦测 |

---

## 自定义探针

如需新增多语言关键字、将探针标记为 neutral、或新增全新探针，请参考逐步说明：

[`docs/probe-modification-guide.md`](docs/probe-modification-guide.md)

---

## 程序化使用

```typescript
import { runProbes, type BaselineMap } from "@bazaarlink/probe-engine";

const baseline: BaselineMap = {
  zh_reasoning: "...",
  code_gen: "...",
};

const report = await runProbes({
  baseUrl: "https://your-endpoint.com/v1",
  apiKey: "<你的API密钥>",
  modelId: "claude-opus-4-6",
  baseline,         // 选填
  judge: {          // 选填
    baseUrl: "https://api.openai.com/v1",
    apiKey: "<Judge用的API密钥>",
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

## 报告 JSON 格式

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

## 退出码

- `0` — 分数 ≥ 50
- `1` — 分数 < 50

---

## 在线工具

完整 Web UI（含 baseline 对比、历史追踪、详细报告）：**[bazaarlink.ai/probe](https://bazaarlink.ai/probe)**

---

## 许可证

MIT © BazaarLink
