# Fraud Relay Station Reports

[繁體中文](fraud-reports.md) | **English** | [简体中文](fraud-reports.zh-CN.md)

> This document is a real-world summary of BazaarLink's continuous probing of 500+ public OpenAI-compatible proxy / relay endpoints using `@bazaarlink/probe-engine`. Live interactive version: <https://bazaarlink.ai/probe?tab=report>.
>
> Purpose: let developers know which OpenAI-compatible endpoints are actively defrauding users via fake model IDs, system-prompt identity spoofing, or token-inflation billing.

---

## Overview

Two published analyses are included below:

| Report | Updated | Sample | Focus |
|---|---|---|---|
| [Report 1](#report-1--low-score-endpoint-anomalies) | 2026-04-15 | 30 qualifying samples (from 204 low-score rows); 20 tabulated here | Root-cause taxonomy of relays with probe score ≤ 65 |
| [Report 2](#report-2--endpoint-identity-analysis-421) | 2026-04-21 | 7 identity anomalies | Three-way cross-check (surface / behavior / v3) for model swap & sub-model downgrade |

---

## Report 1 — Low-Score Endpoint Anomalies

> Source: `probe_history`, filtered to score ≤ 65, with judge baseline, endpoint responsive (≤ 5 errors, ≥ 10 completed); excludes gpt-5.4-pro variants.

### Statistics

| Metric | Value |
|---|---|
| Qualifying samples | 30 |
| Total failed probes | 171 |
| Anomalous servers | 30 |
| Primary cause | SSE stream / empty body ~70% (**infrastructure, not model capability**) |

### Failure Distribution (171 failures)

| Reason | Count | % |
|---|---:|---:|
| Judge very low (1–2/10) | 95 | 55% |
| KIRO refusal | 46 | 27% |
| SSE stream broken | 16 | 9% |
| Token inflation | 7 | 4% |
| Wrong answer | 4 | 2% |
| Judge low (3–5/10) | 3 | 2% |

### Category 1: SSE Empty Stream (claude-thinking hotspot)

- **Count**: 6 endpoints (20%)
- **Pattern**: claude-thinking family returns an empty body on the very first chunk (keep-alive empty-body bug). Downstream probes cannot extract content; judge scores all 1/10 against baseline.
- **Probes affected**: `sse_compliance` plus cascading quality-probe failures
- **Verdict**: Infrastructure-layer issue, not model capability

### Category 2: Fake Model ID / Empty Routing

- **Count**: 5 endpoints (17%)
- **Pattern**: Provider claims `gpt-5.4` / `gpt-5.4-pro` / `claude-opus-4-6`, but the model doesn't exist or the endpoint returns an empty string without processing. All 13 probes get judge=1/10 with verdict "candidate response completely empty."
- **Verdict**: Endpoint is not actually connected to any upstream.

### Category 3: KIRO Wrapper Refusal Chain

- **Count**: 3 endpoints (10%, but contribute 46 failures)
- **Pattern**: Kiro / Amazon Q Developer injects a system prompt constraining the model to programming tasks only. All reasoning / censorship / hallucination general-knowledge probes get refused. Judge verdict: "candidate response completely refuses and claims to be limited to technical tasks."
- **Probes affected**: `infra_probe`, `identity_leak`, `censorship`, `math_logic`, `code_gen`
- **Verdict**: Wrapper interference — underlying model may still be Claude.

### Category 4: Pure Token Inflation (no refusal behavior)

- **Count**: 3 endpoints (10%)
- **Pattern**: Hidden system prompt, no KIRO refusal signature, but `prompt_tokens` abnormally inflated (427 ~ 62,460). cursorlinkai.com's 62K tokens is the entire Cursor IDE tool-list injected into each request.
- **Probes affected**: `token_inflation`, `context_length` (collateral)
- **Verdict**: Middleware injection — user's context consumed and billed.

### Category 5: Capability Gap (configuration issue)

- **Count**: 3 endpoints
- **Pattern**: `multimodal_pdf` failure → PDF attachment not forwarded; `context_length` truncating at 4K chars → cheap routing or misconfiguration.
- **Probes affected**: `multimodal_pdf`, `context_length`
- **Verdict**: Provider configuration error.

### Full Anomalous-Server Table (20 rows)

| Host | Score | Category | Claimed Model | Date | Note |
|---|---:|---|---|---|---|
| api.vectorengine.ai | 17 | SSE empty | claude-opus-4-6-thinking / haiku-4-5-thinking | 2026-04-06 | Stream is empty (keep-alive empty body) |
| globalai.vip | 17 | SSE empty | claude-opus-4-6-thinking | 2026-04-06 | Stream is empty |
| api.howlife.cc | 17 | SSE empty | Chat:claude-opus-4-6-thinking | 2026-04-06 | Stream is empty |
| cc.580ai.net | 17 | SSE empty | claude-opus-4-6-thinking | 2026-04-06 | Stream is empty |
| code.ai80.vip | 17 | SSE empty | claude-2.0 | 2026-04-06 | Stream is empty |
| ai.aiilove.shop | 16 | SSE empty | * | 2026-04-06 | SSE empty body + context_length fail |
| geek.tm2.xin | 16 | Fake model | gpt-5.4 | 2026-04-06 | 13 probes judge 1/10 — "candidate response completely empty" |
| gptrr.995579.xyz | 17 | Fake model | gpt-5.4 | 2026-04-06 | 13 probes judge 1/10 |
| aiapis.help | 17 | Fake model | gpt-5.4 | 2026-04-06 | Empty response |
| www.intelalloc.com | 17 | Fake model | gpt-5.4 | 2026-04-06 | Empty response |
| 4sapi.net | 16 | Fake model | claude-opus-4-6 | 2026-04-06 | Claims Claude but returns empty string |
| test.queqiao.online | 30 | KIRO wrapper | claude-opus-4-6 | 2026-04-13 | 26 failures; supply-chain + reasoning + censorship all down |
| key.simpleai.com.cn | 47 | KIRO wrapper | claude-opus-4-6 | 2026-04-09 | KIRO refusal + token inflation + SSE empty body triple-strike |
| api.cpass.cc | 55 | KIRO wrapper | claude-sonnet-4-6 | 2026-04-07 | KIRO refusal + cache_detection + token_inflation |
| cursorlinkai.com | 47 | Token inflation | claude-opus-4-6-thinking | 2026-04-09 | prompt_tokens=62460 (extreme) + SSE fail |
| api.squarefaceicon.org | 56 | Token inflation | claude-opus-4-6-thinking | 2026-04-09 | prompt_tokens=2202 injection |
| api.aipaibox.com | 61 | Token inflation | claude-opus-4-6-thinking | 2026-04-08 | prompt_tokens=427 injection |
| api.skyapi.org | 63 | Capability gap | claude-opus-4-5-20251101 | 2026-04-14 | multimodal_pdf not forwarded |
| api.kksj.org | 36 | Capability gap | grok-4.2 | 2026-04-14 | multimodal_pdf fail |
| oai2api.com | 61 | Capability gap | gpt-5.2 | 2026-04-06 | context_length truncates at 4K chars |

### Report 1 Conclusions

1. **Score 16–17 cluster = direct SSE empty body**, especially claude-thinking variants (~10 cases concentrated there). Recommend strengthening empty-body warnings for thinking models.
2. **KIRO-chain failures drive mid-range scores (30–55)** and strongly co-occur with token inflation.
3. **Pure capability / quality failures are rare (< 5 cases)**. The overwhelming majority of low scores stem from the infrastructure layer (SSE, wrappers, inflation) — not the model itself.

---

## Report 2 — Endpoint Identity Analysis (4/21)

> Source: `probe_history` rows flagged by deep fingerprinting (v3 family + sub-model). Detection: three-way cross-check (surface / behavior / v3).

### Statistics

| Metric | Value |
|---|---:|
| Identity anomaly cases | 7 |
| Model swap (cross-family) | 3 |
| Sub-model downgrade (same family) | 1 |
| Identity unconfirmed | 3 |

### Category 1: Model Swap (cross-family)

- **Count**: 3 endpoints
- **Pattern**: Endpoint claims one family (e.g. Anthropic Claude) but deep fingerprinting matches features of a different family with high confidence. **Highest-risk** class.
- **Verdict**: Active deception — underlying model differs from claimed family.

### Category 2: Sub-model Downgrade (same family)

- **Count**: 1 endpoint
- **Pattern**: Endpoint claims a high-tier model within the same family (e.g. Opus 4.7) but deep fingerprinting identifies a lower-tier / older version (e.g. Opus 4.6). Overall probe score may be 90+; only sub-model comparison catches it.
- **Verdict**: Downgrade fraud — billed at flagship tier, served from legacy.

### Category 3: Unconfirmed Sub-model (top-2 too close)

- **Count**: 3 endpoints
- **Pattern**: Endpoint claims a specific sub-model version and overall probe score is acceptable, but the top-2 candidate fingerprints are within 5%, so the exact sub-model cannot be determined. Could be version drift, partial routing, or behavioral variance.
- **Verdict**: Identity uncertain — continued observation recommended.

### All Cases (7 rows)

| Host | Score | Claimed | Family | Identified | Similarity | Category | Date | Note |
|---|---:|---|---|---|---:|---|---|---|
| api.getrouter.top | 95 | claude-opus-4-7 | Anthropic | GPT-5.4 | 98% | Model swap | 2026-04-20 | Claims Claude Opus, fingerprint matches OpenAI GPT-5.4 at 98% — textbook cross-family swap |
| www.aitokens.link | 79 | gpt-5-codex | OpenAI | GPT-5.4 | 93% | Model swap | 2026-04-20 | Claims gpt-5-codex, actual fingerprint is GPT-5.4 (93%) — sub-model-level error |
| 119.45.125.109 | 86 | claude-opus-4-7 | Anthropic | OpenAI family | — | Model swap | 2026-04-20 | Claims Claude Opus, fingerprint identified as OpenAI family |
| api.aipaibox.com | 95 | claude-opus-4-7 | Anthropic | Claude Opus 4.6 | 90% | Sub-model downgrade | 2026-04-20 | Claims Opus 4.7, actual is 4.6 (90% match) — billing at 4.7 rate but serving legacy 4.6 |
| mg.aid.pub | 96 | Claude-Opus-4.6 | Anthropic | Unconfirmed | — | Unconfirmed | 2026-04-21 | Q2 answered "Monday" (should be "Tuesday"), refused with only 85 tokens (Opus avg ~1023), top-2 fingerprint gap < 5% |
| hboom.ai | 92 | claude-opus-4-7 | Anthropic | Unconfirmed | — | Unconfirmed | 2026-04-20 | Claims Opus 4.7, family matches but sub-model version unconfirmed (4.6 vs 4.7 too close) |
| www.findcg.com | 88 | claude-opus-4-7 | Anthropic | Unconfirmed | — | Unconfirmed | 2026-04-20 | Claims Opus 4.7, sub-model top-2 too close to disambiguate |

### Report 2 Conclusions

1. **Cross-family model swap is the highest-risk class** — some endpoints claim Claude Opus but respond with fingerprints strongly matching GPT-5 or Gemini. These billing records charge Claude rates while serving a different vendor's model.
2. **Same-family downgrade (e.g. Opus 4.7 → 4.6) is the sneakiest** — overall probe score may be 90+; only sub-model comparison detects it, yet billing calculates on the flagship tier.
3. **Unconfirmed identity is not proof of fraud** — a 96-score endpoint may simply have Opus 4.5 / 4.7 fingerprints too close to distinguish (< 5% gap). But combined with behavioral anomalies (wrong basic answers, truncated refusals), deeper investigation is warranted.

---

## How to Reproduce This Detection

This repository's `computeVerdict()` + `classifySubmodelV3()` are the exact functions powering Report 2:

```typescript
import {
  computeVerdict,
  classifySubmodelV3,
} from "@bazaarlink/probe-engine";

// ① surface  — endpoint self-claim (spoofable via system prompt)
// ② behavior — family classifier with selfClaim zeroed (harder to spoof)
// ③ v3       — deterministic sub-model classifier (cutoff + capability +
//              refusal; very hard to spoof)

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

Full CLI workflow: see the [README](../README.en.md) quick-start section.

---

## Disclaimer

- Endpoint behavior in this report reflects BazaarLink's observation on the listed date. Behavior may have changed since.
- "Unconfirmed identity" does **not** imply fraud; it only means current fingerprint evidence is insufficient to conclude.
- These reports are produced by automated detection. If you operate one of the listed endpoints and believe the classification is incorrect, please contact BazaarLink support.
