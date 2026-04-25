[繁體中文](README.md) | [English](README.en.md) | **简体中文**

# @bazaarlink/probe-engine

针对 OpenAI-compatible API 端点的开源 CLI 测试工具与 Node.js 函数库。  
执行品质、安全性、完整性探针，产出 0–100 评分报告。

> **v0.7.0** (2026-04-26)：新增方法层 **层④（V3E / V3F）行为向量扩展分类器** — 拒绝梯度（8 探针）、格式偏好（3 探针）、数值不确定性（1 探针）共 12 个新 V3E 探针；附带 22 个热门模型的离线 baseline 快照（Anthropic / OpenAI / Google / DeepSeek 旗舰线）。完整方法论与实证测量见论文 [`docs/reports/2026-04-26-llm-resale-substitution-measurement-paper.md`](docs/reports/2026-04-26-llm-resale-substitution-measurement-paper.md)（繁中）/ [`.en.md`](docs/reports/2026-04-26-llm-resale-substitution-measurement-paper.en.md)（英文）。
>
> **v0.6.0**：新增 26 个探针（Identity 语言指纹 C–G 方向 × 18 个、Sub-Model 子模型识别组 × 8 个）、新增 Sub-Model V3 三探针（`submodel_cutoff` / `submodel_capability` / `submodel_refusal`）、新增 `fingerprint-features-v2` / `fingerprint-build-helpers` 模块。

---

## 研究方法论依据（Research Paper）

本工具的检测方法已发表于：

> **黑箱大语言模型 API 中转市场的模型注水现象 — 一项 14 天、171 端点、625 次探测的实证测量研究**
> *Model Substitution in the Black-Box LLM API Resale Market — A 14-Day, 171-Endpoint, 625-Probe Empirical Measurement Study*
> 2026-04-26 · OpenRouterati Research

**📄 全文（双语对等版本）**

- 🇨🇳 简体中文：直接阅读繁中版本即可（用语略有差异，技术内容一致）—— [`docs/reports/2026-04-26-llm-resale-substitution-measurement-paper.md`](docs/reports/2026-04-26-llm-resale-substitution-measurement-paper.md)
- 🇬🇧 English: [`docs/reports/2026-04-26-llm-resale-substitution-measurement-paper.en.md`](docs/reports/2026-04-26-llm-resale-substitution-measurement-paper.en.md)

**论文涵盖**

- §3 四层独立指纹检测方法 — 本套件对应 ①②③④ 全部四层
- §5 14 天 / 171 中转端点 / 625 探测 / 47 种宣称模型的实地测量数据
- §6 五大伪装型态分类学（跨家族冒充 / 同家族静默降级 / 同家族静默升级 / 版本标签造假 / 提供商行为注入）+ R1 / R2 / R6 深度案例研究
- §7 消费者保护与政策意涵分析（D1 / D2 / D3 披露义务建议）
- 附录 C — 开源实作对应与本 v0.7.x 重现指引

**主结论摘要**

| 指标 | 数值 |
|---|---:|
| 同家族伪装检测（合成测试） | 94.4% TP / 0% FP（n=18+6） |
| 端点层级违规率（严格门槛：n≥5、≥20%） | 1.3% (2/149) |
| 端点层级违规率（放宽门槛：n≥1、≥1 次违规） | 9.9% (17/171) |
| 探测单次成本 | ~$0.003 USD（judge 端） |

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

#### 方向 A/B — 行为 & 风格（8 个）

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

#### 方向 C — Tokenizer 感知（3 个）

| ID | 评分方式 | 说明 |
|---|---|---|
| tok_count_num | feature_extract | 数字 token 计数（GPT tiktoken vs Claude BPE 答案不同） |
| tok_split_word | feature_extract | 词分割风格（`tokenization` 的 BPE 切法） |
| tok_self_knowledge | feature_extract | Tokenizer 自我知识（模型对自身 tokenizer 的描述） |

#### 方向 D — 代码风格（3 个）

| ID | 评分方式 | 说明 |
|---|---|---|
| code_reverse_list | feature_extract | Python 列表反转风格（`[::-1]` vs `reversed()`） |
| code_comment_lang | feature_extract | 代码注释语言偏好（英文 / 中文 / 无） |
| code_error_style | feature_extract | 错误处理风格（`raise` vs `assert` vs `return None`） |

#### 方向 E — 自我知识（3 个）

| ID | 评分方式 | 说明 |
|---|---|---|
| meta_creator | feature_extract | 创造者名称格式（Anthropic / OpenAI / Zhipu AI） |
| meta_context_len | feature_extract | Context 长度自报（数字本身即指纹） |
| meta_thinking_mode | feature_extract | Extended Thinking 支持（Opus/Sonnet yes，GPT no） |

#### 方向 F — 计算行为（2 个）

| ID | 评分方式 | 说明 |
|---|---|---|
| comp_py_float | feature_extract | Python 浮点表示（`0.1+0.2` 输出精度知识） |
| comp_large_exp | feature_extract | 大数格式偏好（`2^32` 的表示方式） |

#### 方向 G — 时事知识截止（7 个）

| ID | 评分方式 | 说明 |
|---|---|---|
| ling_uk_pm | feature_extract | 英国首相（Starmer 2024/07+ vs Sunak） |
| ling_de_chan | feature_extract | 德国总理（Merz 2025/02+ vs Scholz） |
| ling_fr_pm | feature_extract | 法国总理（Bayrou 2025/01+ vs Barnier） |
| ling_jp_pm | feature_extract | 日本第102代首相（石破茂 2024/10+ vs 岸田） |
| ling_ru_pres | feature_extract | 俄语姓名顺序偏好（姓名顺 vs 名姓顺） |
| ling_kr_num | feature_extract | 韩语数字系统（汉字语 사십이 vs 固有语 마흔둘） |
| ling_kr_crisis | feature_extract | 韩国戒严事件（仅 2024/12 后训练的模型知道） |

### Sub-Model（子模型识别）*(全部 neutral — 不计入分数)*

Sub-Model 探针收集每个 checkpoint 的固有行为特征，供子模型分类器（`sub-model-matcher.ts`）区分同家族内的不同版本（如 Opus / Sonnet / Haiku）。

#### 能力悬崖（4 个）

| ID | 评分方式 | 说明 |
|---|---|---|
| cap_tower_of_hanoi | feature_extract | 4 盘河内塔（Opus ~100%、Sonnet ~85%、Haiku ~40% 解决率） |
| cap_letter_count | feature_extract | strawberry 字母计数（Haiku 历史上常答错） |
| cap_reverse_words | feature_extract | 句子逆序词（准确度与模型大小正相关） |
| cap_needle_tiny | feature_extract | 微型 needle（Haiku 常漏掉精确短语） |

#### 冗长度 & 效能（2 个）

| ID | 评分方式 | 说明 |
|---|---|---|
| verb_explain_photosynthesis | feature_extract | 预设冗长度（Opus 详尽，Haiku 精简） |
| perf_bulk_echo | feature_extract | TPS 标定（固定 200 token 输出取样 TPS/TTFT） |

#### Tokenizer 边界（1 个）

| ID | 评分方式 | 说明 |
|---|---|---|
| tok_edge_zwj | feature_extract | ZWJ emoji 人物计数（安全/格式层因 checkpoint 不同而异） |

#### 推理分布指纹（1 个）

| ID | 评分方式 | 说明 |
|---|---|---|
| pi_fingerprint | feature_extract | 词语计数 × 10 次（Opus 27-31，Sonnet 双峰21-25/57，Haiku 57-62，GPT-4o 固定50） |

#### V3 直接识别探针（3 个）

| ID | 评分方式 | 说明 |
|---|---|---|
| submodel_cutoff | feature_extract | 直问 training cutoff（YYYY-MM 格式，各 checkpoint 自报值稳定唯一） |
| submodel_capability | feature_extract | 5 题能力电池（strawberry/星期推算/分数/第100质数/拼字反转），每个 checkpoint 有固定错误向量 |
| submodel_refusal | feature_extract | 拒答模板提取（Opus 4.7 含 18 U.S.C. § 842 引用，跨 family 几乎唯一） |

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

## 欺诈中转站案例报告（real-world fraud reports）

BazaarLink 长期用本引擎对 500+ 公开 OpenAI-compatible proxy 做主动探测，公布的案例报告就直接放在本 repo：

**[📄 完整报告 → docs/fraud-reports.zh-CN.md](docs/fraud-reports.zh-CN.md)**（[EN](docs/fraud-reports.en.md) · [繁](docs/fraud-reports.md)）

收录两份分析：

- **Report 1（2026-04-15）— 低分端点异常分析**：30 条样本、171 次探针失败的成因分类。结论：**95% 以上的低分来自 infrastructure 层问题（SSE 空 body、KIRO wrapper 注入、token 膨胀），而非模型能力差。** 列出 20 个已确认异常的 host（含 gpt-5.4 假模型 ID、claude-opus-thinking 流空白、KIRO 连锁拒答、Cursor 62K token 注入等）。
- **Report 2（2026-04-21）— 端点身份分析**：7 个身份异常案例。用**三向交叉**（① 表面指纹 ② 行为指纹 ③ 子模型 V3）检测：
  - 3 个**跨家族模型调包**（例：`api.getrouter.top` 声称 Claude Opus 4.7，指纹 98% 吻合 GPT-5.4）
  - 1 个**同家族降级欺诈**（`api.aipaibox.com` 声称 Opus 4.7、实为 Opus 4.6，账单按 4.7 收费）
  - 3 个**无法确认的边界案例**

三向交叉的核心逻辑就是本 engine 的 [`computeVerdict()`](src/identity-verdict.ts) + [`classifySubmodelV3()`](src/sub-model-classifier-v3.ts) — 你自己也能跑出一样的结果。

交互版：<https://bazaarlink.ai/probe?tab=report>

---

## `proxy-watch` — 本地透明 Proxy 监控（AC-1.b 条件式注入检测）

启动一个本地 HTTP proxy server，将你的 app 流量透明转发到目标 API，同时在后台分析每一笔请求与响应，检测是否存在「只有在含有敏感 credentials 时才注入恶意代码」的条件式攻击模式（AC-1.b）。

### 工作原理

```
你的 App
    ↓  baseURL 改成 http://localhost:8787/v1
bazaarlink-probe proxy-watch  ← 在这里记录、分析
    ↓  透明转发
可疑的第三方 API
    ↑  响应
bazaarlink-probe proxy-watch  ← 分析响应有无注入关键字
    ↑  原封不动返回
你的 App（感觉不到任何差异）
```

### 快速使用

```bash
# 第一步：启动 proxy-watch
bazaarlink-probe proxy-watch \
  --upstream https://openrouter.ai/api/v1 \
  --port 8787 \
  --log-file ./proxy-watch.ndjson

# 第二步：将你的 app 的 baseURL 改成：
# http://localhost:8787/v1
# API Key 照用不变，只换 URL 这一行
```

Ctrl+C 停止后输出最终 AC-1.b 判断结果。

### 完整参数

```
bazaarlink-probe proxy-watch [options]

必填：
  --upstream <url>         上游 API 的 Base URL

选填：
  --port <n>               本地监听 port（默认：8787）
  --log-file <path>        NDJSON 记录文件路径（默认：./proxy-watch.ndjson）
  --report-file <path>     停止时写出 JSON 摘要报告
  --alert-on-suspected     若检测到条件式注入，以 exit code 2 退出
```

### AC-1.b 判定逻辑

| 情况 | 判定 |
|------|------|
| neutral 或 sensitive 笔数 < 3 | `insufficient_data` |
| sensitive 异常率 ≥ neutral 异常率的 2 倍，且 sensitive 至少 1 笔异常 | `conditional_injection_suspected` 🔴 |
| 其他 | `no_conditional_injection` ✅ |

---

## `monitor` — 定期主动探针监控

定期对端点执行完整的 27 项探针套件，追踪分数变化，分数掉到阈值以下时 alert。

```bash
bazaarlink-probe monitor \
  --base-url https://openrouter.ai/api/v1 \
  --api-key <你的API密钥> \
  --model openai/gpt-4o \
  --interval 300 \
  --alert-below 70 \
  --history-file ./monitor-history.jsonl
```

### 完整参数

```
bazaarlink-probe monitor [options]

必填：
  --base-url <url>         端点 Base URL
  --api-key <key>          API 密钥
  --model <id>             模型 ID

选填：
  --interval <seconds>     每次 run 的间隔秒数（默认：300）
  --runs <n>               执行几次后停止（默认：0 = 无限）
  --alert-below <score>    分数低于此值时输出 ALERT（默认：60）
  --timeout <ms>           每个探针超时时间（默认：180000）
  --history-file <path>    每次 run 的摘要追加到此 JSONL 文件
  --baseline <file>        本地 baseline 文件（启用 llm_judge 探针）
  --judge-base-url <url>
  --judge-api-key <key>
  --judge-model <id>
  --judge-threshold <n>    判断阈值 1-10（默认：7）
  --claimed-model <model>  厂商宣称的模型名称（用于身份验证对比）
```

### `proxy-watch` vs `monitor` 选哪个？

| | `proxy-watch`（被动监控）| `monitor`（主动探针）|
|---|---|---|
| **工作方式** | 在真实流量上拦截分析 | 主动发送 27 个测试请求 |
| **需要换 URL？** | ✅ 换一行 baseURL | ❌ 不用动 app 代码 |
| **检测能力** | 条件式注入（AC-1.b） | 品质下降、安全回退、模型置换 |
| **适合** | 怀疑第三方 proxy 有恶意行为 | 自己的 infra 定期 SLA 验证 |

---

## 退出码

- `0` — `run`/`monitor`: 分数 ≥ 50；`proxy-watch`: 正常停止
- `1` — `run`/`monitor`: 分数 < 50
- `2` — `proxy-watch --alert-on-suspected`: 检测到条件式注入

---

## 开发与测试

### 环境准备

```bash
git clone https://github.com/Bazaarlinkorg/LLMprobe-engine
cd LLMprobe-engine
npm install
npm run build   # 编译 TypeScript → dist/
```

### 执行测试

```bash
npm test                        # 执行全部 143 个测试（约 1 秒）
npm test -- --reporter=verbose  # 显示每个测试的名称与耗时
npm test -- --watch             # 监听模式，保存文件自动重跑
```

测试结果示例：

```
 Test Files  10 passed (10)
      Tests  143 passed (143)
   Duration  ~800ms
```

### 测试覆盖范围（10 个测试文件，143 个测试）

| 测试文件 | 测试数 | 覆盖模块 | 主要验证项目 |
|---|---|---|---|
| `probe-suite.test.ts` | 34 | `probe-suite.ts` | 探针数组结构验证、所有评分模式（exact_match / keyword_match / header_check / llm_judge）逻辑、neutral 标记、optional 标记 |
| `proxy-analyzer.test.ts` | 27 | `proxy-analyzer.ts` | `profileRequest` sensitive/neutral 分类、`analyzeResponse` 注入关键字检测（exec/eval/subprocess/curl 等）、AC-1.b 判定逻辑三种 verdict、`statsFromLogs` 统计计算 |
| `probe-preflight.test.ts` | 18 | `probe-preflight.ts` | HTTP 200–299 正常、401/403 中止、model_not_found 中止、429/5xx 警告、空 body / 非 JSON 边界处理 |
| `probe-score.test.ts` | 13 | `probe-score.ts` | 满分/零分计算、warning 计 0.5 分、neutral 不计入分母、null 双向影响、error/skipped 计分、混合场景 |
| `proxy-log-store.test.ts` | 11 | `proxy-log-store.ts` | NDJSON 读写、多笔 append、readLast(n)、跨实例持久化、畸形行跳过不抛错、makeLogId 唯一性 |
| `sse-compliance.test.ts` | 11 | `sse-compliance.ts` | 格式正确的 SSE stream、缺少 [DONE]、空 stream、非 JSON chunk 检测、无 choices 警告、失败时不误报警告 |
| `token-inflation.test.ts` | 10 | `token-inflation.ts` | prompt_tokens 阈值边界、自定义阈值、inflation 金额回报、零分母边界 |
| `context-check.test.ts` | 6 | `context-check.ts` | 所有层级通过、最小层级失败、中段截断警告、send 函数抛出异常 |
| `fingerprint-extractor.test.ts` | 7 | `fingerprint-extractor.ts` | Claude/GPT/Qwen 自我声称检测、JSON 污染检测、词汇风格特征、空输入零信号 |
| `candidate-matcher.test.ts` | 6 | `candidate-matcher.ts` | Anthropic/OpenAI 家族排序、最多返回 3 候选、match/mismatch/uncertain verdict 推导 |

### 新增测试

测试文件放在 `src/__tests__/`，vitest 会自动扫描 `*.test.ts`：

```bash
touch src/__tests__/my-module.test.ts
npm test
```

> `vitest.config.ts` 已设置排除 `dist/` 下的编译产物，不会误跑旧的 JS 版本。

---

## 在线工具

完整 Web UI（含 baseline 对比、历史追踪、详细报告）：**[bazaarlink.ai/probe](https://bazaarlink.ai/probe)**

---

## 许可证

MIT © BazaarLink
