# 詐欺中轉站報告（Fraud Relay Station Reports）

**繁體中文** | [English](fraud-reports.en.md) | [简体中文](fraud-reports.zh-CN.md)

> 此報告是 BazaarLink 使用 `@bazaarlink/probe-engine` 對 500+ 公開 proxy / relay 端點持續偵測後，彙整的真實結果摘要。完整互動版見 <https://bazaarlink.ai/probe?tab=report>。
>
> 目的：讓開發者知道哪些 OpenAI-compatible 端點正在用「假模型 ID」、「系統提示偽裝」、「token 膨脹計費」等手法詐騙使用者。

---

## 總覽

本文收錄兩份已發表的分析：

| 報告 | 更新日期 | 樣本 | 主軸 |
|---|---|---|---|
| [Report 1](#report-1--低分端點異常分析) | 2026-04-15 | 30 筆合格樣本（從 204 筆低分篩出）、表中列 20 筆 | 探針總分 ≤ 65 的中轉站，成因分類 |
| [Report 2](#report-2--端點身份分析421) | 2026-04-21 | 7 個身份異常案例 | 三向交叉（surface / behavior / v3）偵測模型調包、子模型降級 |

---

## Report 1 — 低分端點異常分析

> 資料源：`probe_history`，篩選 score ≤ 65、有 judge baseline、端點響應正常（錯誤 ≤5、完成 ≥10）；排除 gpt-5.4-pro 變體。

### 統計

| 指標 | 數值 |
|---|---|
| 合格樣本 | 30 |
| 總失敗探針 | 171 |
| 異常伺服器 | 30 |
| 主因比例 | SSE 串流 / 空白 ~70%（**非模型能力問題**） |

### 失敗原因分布（171 次失敗）

| 原因 | 次數 | 比例 |
|---|---:|---:|
| Judge very low (1-2/10) | 95 | 55% |
| KIRO 拒答 | 46 | 27% |
| SSE 串流損壞 | 16 | 9% |
| Token 膨脹 | 7 | 4% |
| 答案錯誤 | 4 | 2% |
| Judge low (3-5/10) | 3 | 2% |

### 類別 1：SSE 串流空白（claude-thinking 重災區）

- **數量**：6 個端點（20%）
- **特徵**：claude-thinking 系列在第一個 chunk 就回傳空 body（keep-alive empty body bug），下游所有探針都拿不到內容，judge 對照 baseline 一律打 1/10。
- **受影響探針**：`sse_compliance` 以及所有品質探針連鎖失敗
- **結論**：Infrastructure 層問題，非模型能力差

### 類別 2：假模型 ID / 路由回空

- **數量**：5 個端點（17%）
- **特徵**：provider 聲稱 gpt-5.4 / gpt-5.4-pro / claude-opus-4-6，實際模型不存在或未處理即回空字串。所有 13 個探針 judge 全打 1/10 並附註「候選回答完全空白」。
- **結論**：端點根本沒接通上游

### 類別 3：KIRO wrapper 拒答連鎖

- **數量**：3 個端點（10%，但貢獻 46 次失敗）
- **特徵**：Kiro / Amazon Q Developer 注入系統提示強制限定程式問題，所有 reasoning / censorship / hallucination 類通識探針被拒答。Judge 評語：「候選回應完全拒絕回答並聲稱自己僅限於技術任務」。
- **受影響探針**：`infra_probe`、`identity_leak`、`censorship`、`math_logic`、`code_gen`
- **結論**：Wrapper 干預，底層模型可能仍是 Claude

### 類別 4：純 Token 膨脹（無拒答行為）

- **數量**：3 個端點（10%）
- **特徵**：隱藏 system prompt，無 KIRO 拒答特徵，但 `prompt_tokens` 異常偏高（427 ~ 62,460）。cursorlinkai.com 的 62K token 是 Cursor IDE 整個 tool list 一起塞進請求。
- **受影響探針**：`token_inflation`、`context_length`（連帶）
- **結論**：Middleware 插入，消耗使用者 context 被灌水計費

### 類別 5：單點能力缺陷（配置問題）

- **數量**：3 個端點
- **特徵**：`multimodal_pdf` 失敗代表 PDF 附件未轉發；`context_length` 在 4K chars 就截斷表示廉價路由或配置錯誤。
- **受影響探針**：`multimodal_pdf`、`context_length`
- **結論**：Provider 設定錯誤

### 異常伺服器總表（20 筆）

| Host | Score | 類別 | 聲稱模型 | 日期 | 異常描述 |
|---|---:|---|---|---|---|
| api.vectorengine.ai | 17 | SSE 空白 | claude-opus-4-6-thinking / haiku-4-5-thinking | 2026-04-06 | Stream is empty（keep-alive 空 body） |
| globalai.vip | 17 | SSE 空白 | claude-opus-4-6-thinking | 2026-04-06 | Stream is empty |
| api.howlife.cc | 17 | SSE 空白 | Chat:claude-opus-4-6-thinking | 2026-04-06 | Stream is empty |
| cc.580ai.net | 17 | SSE 空白 | claude-opus-4-6-thinking | 2026-04-06 | Stream is empty |
| code.ai80.vip | 17 | SSE 空白 | claude-2.0 | 2026-04-06 | Stream is empty |
| ai.aiilove.shop | 16 | SSE 空白 | * | 2026-04-06 | SSE 空 body + context_length 失敗 |
| geek.tm2.xin | 16 | 假模型 ID | gpt-5.4 | 2026-04-06 | 13 個探針 judge 全打 1/10「候選回答完全空白」 |
| gptrr.995579.xyz | 17 | 假模型 ID | gpt-5.4 | 2026-04-06 | 13 個探針 judge 全打 1/10 |
| aiapis.help | 17 | 假模型 ID | gpt-5.4 | 2026-04-06 | 回應空白 |
| www.intelalloc.com | 17 | 假模型 ID | gpt-5.4 | 2026-04-06 | 回應空白 |
| 4sapi.net | 16 | 假模型 ID | claude-opus-4-6 | 2026-04-06 | 宣稱 claude 但回傳空字串 |
| test.queqiao.online | 30 | KIRO wrapper | claude-opus-4-6 | 2026-04-13 | 26 個失敗，供應鏈 + reasoning + censorship 全倒 |
| key.simpleai.com.cn | 47 | KIRO wrapper | claude-opus-4-6 | 2026-04-09 | KIRO 拒答 + token 膨脹 + 串流空 body 三重打擊 |
| api.cpass.cc | 55 | KIRO wrapper | claude-sonnet-4-6 | 2026-04-07 | KIRO 拒答 + cache_detection + token_inflation |
| cursorlinkai.com | 47 | Token 膨脹 | claude-opus-4-6-thinking | 2026-04-09 | prompt_tokens=62460（極端）+ sse 失敗 |
| api.squarefaceicon.org | 56 | Token 膨脹 | claude-opus-4-6-thinking | 2026-04-09 | prompt_tokens=2202 注入 |
| api.aipaibox.com | 61 | Token 膨脹 | claude-opus-4-6-thinking | 2026-04-08 | prompt_tokens=427 注入 |
| api.skyapi.org | 63 | 能力缺陷 | claude-opus-4-5-20251101 | 2026-04-14 | multimodal_pdf 未轉發 |
| api.kksj.org | 36 | 能力缺陷 | grok-4.2 | 2026-04-14 | multimodal_pdf 失敗 |
| oai2api.com | 61 | 能力缺陷 | gpt-5.2 | 2026-04-06 | context_length 在 4K chars 即截斷 |

### Report 1 結論

1. **Score 16–17 群組 = SSE 串流直接空 body**，claude-thinking 模型特別容易觸發（~10 筆集中在 thinking 變體）。建議對 thinking 模型強化空 body 警告。
2. **KIRO 連鎖失敗是中段分數（30–55）主因**，跟 token 膨脹高度共現。
3. **純能力 / 品質差導致的低分非常少（<5 筆）**，絕大多數低分都是 infrastructure 層（SSE、wrapper、膨脹）而非模型本身。

---

## Report 2 — 端點身份分析（4/21）

> 資料源：`probe_history` 中經深度指紋識別（v3 家族 + 子模型）標記為異常的端點。偵測方式：三向交叉（surface / behavior / v3）。

### 統計

| 指標 | 數值 |
|---|---:|
| 身份異常案例 | 7 |
| 模型調包（跨家族） | 3 |
| 子模型降級（同家族） | 1 |
| 無法確認身份 | 3 |

### 類別 1：模型調包（跨家族）

- **數量**：3 個端點
- **特徵**：端點聲稱某一家族（如 Anthropic Claude），但深度指紋識別到的特徵與另一家族高度匹配。屬**最高危**級別。
- **結論**：主動欺騙 — 底層模型與聲稱家族不符

### 類別 2：子模型降級（同家族）

- **數量**：1 個端點
- **特徵**：端點在同一家族內聲稱高階模型（如 Opus 4.7），但深度指紋識別到的是低階／舊版模型（如 Opus 4.6）。整體分數可能 90+，只有子模型比對才能抓到。
- **結論**：降級詐欺 — 帳單計高階但服務的是低階

### 類別 3：無法確認子模型（top-2 太接近）

- **數量**：3 個端點
- **特徵**：端點聲稱特定子模型版本，整體探測分數尚可，但指紋比對時 top-2 候選模型差距 < 5%，無法確定具體版本。可能是模型版本漂移、partial routing 或行為偏差。
- **結論**：身份不確定，需持續觀察

### 全部案例（7 筆）

| Host | Score | 聲稱模型 | 家族 | 實際識別 | 相似度 | 類別 | 日期 | 異常說明 |
|---|---:|---|---|---|---:|---|---|---|
| api.getrouter.top | 95 | claude-opus-4-7 | Anthropic | GPT-5.4 | 98% | 模型調包 | 2026-04-20 | 聲稱 Claude Opus，指紋高度吻合 OpenAI GPT-5.4（98%）——典型跨家族調包 |
| www.aitokens.link | 79 | gpt-5-codex | OpenAI | GPT-5.4 | 93% | 模型調包 | 2026-04-20 | 聲稱 gpt-5-codex，實際指紋是 GPT-5.4（93%）——子模型層級錯誤 |
| 119.45.125.109 | 86 | claude-opus-4-7 | Anthropic | OpenAI family | — | 模型調包 | 2026-04-20 | 聲稱 Claude Opus，指紋識別為 OpenAI 家族 |
| api.aipaibox.com | 95 | claude-opus-4-7 | Anthropic | Claude Opus 4.6 | 90% | 子模型降級 | 2026-04-20 | 聲稱 Opus 4.7，實際 4.6（同家族降級 90%）——帳單計 4.7 但服務的是舊版 |
| mg.aid.pub | 96 | Claude-Opus-4.6 | Anthropic | 無法確認 | — | 無法確認 | 2026-04-21 | q2 答 Monday（應為 Tuesday）、拒答僅 85 tokens（Opus 均值 ~1023）、指紋 top-2 差距 < 5% |
| hboom.ai | 92 | claude-opus-4-7 | Anthropic | 無法確認 | — | 無法確認 | 2026-04-20 | 聲稱 Opus 4.7，家族相符但子模型版本無法確認（Opus 4.6 vs 4.7 太接近） |
| www.findcg.com | 88 | claude-opus-4-7 | Anthropic | 無法確認 | — | 無法確認 | 2026-04-20 | 聲稱 Opus 4.7，子模型 top-2 候選差距太近、無法精確指認 |

### Report 2 結論

1. **最高危是跨家族模型調包** — 有端點聲稱 Claude Opus 但回應指紋高度吻合 GPT-5 或 Gemini；這類帳單會按 Claude 收費，服務的卻是另一個廠商的模型。
2. **同家族降級（如 Opus 4.7 → 4.6）是最隱蔽的一類** — 整體分數可能 90+，只有子模型比對才能抓到，但帳單計的是高階版本。
3. **無法確認身份不一定代表詐欺** — 分數 96 的端點仍可能因為 top-2 模型太接近（如 Opus 4.5 vs 4.7）而無法精確指認，但若同時出現行為異常（答錯基本題、拒答太短）則需深入調查。

---

## 如何自己偵測這些模式？

本倉庫的 `computeVerdict()` + `classifySubmodelV3()` 就是 Report 2 的偵測邏輯：

```typescript
import {
  computeVerdict,
  classifySubmodelV3,
} from "@bazaarlink/probe-engine";

// ① surface：端點自稱（可被 system prompt 偽造）
// ② behavior：家族分類器把 selfClaim 歸零後的結果（難以偽造）
// ③ v3：子模型指紋分類器（cutoff + capability + refusal，極難偽造）

const verdict = computeVerdict({
  claimedFamily: "anthropic",
  claimedModel: "anthropic/claude-opus-4.7",
  surface:  { family: "anthropic", score: 0.95 },
  behavior: { family: "openai",    score: 0.85 },
  v3:       { family: "openai", modelId: "openai/gpt-5.4",
              displayName: "GPT-5.4", score: 0.92 },
});
// → status: "spoof_selfclaim_forged"
// → trueFamily: "openai", spoofMethod: "selfclaim_forged"
```

完整 CLI 流程請見 [README](../README.md)「快速開始」章節。

---

## 免責聲明

- 本報告中所列端點的行為為 BazaarLink 偵測當日（見 date 欄）的觀察；端點行為可能隨後改變。
- 「無法確認身份」**不等於詐欺**，只代表目前的指紋證據不足以下定論。
- 報告透過機器偵測產生；如果你經營這些端點並認為分類有誤，請透過 BazaarLink 客服聯絡。
