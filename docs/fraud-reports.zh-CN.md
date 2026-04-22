# 欺诈中转站报告（Fraud Relay Station Reports）

[繁體中文](fraud-reports.md) | [English](fraud-reports.en.md) | **简体中文**

> 本报告是 BazaarLink 使用 `@bazaarlink/probe-engine` 对 500+ 公开 proxy / relay 端点持续检测后，汇总的真实结果摘要。完整交互版见 <https://bazaarlink.ai/probe?tab=report>。
>
> 目的：让开发者知道哪些 OpenAI-compatible 端点正在用"假模型 ID"、"系统提示伪装"、"token 膨胀计费"等手法欺诈用户。

---

## 总览

本文收录两份已发表的分析：

| 报告 | 更新日期 | 样本 | 主轴 |
|---|---|---|---|
| [Report 1](#report-1--低分端点异常分析) | 2026-04-15 | 30 个合格样本（从 204 个低分筛出）、表中列 20 个 | 探针总分 ≤ 65 的中转站，成因分类 |
| [Report 2](#report-2--端点身份分析421) | 2026-04-21 | 7 个身份异常案例 | 三向交叉（surface / behavior / v3）检测模型调包、子模型降级 |

---

## Report 1 — 低分端点异常分析

> 数据源：`probe_history`，筛选 score ≤ 65、有 judge baseline、端点响应正常（错误 ≤5、完成 ≥10）；排除 gpt-5.4-pro 变体。

### 统计

| 指标 | 数值 |
|---|---|
| 合格样本 | 30 |
| 总失败探针 | 171 |
| 异常服务器 | 30 |
| 主因比例 | SSE 流 / 空白 ~70%（**非模型能力问题**） |

### 失败原因分布（171 次失败）

| 原因 | 次数 | 比例 |
|---|---:|---:|
| Judge very low (1-2/10) | 95 | 55% |
| KIRO 拒答 | 46 | 27% |
| SSE 流损坏 | 16 | 9% |
| Token 膨胀 | 7 | 4% |
| 答案错误 | 4 | 2% |
| Judge low (3-5/10) | 3 | 2% |

### 类别 1：SSE 流空白（claude-thinking 重灾区）

- **数量**：6 个端点（20%）
- **特征**：claude-thinking 系列在第一个 chunk 就返回空 body（keep-alive empty body bug），下游所有探针都拿不到内容，judge 对照 baseline 一律打 1/10。
- **受影响探针**：`sse_compliance` 及所有品质探针连锁失败
- **结论**：Infrastructure 层问题，非模型能力差

### 类别 2：假模型 ID / 路由回空

- **数量**：5 个端点（17%）
- **特征**：provider 声称 gpt-5.4 / gpt-5.4-pro / claude-opus-4-6，实际模型不存在或未处理即回空字符串。所有 13 个探针 judge 全打 1/10 并附注"候选回答完全空白"。
- **结论**：端点根本没接通上游

### 类别 3：KIRO wrapper 拒答连锁

- **数量**：3 个端点（10%，但贡献 46 次失败）
- **特征**：Kiro / Amazon Q Developer 注入系统提示强制限定程序问题，所有 reasoning / censorship / hallucination 类通识探针被拒答。Judge 评语："候选响应完全拒绝回答并声称自己仅限于技术任务"。
- **受影响探针**：`infra_probe`、`identity_leak`、`censorship`、`math_logic`、`code_gen`
- **结论**：Wrapper 干预，底层模型可能仍是 Claude

### 类别 4：纯 Token 膨胀（无拒答行为）

- **数量**：3 个端点（10%）
- **特征**：隐藏 system prompt，无 KIRO 拒答特征，但 `prompt_tokens` 异常偏高（427 ~ 62,460）。cursorlinkai.com 的 62K token 是 Cursor IDE 整个 tool list 一起塞进请求。
- **受影响探针**：`token_inflation`、`context_length`（连带）
- **结论**：Middleware 插入，消耗用户 context 被灌水计费

### 类别 5：单点能力缺陷（配置问题）

- **数量**：3 个端点
- **特征**：`multimodal_pdf` 失败代表 PDF 附件未转发；`context_length` 在 4K chars 就截断表示廉价路由或配置错误。
- **受影响探针**：`multimodal_pdf`、`context_length`
- **结论**：Provider 设定错误

### 异常服务器总表（20 条）

| Host | Score | 类别 | 声称模型 | 日期 | 异常描述 |
|---|---:|---|---|---|---|
| api.vectorengine.ai | 17 | SSE 空白 | claude-opus-4-6-thinking / haiku-4-5-thinking | 2026-04-06 | Stream is empty（keep-alive 空 body） |
| globalai.vip | 17 | SSE 空白 | claude-opus-4-6-thinking | 2026-04-06 | Stream is empty |
| api.howlife.cc | 17 | SSE 空白 | Chat:claude-opus-4-6-thinking | 2026-04-06 | Stream is empty |
| cc.580ai.net | 17 | SSE 空白 | claude-opus-4-6-thinking | 2026-04-06 | Stream is empty |
| code.ai80.vip | 17 | SSE 空白 | claude-2.0 | 2026-04-06 | Stream is empty |
| ai.aiilove.shop | 16 | SSE 空白 | * | 2026-04-06 | SSE 空 body + context_length 失败 |
| geek.tm2.xin | 16 | 假模型 ID | gpt-5.4 | 2026-04-06 | 13 个探针 judge 全打 1/10"候选回答完全空白" |
| gptrr.995579.xyz | 17 | 假模型 ID | gpt-5.4 | 2026-04-06 | 13 个探针 judge 全打 1/10 |
| aiapis.help | 17 | 假模型 ID | gpt-5.4 | 2026-04-06 | 响应空白 |
| www.intelalloc.com | 17 | 假模型 ID | gpt-5.4 | 2026-04-06 | 响应空白 |
| 4sapi.net | 16 | 假模型 ID | claude-opus-4-6 | 2026-04-06 | 声称 claude 但返回空字符串 |
| test.queqiao.online | 30 | KIRO wrapper | claude-opus-4-6 | 2026-04-13 | 26 个失败，供应链 + reasoning + censorship 全倒 |
| key.simpleai.com.cn | 47 | KIRO wrapper | claude-opus-4-6 | 2026-04-09 | KIRO 拒答 + token 膨胀 + 流空 body 三重打击 |
| api.cpass.cc | 55 | KIRO wrapper | claude-sonnet-4-6 | 2026-04-07 | KIRO 拒答 + cache_detection + token_inflation |
| cursorlinkai.com | 47 | Token 膨胀 | claude-opus-4-6-thinking | 2026-04-09 | prompt_tokens=62460（极端）+ sse 失败 |
| api.squarefaceicon.org | 56 | Token 膨胀 | claude-opus-4-6-thinking | 2026-04-09 | prompt_tokens=2202 注入 |
| api.aipaibox.com | 61 | Token 膨胀 | claude-opus-4-6-thinking | 2026-04-08 | prompt_tokens=427 注入 |
| api.skyapi.org | 63 | 能力缺陷 | claude-opus-4-5-20251101 | 2026-04-14 | multimodal_pdf 未转发 |
| api.kksj.org | 36 | 能力缺陷 | grok-4.2 | 2026-04-14 | multimodal_pdf 失败 |
| oai2api.com | 61 | 能力缺陷 | gpt-5.2 | 2026-04-06 | context_length 在 4K chars 即截断 |

### Report 1 结论

1. **Score 16–17 群组 = SSE 流直接空 body**，claude-thinking 模型特别容易触发（~10 条集中在 thinking 变体）。建议对 thinking 模型加强空 body 警告。
2. **KIRO 连锁失败是中段分数（30–55）主因**，与 token 膨胀高度共现。
3. **纯能力 / 品质差导致的低分非常少（<5 条）**，绝大多数低分都是 infrastructure 层（SSE、wrapper、膨胀）而非模型本身。

---

## Report 2 — 端点身份分析（4/21）

> 数据源：`probe_history` 中经深度指纹识别（v3 家族 + 子模型）标记为异常的端点。检测方式：三向交叉（surface / behavior / v3）。

### 统计

| 指标 | 数值 |
|---|---:|
| 身份异常案例 | 7 |
| 模型调包（跨家族） | 3 |
| 子模型降级（同家族） | 1 |
| 无法确认身份 | 3 |

### 类别 1：模型调包（跨家族）

- **数量**：3 个端点
- **特征**：端点声称某一家族（如 Anthropic Claude），但深度指纹识别到的特征与另一家族高度匹配。属**最高危**级别。
- **结论**：主动欺骗 — 底层模型与声称家族不符

### 类别 2：子模型降级（同家族）

- **数量**：1 个端点
- **特征**：端点在同一家族内声称高阶模型（如 Opus 4.7），但深度指纹识别到的是低阶／旧版模型（如 Opus 4.6）。整体分数可能 90+，只有子模型比对才能抓到。
- **结论**：降级欺诈 — 账单计高阶但服务的是低阶

### 类别 3：无法确认子模型（top-2 太接近）

- **数量**：3 个端点
- **特征**：端点声称特定子模型版本，整体探测分数尚可，但指纹比对时 top-2 候选模型差距 < 5%，无法确定具体版本。可能是模型版本漂移、partial routing 或行为偏差。
- **结论**：身份不确定，需持续观察

### 全部案例（7 条）

| Host | Score | 声称模型 | 家族 | 实际识别 | 相似度 | 类别 | 日期 | 异常说明 |
|---|---:|---|---|---|---:|---|---|---|
| api.getrouter.top | 95 | claude-opus-4-7 | Anthropic | GPT-5.4 | 98% | 模型调包 | 2026-04-20 | 声称 Claude Opus，指纹高度吻合 OpenAI GPT-5.4（98%）——典型跨家族调包 |
| www.aitokens.link | 79 | gpt-5-codex | OpenAI | GPT-5.4 | 93% | 模型调包 | 2026-04-20 | 声称 gpt-5-codex，实际指纹是 GPT-5.4（93%）——子模型层级错误 |
| 119.45.125.109 | 86 | claude-opus-4-7 | Anthropic | OpenAI family | — | 模型调包 | 2026-04-20 | 声称 Claude Opus，指纹识别为 OpenAI 家族 |
| api.aipaibox.com | 95 | claude-opus-4-7 | Anthropic | Claude Opus 4.6 | 90% | 子模型降级 | 2026-04-20 | 声称 Opus 4.7，实际 4.6（同家族降级 90%）——账单计 4.7 但服务的是旧版 |
| mg.aid.pub | 96 | Claude-Opus-4.6 | Anthropic | 无法确认 | — | 无法确认 | 2026-04-21 | q2 答 Monday（应为 Tuesday）、拒答仅 85 tokens（Opus 均值 ~1023）、指纹 top-2 差距 < 5% |
| hboom.ai | 92 | claude-opus-4-7 | Anthropic | 无法确认 | — | 无法确认 | 2026-04-20 | 声称 Opus 4.7，家族相符但子模型版本无法确认（Opus 4.6 vs 4.7 太接近） |
| www.findcg.com | 88 | claude-opus-4-7 | Anthropic | 无法确认 | — | 无法确认 | 2026-04-20 | 声称 Opus 4.7，子模型 top-2 候选差距太近、无法精确指认 |

### Report 2 结论

1. **最高危是跨家族模型调包** — 有端点声称 Claude Opus 但响应指纹高度吻合 GPT-5 或 Gemini；这类账单会按 Claude 收费，服务的却是另一个厂商的模型。
2. **同家族降级（如 Opus 4.7 → 4.6）是最隐蔽的一类** — 整体分数可能 90+，只有子模型比对才能抓到，但账单计的是高阶版本。
3. **无法确认身份不一定代表欺诈** — 分数 96 的端点仍可能因为 top-2 模型太接近（如 Opus 4.5 vs 4.7）而无法精确指认，但若同时出现行为异常（答错基本题、拒答太短）则需深入调查。

---

## 如何自己检测这些模式？

本仓库的 `computeVerdict()` + `classifySubmodelV3()` 就是 Report 2 的检测逻辑：

```typescript
import {
  computeVerdict,
  classifySubmodelV3,
} from "@bazaarlink/probe-engine";

// ① surface：端点自称（可被 system prompt 伪造）
// ② behavior：家族分类器把 selfClaim 归零后的结果（难以伪造）
// ③ v3：子模型指纹分类器（cutoff + capability + refusal，极难伪造）

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

完整 CLI 流程请见 [README](../README.zh-CN.md) "快速开始"章节。

---

## 免责声明

- 本报告中所列端点的行为为 BazaarLink 检测当日（见 date 列）的观察；端点行为可能随后改变。
- "无法确认身份"**不等于欺诈**，只代表当前的指纹证据不足以下结论。
- 报告通过机器检测产生；如果你运营这些端点并认为分类有误，请通过 BazaarLink 客服联系。
