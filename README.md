**繁體中文** | [English](README.en.md) | [简体中文](README.zh-CN.md)

# @bazaarlink/probe-engine

針對 OpenAI-compatible API 端點的開源 CLI 測試工具與 Node.js 函式庫。  
執行品質、安全性、完整性、身份識別探針，產出 0–100 評分報告。

> **v0.7.0** (2026-04-26)：新增方法層 **層④（V3E / V3F）行為向量擴展分類器** — 拒絕梯度（8 探針）、格式偏好（3 探針）、數值不確定性（1 探針）共 12 個新 V3E 探針；附帶 22 個熱門模型的離線 baseline 快照（Anthropic / OpenAI / Google / DeepSeek 旗艦線）。完整方法論與實證測量見論文 [`docs/reports/2026-04-26-llm-resale-substitution-measurement-paper.md`](docs/reports/2026-04-26-llm-resale-substitution-measurement-paper.md)（中文版）/ [`.en.md`](docs/reports/2026-04-26-llm-resale-substitution-measurement-paper.en.md)（英文版）。
>
> **v0.6.0**：新增 26 個探針（Identity 語言指紋 C–G 方向 × 18 個、Sub-Model 子模型識別組 × 8 個）、新增 Sub-Model V3 三探針（`submodel_cutoff` / `submodel_capability` / `submodel_refusal`）、新增 `fingerprint-features-v2` / `fingerprint-build-helpers` 模組

---

## 研究方法論依據（Research Paper）

本工具的偵測方法已發表於：

> **黑箱大語言模型 API 中轉市場的模型注水現象 — 一項 14 天、171 端點、625 次探測的實證測量研究**
> *Model Substitution in the Black-Box LLM API Resale Market — A 14-Day, 171-Endpoint, 625-Probe Empirical Measurement Study*
> 2026-04-26 · Bazaarlink Research

**📄 arXiv preprint 版本（建議閱讀，含 formal references、Liu et al. 2604.08407 prior-work 對位、IRB 自評）**

- 🇹🇼 繁體中文：[`docs/reports/2026-04-26-llm-resale-substitution-measurement-paper.arxiv.md`](docs/reports/2026-04-26-llm-resale-substitution-measurement-paper.arxiv.md)
- 🇬🇧 English: [`docs/reports/2026-04-26-llm-resale-substitution-measurement-paper.arxiv.en.md`](docs/reports/2026-04-26-llm-resale-substitution-measurement-paper.arxiv.en.md)

**📄 完整實證版本（含完整端點對應表、實驗附錄）**

- 🇹🇼 繁體中文：[`docs/reports/2026-04-26-llm-resale-substitution-measurement-paper.md`](docs/reports/2026-04-26-llm-resale-substitution-measurement-paper.md)
- 🇬🇧 English: [`docs/reports/2026-04-26-llm-resale-substitution-measurement-paper.en.md`](docs/reports/2026-04-26-llm-resale-substitution-measurement-paper.en.md)

**論文涵蓋**

- §3 四層獨立指紋偵測方法 — 本套件對應 ①②③④ 全部四層
- §5 14 天 / 171 中轉端點 / 625 探測 / 47 種宣稱模型的實地測量數據
- §6 五大偽裝型態分類學（跨家族冒充 / 同家族靜默降級 / 同家族靜默升級 / 版本標籤造假 / 提供商行為注入）+ R1 / R2 / R6 深度案例研究
- §7 消費者保護與政策意涵分析（D1 / D2 / D3 揭露義務建議）
- 附錄 C — 開源實作對應與本 v0.7.x 重現指引

**主結論摘要**

| 指標 | 數值 |
|---|---:|
| 同家族偽裝偵測（合成測試） | 94.4% TP / 0% FP（n=18+6） |
| 端點層級違規率（嚴格門檻：n≥5、≥20%） | 1.3% (2/149) |
| 端點層級違規率（放寬門檻：n≥1、≥1 次違規） | 9.9% (17/171) |
| 探測單次成本 | ~$0.003 USD（judge 端） |

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
  Score     : 92 / 100
  Results   : 44 passed  3 warning  3 failed  (50 total)
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

### Quality（品質）— 10 個探針

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
| prompt_injection_hard | exact_response | 強化提示注入測試（系統提示輔助） |

### Security（安全性）— 19 個探針

#### 基礎探針

| ID | 評分方式 | 說明 |
|---|---|---|
| infra_probe | keyword_match | 基礎設施資訊洩露偵測 |
| bedrock_probe | keyword_match | AWS Bedrock 識別碼洩露 |
| identity_leak | keyword_match | System prompt 洩露偵測 *(多語言：英/韓/繁中)* |

#### AC-1.a 供應鏈攻擊探針（arxiv 2604.08407）

| ID | 評分方式 | acCategory | 說明 |
|---|---|---|---|
| ac1a_prefill | keyword_match | AC-1.a | 預填充攻擊：assistant 訊息預注入 |
| ac1a_role_play | keyword_match | AC-1.a | 角色扮演繞過（"act as DAN"） |
| ac1a_nested_instruction | keyword_match | AC-1.a | 巢狀 XML/JSON 指令注入 |
| ac1a_ignore_previous | keyword_match | AC-1.a | "Ignore previous instructions" 變體 |
| ac1a_base64_bypass | keyword_match | AC-1.a | Base64 編碼繞過過濾 |
| ac1a_leetspeak | keyword_match | AC-1.a | Leet-speak 編碼繞過 |
| ac1a_unicode_homoglyph | keyword_match | AC-1.a | Unicode 同形字繞過 |
| ac1a_token_smuggling | keyword_match | AC-1.a | Token 走私：分割惡意 token |
| ac1a_context_overflow | keyword_match | AC-1.a | 大量 junk 上下文淹沒系統提示 |
| ac1a_system_prompt_echo | exact_response | AC-1.a | 誘導回應 system prompt 原文 |
| ac1a_prompt_augment | keyword_match | AC-1.a | 動態 canary 回放驗證 *(dynamicCanary)* |
| ac1a_indirect_injection | keyword_match | AC-1.a | 間接注入（工具/文件內容） |
| ac1a_tool_call_hijack | keyword_match | AC-1.a | 工具呼叫劫持 |
| ac1a_jailbreak_dev | keyword_match | AC-1.a | Developer mode 越獄 |
| ac1a_jailbreak_dan | keyword_match | AC-1.a | DAN 越獄 |
| ac1a_jailbreak_grandma | keyword_match | AC-1.a | Grandma exploit |
| ac1a_adversarial_suffix | keyword_match | AC-1.a | 對抗性後綴攻擊 |

#### AC-2 資料外滲探針

| ID | 評分方式 | acCategory | 說明 |
|---|---|---|---|
| ac2_url_exfil | keyword_match | AC-2 | URL 外滲（hidden pixel/fetch） |
| ac2_markdown_exfil | keyword_match | AC-2 | Markdown image 外滲 |
| ac2_covert_channel | keyword_match | AC-2 | 隱蔽通道外滲 |

### Integrity（完整性）— 10 個探針

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
| channel_signature | channel_signature | 通道簽名偵測（Anthropic/Bedrock/Vertex/Proxy） |
| response_augmentation | keyword_match | 動態 canary 回放完整性驗證 |

### Identity（身份識別）— 26 個探針 *(全部 neutral)*

#### 方向 A/B — 行為 & 風格（8 個）

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

#### 方向 C — Tokenizer 感知（3 個）

| ID | 評分方式 | 說明 |
|---|---|---|
| tok_count_num | feature_extract | 數字 token 計數（GPT tiktoken vs Claude BPE 答案不同） |
| tok_split_word | feature_extract | 詞分割風格（`tokenization` 的 BPE 切法） |
| tok_self_knowledge | feature_extract | Tokenizer 自我知識（模型對自身 tokenizer 的描述） |

#### 方向 D — 代碼風格（3 個）

| ID | 評分方式 | 說明 |
|---|---|---|
| code_reverse_list | feature_extract | Python 列表反轉風格（`[::-1]` vs `reversed()`） |
| code_comment_lang | feature_extract | 代碼注釋語言偏好（英文 / 中文 / 無） |
| code_error_style | feature_extract | 錯誤處理風格（`raise` vs `assert` vs `return None`） |

#### 方向 E — 自我知識（3 個）

| ID | 評分方式 | 說明 |
|---|---|---|
| meta_creator | feature_extract | 創造者名稱格式（Anthropic / OpenAI / Zhipu AI） |
| meta_context_len | feature_extract | Context 長度自報（數字本身即指紋） |
| meta_thinking_mode | feature_extract | Extended Thinking 支援自報（Opus/Sonnet yes，GPT no） |

#### 方向 F — 計算行為（2 個）

| ID | 評分方式 | 說明 |
|---|---|---|
| comp_py_float | feature_extract | Python 浮點表示（`0.1+0.2` 輸出精度知識） |
| comp_large_exp | feature_extract | 大數格式偏好（`2^32` 的表示方式） |

#### 方向 G — 時事知識截止（7 個）

| ID | 評分方式 | 說明 |
|---|---|---|
| ling_uk_pm | feature_extract | 英國首相（Starmer 2024/07+ vs Sunak） |
| ling_de_chan | feature_extract | 德國總理（Merz 2025/02+ vs Scholz） |
| ling_fr_pm | feature_extract | 法國總理（Bayrou 2025/01+ vs Barnier） |
| ling_jp_pm | feature_extract | 日本102代首相（石破茂 2024/10+ vs 岸田） |
| ling_ru_pres | feature_extract | 俄語姓名順序偏好（姓名順 vs 名姓順） |
| ling_kr_num | feature_extract | 韓語數字系統（漢字語 사십이 vs 固有語 마흔둘） |
| ling_kr_crisis | feature_extract | 韓國戒嚴事件（僅 2024/12 後訓練的模型知道） |

### Signature（簽章）— 1 個探針

| ID | 評分方式 | acCategory | 說明 |
|---|---|---|---|
| ac5_signature_verify | signature_verify | AC-5 | Anthropic 原生 API 簽章驗證（thinking block round-trip） |

### Multimodal（多模態）— 2 個探針

| ID | 評分方式 | 說明 |
|---|---|---|
| multimodal_image | keyword_match | 圖片內容解析（base64 PNG 紅色像素） |
| multimodal_pdf | keyword_match | PDF 文件解析（base64 PDF 含關鍵字） |

### Sub-Model（子模型識別）— 11 個探針 *(全部 neutral — 不計入分數)*

Sub-Model 探針收集每個 checkpoint 的固有行為特徵，供子模型分類器（`sub-model-matcher.ts`）用於區分同家族內的不同版本（如 Opus / Sonnet / Haiku）。

#### 能力懸崖（4 個）

| ID | 評分方式 | 說明 |
|---|---|---|
| cap_tower_of_hanoi | feature_extract | 4 盤河內塔（Opus ~100%、Sonnet ~85%、Haiku ~40% 解決率） |
| cap_letter_count | feature_extract | strawberry 字母計數（Haiku 歷史上常答錯） |
| cap_reverse_words | feature_extract | 句子逆序詞（準確度與模型大小正相關） |
| cap_needle_tiny | feature_extract | 微型 needle（Haiku 常漏掉精確短語） |

#### 冗長度 & 效能（2 個）

| ID | 評分方式 | 說明 |
|---|---|---|
| verb_explain_photosynthesis | feature_extract | 預設冗長度（Opus 詳盡，Haiku 精簡） |
| perf_bulk_echo | feature_extract | TPS 標定（固定 200 token 輸出取樣 TPS/TTFT） |

#### Tokenizer 邊界（1 個）

| ID | 評分方式 | 說明 |
|---|---|---|
| tok_edge_zwj | feature_extract | ZWJ emoji 人物計數（安全/格式層因 checkpoint 不同而異） |

#### 推理分佈指紋（1 個）

| ID | 評分方式 | 說明 |
|---|---|---|
| pi_fingerprint | feature_extract | 詞語計數 × 10 次（Opus 27-31，Sonnet 雙峰21-25/57，Haiku 57-62，GPT-4o 固定50） |

#### V3 直接識別探針（3 個）

| ID | 評分方式 | 說明 |
|---|---|---|
| submodel_cutoff | feature_extract | 直問 training cutoff（YYYY-MM 格式，各 checkpoint 自報值穩定唯一） |
| submodel_capability | feature_extract | 5 題能力電池（strawberry/星期推算/分數/第100質數/拼字反轉），每個 checkpoint 有固定錯誤向量 |
| submodel_refusal | feature_extract | 拒答模板提取（Opus 4.7 含 18 U.S.C. § 842 引用，跨 family 幾乎唯一） |

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
  claimedModel: "anthropic/claude-opus-4-6",
  baseline,           // 選填
  judge: {            // 選填：llm_judge 評分
    baseUrl: "https://api.openai.com/v1",
    apiKey: "<Judge用的API金鑰>",
    modelId: "gpt-4o-mini",
    threshold: 7,
  },
  // 選填：身份識別 LLM judge 訊號
  identityJudge: {
    baseUrl: "https://api.openai.com/v1",
    apiKey: "<Judge用的API金鑰>",
    modelId: "gpt-4o-mini",
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
      "group": "quality | security | integrity | identity | signature | multimodal | submodel",
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
  ],
  "identityAssessment": {
    "status": "match | mismatch | uncertain",
    "confidence": 0.87,
    "claimedModel": "anthropic/claude-opus-4-6",
    "predictedFamily": "anthropic",
    "predictedCandidates": [
      { "model": "Anthropic / Claude", "family": "anthropic", "score": 0.87, "reasons": ["Self-identified as Claude", "Markdown bold headers detected"] }
    ],
    "riskFlags": [],
    "evidence": ["Self-identified as Claude", "Refusal pattern: I cannot assist"]
  }
}
```

---

## 詐欺中轉站案例報告（real-world fraud reports）

BazaarLink 長期用本引擎對 500+ 公開 OpenAI-compatible proxy 做主動探測，公布的案例報告就直接放在本 repo：

**[📄 完整報告 → docs/fraud-reports.md](docs/fraud-reports.md)**（[EN](docs/fraud-reports.en.md) · [简](docs/fraud-reports.zh-CN.md)）

收錄兩份分析：

- **Report 1（2026-04-15）— 低分端點異常分析**：30 筆樣本、171 次探針失敗的成因分類。結論：**95% 以上的低分來自 infrastructure 層問題（SSE 空 body、KIRO wrapper 注入、token 膨脹），而非模型能力差。** 列出 20 個已確認異常的 host（含 gpt-5.4 假模型 ID、claude-opus-thinking 串流空白、KIRO 連鎖拒答、Cursor 62K token 注入等）。
- **Report 2（2026-04-21）— 端點身份分析**：7 個身份異常案例。用**三向交叉**（① 表面指紋 ② 行為指紋 ③ 子模型 V3）偵測：
  - 3 個**跨家族模型調包**（例：`api.getrouter.top` 聲稱 Claude Opus 4.7，指紋 98% 吻合 GPT-5.4）
  - 1 個**同家族降級詐欺**（`api.aipaibox.com` 聲稱 Opus 4.7、實為 Opus 4.6，帳單照 4.7 收費）
  - 3 個**無法確認的邊界案例**

三向交叉的核心邏輯就是本 engine 的 [`computeVerdict()`](src/identity-verdict.ts) + [`classifySubmodelV3()`](src/sub-model-classifier-v3.ts) — 你自己也能跑出一樣的結果。

互動版：<https://bazaarlink.ai/probe?tab=report>

---

## `proxy-watch` — 本地透明 Proxy 監控（AC-1.b 條件式注入偵測）

啟動一個本地 HTTP proxy server，將你的 app 流量透明轉發到目標 API，同時在背景分析每一筆請求與回應，偵測是否存在「只有在含有敏感 credentials 時才注入惡意代碼」的條件式攻擊模式（AC-1.b）。

### 工作原理

```
你的 App
    ↓  baseURL 改成 http://localhost:8787/v1
bazaarlink-probe proxy-watch  ← 在這裡記錄、分析
    ↓  透明轉發
可疑的第三方 API
    ↑  回應
bazaarlink-probe proxy-watch  ← 分析回應有無注入關鍵字
    ↑  原封不動回傳
你的 App（感覺不到任何差異）
```

### 快速使用

```bash
# 第一步：啟動 proxy-watch
bazaarlink-probe proxy-watch \
  --upstream https://openrouter.ai/api/v1 \
  --port 8787 \
  --log-file ./proxy-watch.ndjson

# 第二步：將你的 app 的 baseURL 改成：
# http://localhost:8787/v1
# API Key 照用不變，只換 URL 這一行
```

終端機即時顯示每筆請求：

```
bazaarlink-probe proxy-watch — 本地透明 Proxy
  Upstream  : https://openrouter.ai/api/v1
  Listen    : http://localhost:8787/v1
  Log file  : ./proxy-watch.ndjson
  Point your app's base_url at: http://localhost:8787/v1
──────────────────────────────────────────────────────────────
  Time      Profile     Status     Model                           Duration
  ────────────────────────────────────────────────────────────────────────────
  14:23:01  neutral      ✓ clean   openai/gpt-4o                    842ms
  14:23:15  sensitive    ✓ clean   openai/gpt-4o                    901ms
  14:23:28  neutral      ✓ clean   openai/gpt-4o                    756ms
  ...

  AC-1.b [5 req]: insufficient_data
           Need ≥3 neutral (have 3) and ≥3 sensitive (have 2) messages
```

Ctrl+C 停止後輸出最終 AC-1.b 判斷：

```
──────────────────────────────────────────────────────────────
  proxy-watch stopped.

  AC-1.b Assessment
  Verdict   : no_conditional_injection
  Reason    : Rates similar: sensitive 20% vs neutral 0%
  Neutral   : 8 requests, 0 anomalies
  Sensitive : 5 requests, 1 anomalies
  Total     : 13 requests logged
  Log file  : ./proxy-watch.ndjson
──────────────────────────────────────────────────────────────
```

### 完整參數

```
bazaarlink-probe proxy-watch [options]

必填：
  --upstream <url>         上游 API 的 Base URL（e.g. https://openrouter.ai/api/v1）

選填：
  --port <n>               本地監聽 port（預設：8787）
  --log-file <path>        NDJSON 記錄檔路徑（預設：./proxy-watch.ndjson）
                           重啟後自動繼續累積，不覆蓋
  --report-file <path>     停止時寫出 JSON 摘要報告（含 AC-1.b 結果 + 最後 20 筆 log）
  --alert-on-suspected     若 AC-1.b 判定為 suspected，以 exit code 2 退出
                           （可接 CI/PagerDuty/alerting 系統）
```

### 記錄格式（NDJSON）

每筆請求一行 JSON，可以用 `jq` 分析：

```bash
# 查看所有 sensitive 且有異常的請求
jq 'select(.profile == "sensitive" and .anomaly == true)' proxy-watch.ndjson

# 統計 anomaly 比例
jq -s '[.[] | .anomaly] | {total: length, anomalies: map(select(. == true)) | length}' proxy-watch.ndjson
```

記錄欄位：
```json
{
  "id": "plg_1713890400000_abc",
  "ts": "2026-04-12T14:23:01.000Z",
  "model": "openai/gpt-4o",
  "userContent": "What is recursion?",
  "assistantContent": "Recursion is...",
  "profile": "neutral",
  "anomaly": false,
  "injectionKeywordsFound": [],
  "inputTokens": 12,
  "outputTokens": 156,
  "durationMs": 842,
  "statusCode": 200,
  "error": null
}
```

### AC-1.b 判定邏輯

| 情況 | 判定 |
|------|------|
| neutral 或 sensitive 筆數 < 3 | `insufficient_data` |
| sensitive 異常率 ≥ neutral 異常率的 2 倍，且 sensitive 至少 1 筆異常 | `conditional_injection_suspected` 🔴 |
| 其他 | `no_conditional_injection` ✅ |

**AC-1.b 偵測的是什麼**：正常 API 對所有請求的行為應一致。如果 API 只有在偵測到使用者含有 `aws`、`api_key`、`token`、`secret` 等關鍵字時才在回應中注入 `exec()`、`curl`、`subprocess` 等惡意代碼，就是條件式注入攻擊。

---

## `monitor` — 定期主動探針監控

定期對端點執行完整的 50 項探針套件，追蹤分數變化，分數掉到閾值以下時 alert。

```bash
# 每 5 分鐘測一次，分數低於 70 就 alert
bazaarlink-probe monitor \
  --base-url https://openrouter.ai/api/v1 \
  --api-key <你的API金鑰> \
  --model openai/gpt-4o \
  --interval 300 \
  --alert-below 70 \
  --history-file ./monitor-history.jsonl
```

終端機即時顯示每次 run：

```
bazaarlink-probe monitor — 定期監控
  Endpoint  : https://openrouter.ai/api/v1
  Model     : openai/gpt-4o
  Interval  : 300s
  Alert if  : score < 70
──────────────────────────────────────────
  #    Time       Score     Δ    P   W   F  Duration
  ────────────────────────────────────────────────────
  1    14:00:00      85    --   18   1   0  42.3s
  2    14:05:00      85    +0   18   1   0  39.8s
  3    14:10:00      72   -13   15   1   3  44.1s

[ALERT] Score 72 dropped below threshold 70 at 2026-04-12T14:10:44Z
```

### 完整參數

```
bazaarlink-probe monitor [options]

必填：
  --base-url <url>         端點 Base URL
  --api-key <key>          API 金鑰
  --model <id>             模型 ID

選填：
  --interval <seconds>     每次 run 的間隔秒數（預設：300）
  --runs <n>               執行幾次後停止（預設：0 = 無限）
  --alert-below <score>    分數低於此值時輸出 ALERT（預設：60）
                           搭配 --alert-on-suspected 可接 exit code 2
  --timeout <ms>           每個探針逾時時間（預設：180000）
  --history-file <path>    每次 run 的摘要追加到此 JSONL 檔
  --baseline <file>        本地 baseline 檔（啟用 llm_judge 探針）
  --judge-base-url <url>
  --judge-api-key <key>
  --judge-model <id>
  --judge-threshold <n>    判斷閾值 1-10（預設：7）
  --claimed-model <model>  廠商宣稱的模型名稱（用於身份驗證對比）
```

### `proxy-watch` vs `monitor` 選哪個？

| | `proxy-watch`（被動監控）| `monitor`（主動探針）|
|---|---|---|
| **工作方式** | 在真實流量上攔截分析 | 主動發送 27 個測試請求 |
| **需要換 URL？** | ✅ 換一行 baseURL | ❌ 不用動 app 代碼 |
| **偵測能力** | 條件式注入（AC-1.b） | 品質下降、安全回退、模型置換 |
| **適合** | 懷疑第三方 proxy 有惡意行為 | 自己的 infra 定期 SLA 驗證 |

---

## `canary` — 10 題確定性快速健康檢查（無需 LLM Judge）

無需 Judge 模型，10 題純數學/邏輯/格式/召回/代碼題，全部有固定正確答案，可在 **數秒內** 判斷端點是否健康。適合 CI/CD 或頻繁的輕量 ping。

### 快速使用

```bash
bazaarlink-probe canary \
  --base-url https://openrouter.ai/api/v1 \
  --api-key <API 金鑰> \
  --model openai/gpt-4o
```

輸出範例：

```
bazaarlink-probe canary — 10-item deterministic quality baseline
  Endpoint : https://openrouter.ai/api/v1
  Model    : openai/gpt-4o

  ✓  math-mul      347 × 89 = ?              →  30883          (842ms)
  ✓  math-pow      2 ^ 16 = ?                →  65536          (201ms)
  ✓  math-mod      1000 mod 7 = ?            →  6              (188ms)
  ✓  logic-syl     All A are B. All B are C… →  Yes            (312ms)
  ✓  recall-cap    Capital of Australia?     →  Canberra        (234ms)
  ✓  recall-sym    Chemical symbol for gold? →  Au             (198ms)
  ✓  format-echo   Echo "BANANA" exactly     →  BANANA         (176ms)
  ✓  format-json   Return {"ok":true}        →  {"ok":true}    (203ms)
  ✓  code-rev      Python one-liner reverse  →  s[::-1]        (287ms)
  ✓  recall-year   Moon landing year?        →  1969           (211ms)

──────────────────────────────────────────────────
  Verdict  : healthy
  Score    : 10 / 10  (1.00)
  Latency  : 285ms avg
  Model    : openai/gpt-4o
──────────────────────────────────────────────────
```

### 判定標準

| Verdict | 條件 |
|---|---|
| `healthy` | 通過率 ≥ 80% |
| `degraded` | 通過率 50–79% |
| `failed` | 通過率 < 50% |
| `error` | 呼叫失敗（網路/認證錯誤） |

### 完整參數

```
bazaarlink-probe canary [options]

必填：
  --base-url <url>   OpenAI-compatible 端點 Base URL
  --api-key <key>    API 金鑰
  --model <id>       模型 ID

選填：
  --timeout <ms>     每題逾時時間（預設：60000）
  --output <file>    將 JSON 報告寫入檔案（預設：輸出至 stdout）
  --quiet            靜默模式，不輸出逐題進度
```

### 結束碼

- `0` — healthy 或 degraded
- `1` — failed 或 error

---

## 結束碼（全指令）

- `0` — `run`/`monitor`: 分數 ≥ 50；`proxy-watch`: 正常停止；`canary`: healthy/degraded
- `1` — `run`/`monitor`: 分數 < 50；`canary`: failed/error
- `2` — `proxy-watch --alert-on-suspected`: 偵測到條件式注入

---

## 開發與測試

### 環境準備

```bash
git clone https://github.com/Bazaarlinkorg/LLMprobe-engine
cd LLMprobe-engine
npm install
npm run build   # 編譯 TypeScript → dist/
```

### 執行測試

```bash
npm test                        # 執行全部 214 個測試（約 1 秒）
npm test -- --reporter=verbose  # 顯示每個測試的名稱與耗時
npm test -- --watch             # 監聽模式，存檔自動重跑
```

測試結果範例：

```
 Test Files  19 passed (19)
      Tests  214 passed (214)
   Duration  ~1.2s
```

### 測試涵蓋範圍（19 個測試檔，214 個測試）

| 測試檔 | 測試數 | 涵蓋模組 | 主要驗證項目 |
|---|---|---|---|
| `probe-suite.test.ts` | 34 | `probe-suite.ts` | 探針陣列結構驗證、所有評分模式（exact_match / keyword_match / header_check / llm_judge）邏輯、neutral 標記、optional 標記、signature/multimodal group |
| `proxy-analyzer.test.ts` | 27 | `proxy-analyzer.ts` | `profileRequest` sensitive/neutral 分類、`analyzeResponse` 注入關鍵字偵測（exec/eval/subprocess/curl 等）、AC-1.b 判定邏輯三種 verdict、`statsFromLogs` 統計計算 |
| `probe-preflight.test.ts` | 18 | `probe-preflight.ts` | HTTP 200–299 正常、401/403 中止、model_not_found 中止、429/5xx 警告、空 body / 非 JSON 邊界處理 |
| `probe-score.test.ts` | 13 | `probe-score.ts` | 滿分/零分計算、warning 計 0.5 分、neutral 不計入分母、null 雙向影響、error/skipped 計分、混合情境 |
| `signature-probe.test.ts` | 13 | `signature-probe.ts` | `buildRoundtripBody` 輸出結構驗證、`verifySignatureRoundtrip` 正常/錯誤/missing-block 路徑、token 計算 |
| `channel-signature.test.ts` | 13 | `channel-signature.ts` | Tier-1 確定性偵測（OpenRouter/Cloudflare/Azure/LiteLLM/Helicone/Portkey/Kong/DashScope/New-API/One-API）、Tier-2 評分（Bedrock/Vertex/Anthropic/APIGateway）、Tier-3 推斷（relay/unknown-proxy）、信心值計算 |
| `proxy-log-store.test.ts` | 11 | `proxy-log-store.ts` | NDJSON 讀寫、多筆 append、readLast(n)、跨實例持久化、畸形行跳過不拋錯、makeLogId 唯一性 |
| `sse-compliance.test.ts` | 11 | `sse-compliance.ts` | 格式正確的 SSE stream、缺少 [DONE]、空 stream、非 JSON chunk 偵測、無 choices 警告、失敗時不誤報警告 |
| `sub-model-matcher.test.ts` | 11 | `sub-model-matcher.ts` | `matchSubModels` top-5 限制、相似度四捨五入、`cosineSimilarity` 計算精確度、空輸入邊界 |
| `token-inflation.test.ts` | 10 | `token-inflation.ts` | prompt_tokens 閾值邊界、自訂閾值、inflation 金額回報、零分母邊界 |
| `context-check.test.ts` | 6 | `context-check.ts` | 所有層級通過、最小層級失敗、中段截斷警告、send 函式丟出例外 |
| `fingerprint-extractor.test.ts` | 7 | `fingerprint-extractor.ts` | Claude/GPT/Qwen 自我宣稱偵測、JSON 污染偵測、詞彙風格特徵、空輸入零訊號 |
| `fingerprint-fusion.test.ts` | 4 | `fingerprint-fusion.ts` | 三維融合評分（behavioral/linguistic/structural）、加權平均計算 |
| `fingerprint-judge.test.ts` | 6 | `fingerprint-judge.ts` | match/mismatch/uncertain 判定邏輯、信心閾值邊界 |
| `fingerprint-vectors.test.ts` | 6 | `fingerprint-vectors.ts` | 向量正規化、cosine distance 計算、零向量邊界 |
| `multimodal-fixtures.test.ts` | 6 | `multimodal-fixtures.ts` | base64 PNG/PDF fixture 生成、content-block 格式驗證 |
| `canary-bench.test.ts` | 5 | `canary-bench.ts` | 10 題 canary 題庫結構、verdict 分類（healthy/degraded/failed/error）、通過率計算 |
| `canary-runner.test.ts` | 7 | `canary-runner.ts` | HTTP 成功/失敗路徑、網路錯誤 → verdict=error、timeout 處理 |
| `candidate-matcher.test.ts` | 6 | `candidate-matcher.ts` | Anthropic/OpenAI 家族排序、最多回傳 3 候選、match/mismatch/uncertain verdict 推導 |

### 新增測試

測試檔放在 `src/__tests__/`，vitest 會自動掃描 `*.test.ts`：

```bash
# 建立新測試
touch src/__tests__/my-module.test.ts
# 然後直接執行
npm test
```

> `vitest.config.ts` 已設定排除 `dist/` 下的編譯產物，不會誤跑舊的 JS 版本。

---

## 線上工具

完整 Web UI（含 baseline 比對、歷史追蹤、詳細報告）：**[bazaarlink.ai/probe](https://bazaarlink.ai/probe)**

---

## 致謝

本工具參考並感謝以下開源專案的啟發與貢獻：

| 專案 | 授權 | 貢獻領域 |
|---|---|---|
| [LLMmap](https://github.com/pasquini-dario/LLMmap) | MIT | LLM 模型指紋識別技術 |
| [api-relay-audit](https://github.com/Troyanovsky/api-relay-audit) | MIT | 中轉站安全稽核方法論 |
| [relayAPI](https://github.com/easychen/relayapi) | — | 中轉站整理與分類資訊 |

---

## 授權

[AGPL-3.0-only](LICENSE) © BazaarLink

本專案以 GNU Affero General Public License v3 授權。若您將本軟體或衍生作品部署為網路服務，必須依 AGPL-3.0 條款公開對應的完整原始碼。
