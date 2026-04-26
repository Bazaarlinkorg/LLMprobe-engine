# Model Substitution in the Black-Box LLM API Resale Market
## A 14-Day, 171-Endpoint, 625-Probe Empirical Measurement Study

**Paper ID:** `OR-2026-04-26-resale-substitution`
**Affiliation:** Bazaarlink Research (internal report, publishable version)
**Measurement Window:** 2026-04-12 – 2026-04-25 (14 calendar days)
**Manuscript Version:** v1.0 (2026-04-26)
**Classification:** consumer protection · security measurement · API economics

> Companion document: a Traditional Chinese version of this paper is available at [`2026-04-26-llm-resale-substitution-measurement-paper.md`](2026-04-26-llm-resale-substitution-measurement-paper.md). The two versions track each other section-by-section.

---

## Disclosure and Research Ethics Statement

All measurements in this study were performed using legitimately purchased API keys; the requests issued are of the same class that any ordinary buyer of API credit at the studied endpoints could issue. The study did not perform denial-of-service, billing-bypass, unauthorized access, or any action exceeding the access scope advertised by the endpoints. Every endpoint discussed in this paper is a publicly marketed reseller of large-language-model API credit, and every endpoint discussed has, throughout the measurement window, been receiving research-purpose stress-test traffic in support of the present study's methodology validation; the substitution behaviors documented in this paper are independent of that stress-test traffic. Endpoint identities are referred to in the body of the paper by codenames (R1–R15) with partial-letter masking of their domains; Appendix B provides the full mapping, which the publishing party may at its discretion withhold from final publication. The study aims at consumer protection and market transparency. It does not make legal claims about any operating entity behind the studied endpoints.

---

## Abstract

The market for resold access to large-language-model (LLM) APIs has expanded rapidly since 2024, driven by upstream service providers' (Anthropic, OpenAI) regional service-availability policies that exclude developers and enterprises in certain jurisdictions from purchasing first-party access. Because upstream providers cannot directly authenticate which back-end model a third-party reseller actually routes a downstream request to, and because black-box API responses at the protocol layer are nearly indistinguishable across models, downstream buyers typically cannot detect whether an advertised high-tier model was silently routed to a lower-tier model — let alone whether the substitution crossed family boundaries (e.g., between Anthropic and OpenAI).

This paper designs and deploys a four-layer black-box detection system based on independent fingerprint channels, and applies it to 171 distinct LLM API reseller endpoints over a 14-day window (2026-04-12 to 2026-04-25), accumulating 625 probe runs. In fixed-size synthetic stress tests, the system achieves a 94.4% true-positive rate against intra-family substitution (n=18) at a 0% false-positive rate against the genuine model (n=6); in field deployment, **9.9% of probed endpoints (17/171) show at least one detected substitution event, and under a stricter criterion (n≥5 probes per endpoint, ≥20% violation rate) 1.3% (2/149) meet our persistent-substitution criterion**. The central empirical contribution is the case analysis: R1 exhibits dynamic routing across multiple back ends under one advertised model, R2 exhibits systematic version-tag generalization, and R6 shows that single-session incident-style substitution can still be captured by an internally consistent evidence chain. Observed substitutions sort into five categories: cross-family impersonation, intra-family silent downgrade, intra-family silent upgrade, version-tag forgery, and provider-injected behavioral constraint. The paper closes with a consumer-protection analysis of these findings and three immediately actionable disclosure-duty proposals.

**Keywords:** LLM API resale; model substitution; behavioral fingerprinting; consumer protection; black-box auditing; gray market.

---

## 1. Introduction

### 1.1 A Gray-Market Industry Born of Access Restrictions

Anthropic and OpenAI publicly disclose, in their service terms and acceptable-use policies, that their flagship products — Anthropic's Claude Code, OpenAI's ChatGPT and the OpenAI API — are unavailable for direct purchase in certain countries and regions. Demand for these tools, however, has not abated in those regions; if anything, the productivity arms race between developers in restricted regions and their global peers has *intensified* the demand. The supply–demand gap so created has, over the past twelve months, given rise to a high-growth resale industry: third-party operators stand up OpenAI-compatible HTTP endpoints in accessible jurisdictions (typically East or Southeast Asia), back the endpoints with first-party API keys obtained from Anthropic, OpenAI, Google, and xAI, and resell access at a markup to downstream users in restricted regions. Such resale endpoints typically advertise support for flagship models (Claude Opus 4.7, GPT-5.4, Gemini 3.1 Pro), and present an OpenAI-compatible interface so that downstream code originally targeted at first-party SDKs may switch over without modification.

This is not the familiar pattern of a sanctioned API reseller. Sanctioned resellers (e.g., on cloud-marketplaces) typically have formal contracts with the upstream provider, contractual SLAs, and, crucially, an interface that surfaces the upstream provenance (an upstream-issued endpoint, branded headers). The resellers studied in this paper instead operate as **unauthorized gray-market intermediaries**: upstream providers have not authorized resale, the resellers' upstream API keys cannot be reconciled to downstream buyers in the upstream's books, and downstream users routinely *assume* service homogeneity from interface compatibility.

### 1.2 The Collapse of Trust Assumptions

Downstream buyers' trust in such intermediaries traditionally rests on four assumptions:

1. **Interface assumption:** The endpoint implements the OpenAI-compatible protocol, therefore its behavior approximates first-party OpenAI;
2. **Self-claim assumption:** A request that passes `model: claude-opus-4-7` and receives a response self-identifying as Claude indicates that the back end truly is that model;
3. **Branding assumption:** A reseller website displaying Anthropic and OpenAI logos, with customer service claiming "official partnership," sources from the official upstream;
4. **Tier-consistency assumption:** Resellers will not advertise a high-tier model while routing to a lower-tier model, because doing so would create detectable quality drift.

This paper will demonstrate that all four assumptions fail in the present resale market: interface compatibility can be supplied by a transparent forwarding layer without guaranteeing back-end model consistency; self-claims can be rewritten by upstream system-prompt injection; branding is unverified; and tier labels can be decoupled from the actual back-end model.

### 1.3 Research Questions

This study addresses the following empirical questions:

- **RQ1 (Prevalence)** What fraction of currently active LLM API reseller endpoints exhibit externally observable model substitution?
- **RQ2 (Typology)** Can the observed substitution behaviors be organized into reproducible categories?
- **RQ3 (Detection feasibility)** Under purely black-box observation, can a detection method achieve simultaneously high true-positive rate and low false-positive rate?
- **RQ4 (Consumer impact)** What concrete harms does substitution impose on downstream buyers, and what are the implications for regulators and upstream providers?

### 1.4 Contributions

The contributions of this paper are:

1. **A first systematic measurement of the resale market.** 14 days, 171 distinct endpoints, 625 probe runs, with quantified distribution of substitution prevalence.
2. **A reproducible black-box detection methodology.** Four-layer independent-fingerprint architecture, achieving 94.4% intra-family true-positive rate at 0% false-positive rate in fixed-size synthetic tests; reproducibility instructions provided in [Appendix A](#appendix-a-reproducibility-via-sql-and-data-pipeline).
3. **A taxonomy of substitution behaviors.** Five categories (cross-family impersonation, silent downgrade, silent upgrade, version-tag forgery, provider behavior injection), each illustrated by an anchor case.
4. **A consumer-protection policy analysis.** Quantification of the asymmetric-information harm borne by downstream buyers, and three immediately implementable disclosure-duty proposals.

### 1.5 Structure

§2 lays out the threat model. §3 describes the four-layer detection method. §4 outlines the engineering implementation. §5 reports synthetic and 14-day field results. §6 organizes substitution behaviors into a taxonomy with anchor cases including three deep case studies (R1, R2, R6). §7 analyzes consumer harm and policy implications. §8 discusses limitations. §9 concludes. Appendices supply reproducibility instructions, an endpoint codename mapping, the open-source implementation correspondence, and a methodological evolution log.

---

## 2. Threat Model

### 2.1 Adversary Types

The study classifies substitution-capable adversaries (resellers) by commercial motivation:

- **Arbitrage adversary:** Advertises model M_high; routes the back end to a lower-tier same-family model M_low (e.g., advertises Opus 4.7, routes to Sonnet 4.6). Motivation: margin expansion through quality-tier substitution.
- **Silent-downgrade adversary:** Advertises M_high and *initially* routes to M_high, but switches to M_low under operational pressure (upstream-quota exhaustion, routing fallback, or vendor policy change). Downstream users may experience a quality drop they cannot attribute.
- **Cross-family adversary:** Advertises a model in family F_a (Anthropic Claude); routes to a model in family F_b (OpenAI GPT, Google Gemini, Z-AI GLM). Motivation: cross-family arbitrage, or fail-over when F_a accounts are blocked.

A non-pecuniary fourth pattern is observed:

- **Behavior-injection adversary:** Injects a system prompt at the upstream layer (e.g., Amazon Q Developer / Kiro coding-agent wrapper) that constrains an otherwise general-purpose model to a narrow domain. Downstream users do receive the advertised model, but its behavioral freedom is silently restricted.

### 2.2 Adversary Capabilities

The adversary is assumed to possess full control over:

- request routing (selecting upstream API key and `model` parameter);
- request rewriting (injecting or stripping `system` content before forwarding upstream);
- response rewriting (modifying, filtering, or re-encoding text content);
- header injection (adding or stripping HTTP response headers);
- streaming forgery (re-chunking and rewriting chunks of a streaming response).

The adversary is assumed *not* to possess:

- the ability to rewrite the upstream model's internal reasoning (e.g., to manufacture logprobs, or to alter the physical meaning of token counts);
- the ability to forge the *full* behavioral fingerprint of an upstream model in absence of that model's participation. The adversary may rewrite *what the response says*, but cannot readily fabricate a coherent set of responses spanning multiple independent fingerprint channels.

This capability boundary grounds the detection methodology: detection must target signal channels that the adversary will not actively forge or cannot cheaply forge.

### 2.3 Attack-Surface Classification

Mapping the substitution to its injection point in the request lifecycle:

| Surface | Injection point | Forgery ceiling |
|---|---|---|
| Routing layer | Upstream API key / `model` parameter | Full back-end replacement (incl. family) |
| Prompt layer | Upstream `system` content | Forge self-claim; weaken policy; cannot rewrite token counts or fundamental refusal boundary |
| Response layer | Post-processing of upstream response | Rewrite text content; cannot manufacture absent metadata or logprobs |

Detection methodology, conversely, exploits ceilings: pure routing-layer attacks leave behavioral inconsistency between back-end and claimed model; pure prompt-layer attacks struggle to fake coherent fine-grained behavior across multiple independent channels.

---

## 3. Methodology: Four-Layer Independent Fingerprint Detection

### 3.1 Design Principles

**P1 Multi-layer independence.** Each detection layer uses an independent signal channel. To deceive the system, an adversary must simultaneously forge consistent behavior across channels.

**P2 Black-box accessibility.** All channels are obtained via downstream HTTP API alone. No privileged access to the endpoint or the upstream provider is required.

**P3 Quantified confidence.** The system outputs not only a Boolean verdict but a quantified confidence band and per-layer evidence trail, supporting human review.

### 3.2 Architecture Overview

```
                    ┌─────────────────────────────┐
   API response →   │ probe suite (fixed prompts) │ + control prompts
                    └─────────────────────────────┘
                                  │
                    ┌─────────────┴────────────────┐
                    ▼                               ▼
       ┌──────────────────────────┐   ┌─────────────────────────┐
       │ Layer ① Surface          │   │ Layer ② Behavior column │
       │  family weights from     │   │  same weights, with     │
       │  the full response       │   │  self-claim string      │
       │                          │   │  zeroed out             │
       └──────────────────────────┘   └─────────────────────────┘
                    │                                │
                    ▼                                ▼
                ┌─────────────────────────────────────┐
                │ Layer ③ Sub-model deterministic    │
                │  match: cutoff / capability /       │
                │  refusal-prefix                     │
                └─────────────────────────────────────┘
                                 │
                                 ▼
                ┌─────────────────────────────────────┐
                │ Layer ④ Behavioral-vector extension │
                │  refusal-ladder / formatting /      │
                │  uncertainty (numeric value + round)│
                └─────────────────────────────────────┘
                                 │
                                 ▼
                ┌─────────────────────────────────────┐
                │ Verdict fusion (7-state verdict +   │
                │ confidence band)                    │
                └─────────────────────────────────────┘
```

### 3.3 Layer ① — Surface Fingerprint

**Principle.** The overall textual response (including any self-identifying language it contains) carries family-discriminative information with a small number of probes.

**Implementation.** A linear classifier maps response features to family weights (Anthropic / OpenAI / Google / xAI / other) with weights pretrained on known-model traffic.

**Strength.** Computationally cheap; correct in the vast majority of unattacked cases.

**Weakness.** Trivially polluted by self-claim. An adversary need only inject "you are Claude Opus 4.7" into the upstream system prompt to drive surface output to Anthropic = 100%. Layer ① **must not be used in isolation**.

### 3.4 Layer ② — Behavior Column (Self-Claim Zeroed)

**Principle.** Stripping self-identifying short phrases from the response and re-classifying yields a column that is largely robust against prompt-layer self-claim forgery. Adversaries rewrite *self-identification* far more often than they rewrite *style* — and style features (rhetoric, sentence cadence, enumeration habits, politeness markers) are difficult to rewrite while preserving coherence.

**Implementation.** Two parallel classifiers: one over the raw response, one after regex-deletion of a curated self-identification phrase set. The pair is exposed to the verdict layer as `familyScores` and `attackFamilyScores`.

**Strength.** Robust against prompt-layer attacks within its band of confidence.

**Weakness.** Powerless against pure routing-layer attacks: when the back end *is* a different family, both columns will agree and indicate the wrong family relative to the user's claim. Such cases are caught at the verdict layer by comparing claim against behavior-column truth.

### 3.5 Layer ③ — Sub-Model Deterministic Match

**Principle.** Within a family, sibling sub-models (e.g., Claude Opus 4.5 / 4.6 / 4.7) differ measurably along three observable dimensions: training-data cutoff, capability boundary, and refusal-prefix style.

**Implementation.** A baseline database stores, per target model, its measurements along:

- **Cutoff:** ask "what is your training-data cutoff date?"; extract year/month from the response.
- **Capability boundary:** a fixed set of factual questions including at least one whose answer changes across plausible cutoff dates.
- **Refusal prefix:** observed leading text and length when the model refuses a standardized sensitive request.

A heuristic match score selects the best-matching sub-model when the score ≥ 0.60 and the gap to the runner-up ≥ 0.05; otherwise the layer abstains.

**Strength.** Strong against pure routing-layer attacks: a different family scores zero across the board; a different sub-model differs on at least one dimension.

**Weakness.** Each dimension can be precisely targeted by a prompt-layer attack ("your cutoff is 2025-04"). Layer ③ must be paired with Layer ④ for robustness.

### 3.6 Layer ④ — Behavioral-Vector Extension

**Principle.** Layer ③ is augmented with channels that are harder to forge by system-prompt manipulation. Three vectors:

- **Refusal ladder:** 8 prompts of monotonically increasing sensitivity (from compliant to high-sensitivity, with CBRN material replaced by cybercrime equivalents), recording whether the model complies / partially complies / refuses at each rung. The L6 rung (involving methods of self-harm) was empirically found to discriminate Claude Opus 4.7 from its Anthropic siblings.
- **Formatting:** preferred bullet glyph (`-` / `*` / `1.`), header depth, code-block language tag.
- **Uncertainty:** when the model is asked to express its confidence numerically, both the value (e.g., 65%) and whether the value is a round multiple of ten (60, 70 vs 63, 72). The latter discriminates same-family siblings such as GPT-5.5 and GPT-5.3-codex.

**Strength.** Refusal boundaries are determined by the underlying safety policy and resist system-prompt rewriting; formatting preferences derive from training distribution rather than runtime instruction; numeric-rounding habits are highly robust against "pretend to be confident" prompt attacks.

**Weakness.** Twelve additional probes are required; the channel must be selectively deployed when probe count is constrained.

### 3.7 Verdict Fusion and Seven-State Output

The verdict layer integrates the four channels and emits one of seven mutually exclusive states:

| Verdict | Trigger (simplified) | Meaning |
|---|---|---|
| `clean_match` | Layers ①②③ (or ④) all consistent with the claim, confidence ≥ 0.85 | High-confidence match |
| `match` | Layers ①② consistent with the claim, ③ (or ④) abstain or unavailable | Medium-confidence match |
| `clean_match_submodel_mismatch` | Family consistent, sub-model layer disagrees | Same-family substitution suspected |
| `plain_mismatch` | Behavior-column family ≠ claimed family | Cross-family substitution suspected |
| `mismatch` | Layer ③/④ disagrees with claim at high confidence | Sub-model substitution suspected |
| `spoof_selfclaim_forged` | Self-claim present but behavior-column family differs | Prompt-layer self-claim forgery |
| `spoof_behavior_induced` | Response style is induced toward the claim, but ③/④ still detects the back-end | Behavior-induced spoof |
| `ambiguous` / `uncertain` / `insufficient_data` | Insufficient or contradictory signal | Re-test recommended |

Verdicts carry a confidence band (`high` / `medium` / `low`) and a per-layer evidence trail.

---

## 4. Engineering Implementation

The detection system is deployed on a Next.js 15 + PostgreSQL (Supabase Pooler) + Upstash Redis Web service offering:

- **Public probe interface:** any user can submit a `(baseUrl, modelId, apiKey)` triple at [bazaarlink.ai/probe](https://bazaarlink.ai/probe) and receive a verdict in 30–60 seconds.
- **Baseline management:** an admin interface maintains per-model baselines, each computed from n=3 independent OpenRouter calls.
- **History persistence:** all probe results (raw responses, verdict, confidence, flags, token counts) are persisted to a `probe_history` table.
- **Admin review:** for high-violation endpoints, administrators may issue `verifiedClean` stamps with rationale and timestamp to suppress isolated false positives.

The detection-method core (probe suite, four-layer classifiers, verdict function) is released under AGPL-3.0 as the open-source package `@bazaarlink/probe-engine`; reproducibility correspondence is given in [Appendix C](#appendix-c-open-source-implementation-correspondence-and-reproducibility).

---

## 5. Quantitative Results

### 5.1 Baseline Coverage

As of 2026-04-26, the sub-model baseline database contains 27 models across 6 families. Layer ③ coverage is complete for all 27 models through cutoff, capability, and refusal-prefix features. Layer ④ coverage contains 22 full extended-behavior baselines, covering every model family that appeared as a downstream claim during the measurement window:

| Family | Models | Layer ④ ready | Coverage |
|---|---:|---:|---:|
| Anthropic | 6 | 6 | 100% |
| OpenAI | 10 | 10 | 100% |
| Google | 5 | 5 | 100% |
| **Total** | **27** | **22** | **81%** |

The five models without Layer ④ snapshots were retained in the Layer ③ database but excluded from Layer ④ analysis because they had no downstream claims in the field-measurement corpus. This separation keeps the denominator transparent: the public snapshot supports complete reproduction of all Layer ④ verdicts reported in §5, while still preserving Layer ③ baselines for future measurements when additional families appear in the market. Baseline rows are versioned by model identifier and snapshot date; the open-source release includes a file-based loader so that reproduction does not depend on the authors' SaaS database.

### 5.2 Synthetic Stress Test

The synthetic evaluation executed 18 intra-family substitution rounds and 6 genuine-model stress rounds. The results follow, with the *honest disclosure* that n=18 yields a 95% Wilson confidence interval of [74.2%, 99.0%] — sample size is **insufficient to claim a tight point estimate**.

| Condition | n | TP / TN rate |
|---|---:|---:|
| Intra-family — naive system prompt ("you are Opus 4.7") | 6 | 6/6 = 100% |
| Intra-family — forceful prompt ("never mention any other model") | 6 | 6/6 = 100% |
| Intra-family — injection prompt (with OOB override) | 6 | 5/6 = 83% |
| **Intra-family aggregate** | **18** | **17/18 = 94.4%** |
| Genuine model under spoof prompt — flagged as spoof | 6 | 0/6 = 0% (no false positives) |

The single missed case was Anthropic Claude Opus 4.6 under injection-mode attack pushing its L6 refusal boundary to Opus 4.7's level. This is the Layer ④ injection ceiling, addressed in §8.2.

### 5.3 14-Day Field Deployment

#### 5.3.1 Volume

| Metric | Value |
|---|---:|
| Total probe runs | 625 |
| Distinct `baseUrl` endpoints | 171 |
| Distinct claimed `modelId` values | 47 |
| Admin-verified-clean stamps issued | 6 |

#### 5.3.2 Verdict Distribution (n=561 with verdict)

| `verdict.status` | n | share |
|---|---:|---:|
| `clean_match` | 279 | 49.7% |
| `match` | 162 | 28.9% |
| `clean_match_submodel_mismatch` | 35 | 6.2% |
| `plain_mismatch` | 35 | 6.2% |
| `mismatch` | 14 | 2.5% |
| `insufficient_data` | 11 | 2.0% |
| `uncertain` | 7 | 1.2% |
| `spoof_selfclaim_forged` | 6 | 1.1% |
| `spoof_behavior_induced` | 6 | 1.1% |
| `ambiguous` | 6 | 1.1% |

Strict reading: **12 cases (2.1%) are high-confidence spoof verdicts** (the two `spoof_*` states combined). Broader reading including `plain_mismatch`, `mismatch`, and `clean_match_submodel_mismatch`: **100 cases (17.8%) exhibit some form of model deviation**. The two spoof states split evenly (6+6), consistent with §2.1's dual attack-surface hypothesis: both prompt-layer and routing-layer attacks are present in the wild and now distinguishable.

**Confidence bands:** 252 high (44.9%) · 109 medium (19.4%) · 6 low (1.1%) · 194 null (34.6% — older probes pre-dating the field).

#### 5.3.3 Endpoint-Level Violation Distribution

Treating each `baseUrl` as a single endpoint and bucketing by 14-day violation rate:

| Bucket | Endpoints | Cumulative probes |
|---|---:|---:|
| 0% (clean, n≥1) | 142 | 306 |
| <20% (n≥5) | 5 | 106 |
| 20–50% (n≥5) | 1 | 57 |
| ≥50% (n≥5) | 1 | 73 |
| n<5, ≥1 violation (low evidence) | 9 | 19 |
| Other | 13 | 64 |

**Principal finding (RQ1).** Among the 149 higher-evidence endpoints (n≥5), **7 (≈4.7%)** show ≥1 violation; **2 (≈1.3%)** show ≥20% sustained violation rate. Relaxing to n≥1, **17/171 ≈ 9.9%** show ≥1 violation, but at this relaxation the impact of one-off false positives cannot be ruled out.

#### 5.3.4 Per-Layer Flag Activations

| Flag family | Distinct flags | Total fires |
|---|---:|---:|
| Same-family sub-model spoof (Layer ④) | 5 | 6 |
| Global cross-family inconsistency | 4 | 4 |
| Surface vs. behavior-column family divergence | 12 | 12 |
| Self-claim vs. LLMmap winner divergence | 8 | 10 |

---

## 6. A Taxonomy of Substitution Behavior

Five categories suffice to organize observed behavior. Each is illustrated by an anchor case, with §6.6 providing deep case studies for R1, R2, and R6.

### 6.1 Cross-Family Impersonation

Advertise a model in family F_a; route to family F_b. In our measurement, dominantly "advertise Anthropic Claude, route to OpenAI GPT."

**Anchor (R6, `api.axxx.com`).** A probe of `claude-opus-4-6` returned a response whose behavior-column family weights placed `openai = 0.96`; sub-model deterministic match identified GPT-5.4. Verdict: `spoof_behavior_induced`, high confidence.

### 6.2 Intra-Family Silent Downgrade

Advertise a higher-tier model, route to a lower-tier same-family model. In Anthropic's lineup this typically appears as "advertise Opus 4.7, route to Sonnet 4.6 or Opus 4.6."

**Anchor (R8, `api.aixxxxxx.com`).** Multiple probes of `claude-opus-4-7` were stably identified by Layer ④ as `anthropic/claude-opus-4.6` @ ≥0.84. L6 refusal pattern and formatting preferences match 4.6.

### 6.3 Intra-Family Silent Upgrade

Advertise a lower-tier same-family model; route to a higher-tier model. This category is rarely discussed in industry or literature, yet is empirically present in our measurements.

**Research observation.** Upgrade-direction substitution defies the obvious commercial-incentive analysis (no business gives away expensive models for free). Two non-fraudulent explanations are plausible: (a) the reseller's upstream API key is *only* provisioned for the higher-tier model, so all tier-x requests are uniformly forwarded as 4.7; (b) operational error — a single `model` parameter is hard-mapped on the reseller's routing layer, irrespective of downstream claim.

**Anchor (R2, `hbxxx.ai`).** Multiple probes of `claude-opus-4-6` identified the back end as `anthropic/claude-opus-4.7` @ 0.89.

### 6.4 Version-Tag Forgery

Advertise a dated or preview-tagged version (`claude-opus-4-5-20251101`, `gemini-3.1-pro-preview`); route to a same-family neighboring version. The harm here is specific: enterprise users often pin model versions through dated tags to lock down behavior across regression tests. Tag forgery causes such enterprises to *believe* they are pinned while in fact receiving a different training snapshot.

**Anchor (R2 / R3, `hbxxx.ai` / `yunxx.ai`).** Both endpoints show systematic divergence between dated tags advertised and actual back-end version.

### 6.5 Provider Behavior Injection

Advertise a general-purpose model M, but inject a system prompt at the upstream that constrains M's behavior into a specific domain (e.g., Amazon Q Developer's Kiro coding-agent wrapper limits a general model to programming questions). The user does receive M, but its behavioral freedom is silently restricted.

**Anchor.** A "KIRO (Amazon Q Developer) detection" flag activated 23 times across multiple endpoints during the 14-day window, identifying upstream Kiro-style system-prompt wrappers.

### 6.6 Endpoint-Level Cases

The table summarizes endpoints with detected violations during the measurement window; codename order reflects evidence strength. The Appendix B mapping allows the publisher to choose disclosure depth at print time. All listed endpoints are publicly marketed reseller services and have been receiving research-purpose stress-test traffic during the measurement window.

| Codename | Masked domain | Probes (n) | Violations | Rate | Dominant pattern |
|---|---|---:|---:|---:|---|
| R1 | `api.1xx.ai` | 73 | 45 | 61.6% | mixed (cross-family + version forgery) |
| R2 | `hbxxx.ai` | 57 | 20 | 35.1% | upgrade + version-tag forgery |
| R3 | `yunxx.ai` | 27 | 5 | 18.5% | version drift |
| R4 | `api.linxxxxxai.com` | 26 | 4 | 15.4% | sporadic, no stable pattern |
| R5 | `api.gexxxxxxx.top` | 7 | 1 | 14.3% | dual-protocol ambiguity |
| R6 | `api.axxx.com` | 6 | 1 | 16.7% | cross-family (Claude → GPT) |
| R7 | `api.sanxxxxxai.top` | 4 | 2 | 50.0% | cross-family (Claude → Qwen) |
| R8 | `api.aixxxxxx.com` | 4 | 1 | 25.0% | silent downgrade (Opus 4.7 → 4.6) |
| R9 | `us.noxxxxxx.com` | 4 | 1 | 25.0% | marketing label, real model body |
| R10 | `chat.nuxxx.vip/claudecode` | 1 | 1 | 100% | low evidence |
| R11 | `119.xx.xxx.xxx:10824` | 1 | 1 | 100% | low evidence / bare IP |
| R12 | `ikxxxxx.com` | 1 | 1 | 100% | low evidence |
| R13 | `anxxx.ai` | 1 | 1 | 100% | low evidence |
| R14 | `www.ai-openxxxx.one` | 1 | 1 | 100% | cross-family (Claude → GPT-5.3-codex) |
| R15 | `1xx.ai` | 2 | 2 | 100% | same operator as R1 (bare-domain) |

R1 is the highest-volume, highest-violation endpoint in the window. R10–R15, with very low sample sizes, are placed in a "low-evidence cohort" and **not** counted toward the principal point estimates: at n<5, single false positives or test-traffic-reactive endpoint defenses cannot be excluded.

#### 6.6.1 Deep Case: R1 (`api.1xx.ai`) — Dynamic-Routing Cross-Family Impersonation

R1 leads the measurement window in both volume (73 probes) and violation rate (61.6%, 45/73), and is the highest-evidence persistent-substitution candidate in our data. Two features distinguish R1's behavior: **(a) a single advertised model maps to multiple distinct back-end models across different probes**, and **(b) both prompt-layer and routing-layer attack surfaces are simultaneously observed at this endpoint**.

Concretely, of five probes claiming `claude-opus-4-6`, two were identified as the genuine Claude Opus 4.6 (`clean_match`), one was identified as GPT-5.4, one as GPT-5.4 Mini, and one as a non-Anthropic model whose specific identity could not be locked down. This distribution is inconsistent with any single static routing map, but is consistent with **dynamic load distribution**: the endpoint dispatches the same advertised claim to whichever back end is currently available, has unused upstream quota, or is under low load.

R1 also exhibits the most complete prompt-layer forgery observed in our data. One probe of `claude-haiku-4-5-20251001` was classified `spoof_behavior_induced`: behavior-column identified GPT-5.3 Codex while the response style was being induced toward Claude. A separate probe of `gpt-5.3-codex-high` was classified `spoof_selfclaim_forged`: the response contained an explicit "I am GPT" self-identification that was contradicted by behavior-column family weights. Both attack surfaces co-occurring at one endpoint suggests the operator possesses the engineering capacity to bypass deterministic sub-model matching (Layer ③), yet remains caught by the behavioral-vector extension (Layer ④).

Operationally, R1 is important because it is not merely a mislabeled static proxy. A static proxy would consistently map a claimed model to a single neighboring back end. R1 instead produces a many-to-one and one-to-many mapping: the same advertised model sometimes resolves to the genuine model and sometimes to multiple OpenAI-family alternatives. For downstream users, the failure mode is intermittent and hard to reproduce: a complaint may be answered by a clean later call, even though the previous call was routed elsewhere.

**Downstream-buyer impact.** A buyer of R1 requesting Claude Opus 4.6 may, on any given API call, in fact receive a response from OpenAI GPT-5.4, GPT-5.4 Mini, or genuine Claude Opus 4.6. The harm is not merely semantic: downstream workflows calibrated for a specific model may receive a different latency profile, refusal boundary, formatting style, and capability envelope without notice.

#### 6.6.2 Deep Case: R2 (`hbxxx.ai`) — Version-Tag Generalization Routing

R2 accumulated 57 probes and 20 violations (35.1%) in the 14-day window. Its violation profile differs from R1's: R2's back-end models are **mostly genuine within their advertised families** (Anthropic / Google), but the endpoint exhibits a systematic inconsistency in *version-tag handling*. We name this pattern **version-tag generalization routing**: the endpoint accepts arbitrary sub-model version tags — including discontinued versions, preview tags, and date-pinned versions — and uniformly routes them to the "most recent available version" within the same family.

Representative samples: 6 probes of `claude-opus-4-5-20251101` were classified `clean_match_submodel_mismatch`, with the behavior column identifying Claude Opus 4.5 (no date tag); 3 probes of `claude-sonnet-4-5-20250929` were uniformly identified as plain Claude Sonnet 4.5; probes of `gemini-3-pro-preview` were identified as Gemini 3.1 Pro. **Most striking** are 3 probes of `claude-sonnet-4-20250514` (a tag with no corresponding entry in Anthropic's actual product line) that were *all* routed to Claude Haiku 4.5 — a cross-tier substitution that fits neither downgrade nor upgrade typology cleanly (Sonnet 4 and Haiku 4.5 occupy non-overlapping positions on Anthropic's tier ladder).

R2 also produced one cross-family event: 2 probes of `gemini-2.5-flash` were classified `plain_mismatch` with the back end identified as Anthropic. Such events are rare (2/57), likely reflecting transient upstream-key swaps or routing errors at the endpoint.

R2 is therefore not best understood as a simple "fake model" endpoint. Its dominant behavior is a compatibility illusion: the endpoint accepts model identifiers that look precise enough for production pinning, but internally collapses them onto a smaller set of available models. A user asking for Claude usually receives something Claude-like; the failure is at the version-contract layer, where regression stability, safety-boundary assumptions, and benchmark comparability are silently weakened.

**Downstream-buyer impact.** R2's pattern particularly harms **enterprise users who pin behavior to dated version tags** for regression-test stability. Such users typically lock down `claude-opus-4-5-20251101` precisely *to keep the model frozen* across their evaluation suite. R2 instead generalizes that tag to "most recent Opus 4.5" — should Anthropic ever update the underlying weights for Opus 4.5, R2's downstream users would silently receive a new training snapshot, invalidating their evaluation criteria without warning. The economic harm is lower than R1's (the model body is genuine), but **the harm to enterprise users bound by strict regression discipline is no smaller**.

#### 6.6.3 Deep Case: R6 (`api.axxx.com`) — Single-Event Capture of Cross-Family Substitution

R6 accumulated 6 probes and 1 violation (16.7%) — below our n≥5 evidence threshold. R6 is nonetheless retained as a body-text case because that single violation supplies **an internally consistent evidence chain for the cross-family impersonation pattern (§6.1)**, ideal for illustrating how the methodology captures such substitutions.

Event detail. Of 6 probes claiming `claude-opus-4-6`, 3 returned null verdicts (empty or parse-failure responses, plausibly upstream-quota exhaustion or transient network errors), 2 returned `clean_match` against genuine Claude Opus 4.6, and **1 returned `plain_mismatch` with the back-end identified as OpenAI GPT-5.4**. The four detection layers reported, for that single event:

- Layer ① (surface) family weights: `openai = 0.96`, far ahead of Anthropic candidates;
- Layer ② (behavior column, self-claim zeroed) likewise OpenAI-leading;
- Layer ③ (sub-model deterministic) matched GPT-series sub-model cutoff/capability/refusal patterns;
- Response text contained marketing tone and disclaimer patterns idiosyncratic to OpenAI GPT models.

Four mutually independent evidentiary signals all pointed to GPT-5.4; the verdict layer accordingly emitted `plain_mismatch` at high confidence. **The significance of this case is not R6's overall violation rate, but the demonstration that even a substitution occurring once in a session — for example, during transient fallback routing — is detected with a consistent evidence chain at that single moment.**

R6's pattern represents a third typology distinct from R1's (persistent dynamic) and R2's (systematic generalization): **incident-style substitution**. While the *expected* harm of an incident-style substitution to any given downstream user is lower than that of persistent substitution, its *unpredictability* defeats any defense based on long-window averaging — the user may receive a non-claimed model precisely on the call that constitutes their commercially critical task. Incident-style substitution thus constitutes a **distinct category of consumer-protection concern**: even at lower aggregate prevalence, the per-event harm intensity to individual buyers is potentially higher.

This case also explains why endpoint-level percentages alone understate the user-facing problem. If a buyer performs ten casual tests, all ten may appear clean; the eleventh call, embedded inside a production workflow, can still be routed to a different family. The measurement question is therefore not only "what fraction of endpoints are persistently substituting?" but also "can the audit system preserve enough per-call evidence to make an isolated substitution event interpretable after the fact?"

---

## 7. Consumer Harm and Policy Implications

### 7.1 Asymmetric Information and Quantified Harm

Consumer harm in the resale market does not stem from a single "quality below claim" axis but from compounded asymmetries:

**B1 Quality asymmetry.** Inter-model output-quality differences on a fixed prompt are typically *imperceptible* to ordinary users on conversation, copywriting, or translation tasks. Differences emerge only as task complexity or domain specialization rises; by then the user has already committed workflows to the advertised tier and cannot attribute the eventual quality drop to substitution.

**B2 Version asymmetry.** Enterprises lock prompt engineering and evaluation criteria to specific dated model versions ("our prompt passes evaluation on Opus 4.7"). Version-tag forgery causes the enterprise to *believe* it has pinned 4.7 while receiving 4.6; the evaluation criterion is silently invalidated.

**B3 Policy asymmetry.** If the reseller strips the upstream model's safety system prompt to save engineering, downstream users may mistake the resulting policy relaxation for an inherent feature of the model and design production flows around it; if the reseller later restores the original system prompt, those flows fail.

**B4 Litigation asymmetry.** Reseller–buyer relationships rest on unilateral terms-of-service contracts; resellers are typically domiciled outside the buyer's jurisdiction. Even a buyer who detects substitution faces an effectively unlitigable claim.

By the conservative standard from §5.3.3 (n≥5, violation rate ≥20%), **at least 1.3% of sampled active reseller endpoints meet our persistent-substitution criterion**. Given the long-tail distribution of resale traffic (a few high-volume endpoints serve the bulk of users), the fraction of *downstream users* affected may exceed 1.3%.

### 7.2 Why Upstream Providers Cannot Solve This Alone

Notably, **Anthropic, OpenAI, and Google have no effective means to detect substitution at reseller endpoints**:

- Upstream providers see requests arriving from the reseller's API key with valid `model` parameters; they cannot distinguish reseller self-use, sanctioned downstream use, or impersonated downstream use;
- Upstream providers investigating downstream complaints can only consult their own ledger, which does not record what the *downstream* user was told the model is;
- Banning resellers contradicts upstream commercial interest (resellers are often large customers);
- Self-claim pollution **also occurs in upstream providers' own first-party traffic**: a user who injects "you are GPT-4" into Anthropic's official API receives a response self-identifying as GPT-4. The upstream provider cannot, from its own vantage point, distinguish "genuine confusion" from "user-induced confusion."

Therefore, **substitution detection in the resale market cannot rely on upstream providers; it must be supplied by independent third-party measurement infrastructure.**

### 7.3 Three Immediately Implementable Disclosure-Duty Proposals

**D1 — Routing transparency.** Reseller endpoints should disclose the **actually routed upstream model version** in each response's metadata (an HTTP header or non-semantic JSON field). Buyers can then verify alignment between the advertised model and actual routing.

**D2 — Policy-injection disclosure.** Resellers that inject system prompts at the upstream layer (e.g., constraining a general-purpose model into a coding assistant) must disclose this injection's existence and behavioral impact in their public terms.

**D3 — Third-party verification badge.** Reseller endpoints should permit standardized probing by independent verification organizations (such as the public probe interface in this study) and expose the results as a machine-readable badge.

D1 requires resellers to give up substitution opacity; D1 must therefore be mandated by regulation or upstream contract. D2 is a direct application of existing consumer-protection law's material-disclosure principles. D3 is a market-mechanism construction implementable by industry self-regulation or independent research consortia.

### 7.4 Recommendation to Regulators

The resale market currently sits in a double regulatory gray zone — restricted-region consumer-protection authorities deem it foreign, accessible-region authorities deem it inapplicable. Recommended actions:

- Restricted-region consumer-protection authorities should acknowledge the market's de facto presence among their constituents and, without challenging higher-order access policy, establish **consumer-identification education** and **third-party complaint channels** addressing the substitution patterns of §6.1–§6.5;
- Upstream-region regulators (e.g., the U.S. Federal Trade Commission), should they consider what duties upstream providers bear toward downstream consumers in the gray market, may consult the empirical data in this study.

---

## 8. Discussion and Limitations

### 8.1 Sample-Source Selection Bias

The 171 endpoints are not a random sample of the resale market. Users who voluntarily submit probes to `bazaarlink.ai/probe` are predominantly already-suspicious buyers, industry insiders, or competitors of other endpoints. Our prevalence estimate is therefore likely **upward-biased** for endpoints that come under suspicion and **downward-biased** for endpoints that never raise concern. Future work should employ random sampling from a comprehensive directory of resellers to obtain unbiased market-level prevalence.

### 8.2 Detection Ceiling

Layer ④ exhibits a 17% false-negative rate (1/6) under injection-mode prompt attacks. The mechanism: when the system prompt explicitly instructs the model to refuse on category X, the model's refusal boundary is pushed up to approximate that of a higher-tier sibling, eroding Layer ④'s discriminative power. Closing this ceiling requires either (a) introducing channels resistant to system-prompt rewriting (e.g., multi-turn consistency, long-context recall accuracy) or (b) building an adversarial training set spanning the system-prompt perturbation space.

### 8.3 Synthetic-Test Sample Size

§5.2's 95% Wilson CI of [74.2%, 99.0%] on n=18+6 is **statistically insufficient to anchor the 94.4% point estimate**. The synthetic result should therefore be read as an engineering validation of the detector's directionality rather than as a final performance estimate. Future work should validate the point estimate at higher n and across a broader set of system-prompt perturbations.

### 8.4 Endpoint Naming and Ethical Responsibility

Codenames R1–R15 with partially masked domains balance: (a) avoiding asymmetric competitive information injected by this paper into the market; (b) preserving endpoints' rebuttal and re-test space; (c) protecting the research team against legal disputes. Appendix B carries the full mapping; the publishing party may withhold it.

The study further attests: every named endpoint is a publicly marketed resale service and has, throughout the measurement window, received research-purpose stress-test traffic in support of methodology validation; **a fraction of probe responses flagged as substitution may have arisen from the endpoint's defensive response to our adversarial testing rather than its routine production traffic, especially in the low-evidence cohort (R10–R15)**. The current research design cannot fully discriminate between "active reseller substitution" and "endpoint defensive routing under detected adversarial testing"; this is a fundamental methodological limit of the present study.

### 8.5 Ethical Public-Interest Trade-offs

The LLM API resale market sits at the intersection of upstream service policy, restricted-region access policy, and consumer-protection law. The findings here, framed as consumer protection, may also be invoked by other parties to support their respective positions. The authors acknowledge and accept this risk and disclaim any precommitment to specific disputes in any jurisdiction.

---

## 9. Conclusion and Future Work

By means of a four-layer independent-fingerprint detection system applied to 171 LLM API resale endpoints over 14 days, this paper has quantified for the first time the prevalence and distribution of model substitution in a market that exists in a regulatory gray zone. Under conservative criteria, **at least 1.3% of sampled active endpoints meet our persistent-substitution criterion**; substitutions sort into five categories — cross-family impersonation, silent downgrade, silent upgrade, version-tag forgery, and behavior injection — each with a documented anchor case. The paper analyzes the multi-axis asymmetric-information harm imposed on downstream buyers from a consumer-protection vantage and proposes three immediately implementable disclosure duties.

Future work proceeds along three axes:

1. **Random-sampling market measurement** to eliminate selection bias and obtain market-level prevalence;
2. **Closing the detection ceiling** by introducing channels resistant to injection-mode prompt attacks (multi-turn consistency, long-context recall);
3. **Policy operationalization** advancing the D1/D2/D3 disclosure duties through industry self-regulation and regulator dialogue.

The LLM API resale market is a gray economy born of access policy in a present regulatory vacuum; the risks borne by its consumers have, for the first time, been systematically and quantitatively exposed. The authors hope this measurement provides a concrete factual basis for market transparency, consumer protection, and forthcoming regulatory dialogue.

---

## References

> Citations to formal academic literature will be added at submission. Engineering history is preserved in the public repository history and release notes; the paper itself does not require a separate internal report for reproduction.

- Three-way cross-model identity verification methodology paper: [`docs/reports/2026-04-23-three-way-identity-verification-paper.md`](2026-04-23-three-way-identity-verification-paper.md)
- Intra-family sub-model spoof-resistance experiment: [`docs/reports/2026-04-24-v3e-intra-family-spoof-report.md`](2026-04-24-v3e-intra-family-spoof-report.md)
- Opus 4.7 spoof matrix stress test: [`docs/reports/2026-04-24-opus47-spoof-matrix-step2-step3-v3b-v4.md`](2026-04-24-opus47-spoof-matrix-step2-step3-v3b-v4.md)
- Public probe interface: `https://bazaarlink.ai/probe`

---

## Appendix A: Reproducibility via SQL and Data Pipeline

The measurement database is PostgreSQL (Supabase Pooler). The following queries reproduce key tables.

### A.1 Verdict distribution (§5.3.2)

```sql
SELECT
  "identityAssessment"->'verdict'->>'status' AS status,
  COUNT(*)::int AS n,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pct
FROM probe_history
WHERE "createdAt" > NOW() - INTERVAL '14 days'
  AND "identityAssessment" IS NOT NULL
GROUP BY 1
ORDER BY 2 DESC;
```

### A.2 Endpoint-level violation distribution (§5.3.3)

```sql
WITH per_endpoint AS (
  SELECT "baseUrl",
         COUNT(*)::int AS runs,
         SUM(CASE
           WHEN "identityAssessment"->'verdict'->>'status' LIKE '%mismatch%'
             OR "identityAssessment"->'verdict'->>'status' LIKE '%spoof%'
             OR "identityAssessment"->'verdict'->>'status' = 'ambiguous'
           THEN 1 ELSE 0 END)::int AS issues
    FROM probe_history
   WHERE "createdAt" > NOW() - INTERVAL '14 days'
     AND "identityAssessment" IS NOT NULL
   GROUP BY 1
)
SELECT
  CASE
    WHEN issues = 0 THEN '0% (clean)'
    WHEN runs >= 5 AND issues::numeric/runs >= 0.50 THEN '>=50% (n>=5)'
    WHEN runs >= 5 AND issues::numeric/runs >= 0.20 THEN '20-50% (n>=5)'
    WHEN runs >= 5 AND issues::numeric/runs >  0.00 THEN '<20% (n>=5)'
    WHEN runs <  5 AND issues > 0 THEN 'positive (n<5, low evidence)'
    ELSE 'other'
  END AS bucket,
  COUNT(*)::int AS endpoints
FROM per_endpoint
GROUP BY 1 ORDER BY 1;
```

### A.3 Per-layer flag activations (§5.3.4)

```sql
SELECT flag, COUNT(*)::int AS n FROM (
  SELECT jsonb_array_elements_text("identityAssessment"->'riskFlags') AS flag
    FROM probe_history
   WHERE "createdAt" > NOW() - INTERVAL '14 days'
     AND "identityAssessment" IS NOT NULL
) x
WHERE flag LIKE 'V3F_SPOOF%'
   OR flag LIKE 'V3C_GLOBAL_MISMATCH%'
   OR flag LIKE 'SPOOF_DIVERGENCE%'
   OR flag LIKE 'SPOOF_DETECTED%'
GROUP BY 1 ORDER BY 2 DESC;
```

### A.4 Baseline coverage (§5.1)

```sql
SELECT family,
       COUNT(*) AS total_models,
       COUNT(*) FILTER (WHERE "refusalLadder" IS NOT NULL) AS layer4_ready
FROM submodel_baselines_v3
GROUP BY family
ORDER BY family;
```

### A.5 CLI-level reproduction with the open-source package

```bash
npm install -g @bazaarlink/probe-engine
bazaarlink-probe run \
  --base-url <reseller endpoint> \
  --api-key  <your purchased key> \
  --model    <advertised model id> \
  --baseline-model <baseline lookup id> \
  --output report.json
```

Layers ①②③④ and verdict fusion are reproducible with the v0.7.1 open-source package and the bundled Layer ④ baseline snapshot (see Appendix C).

---

## Appendix B: Endpoint Codename Mapping (**Retainable**)

> **Editorial note.** This appendix supplies the full mapping. The publishing party may, at its discretion, withhold the full-domain column at print time, retaining only codename, masked-domain, statistics, and pattern columns. The full mapping is preserved in the research team's internal records for any future dispute clarification.

| Codename | Masked | Full domain | Probes (14d) | Violations | Pattern |
|---|---|---|---:|---:|---|
| R1 | `api.1xx.ai` | `api.1xm.ai` | 73 | 45 | mixed |
| R2 | `hbxxx.ai` | `hboom.ai` | 57 | 20 | upgrade + version forgery |
| R3 | `yunxx.ai` | `yunwu.ai` | 27 | 5 | version drift |
| R4 | `api.linxxxxxai.com` | `api.lingmiaoai.com` | 26 | 4 | sporadic |
| R5 | `api.gexxxxxxx.top` | `api.getrouter.top` | 7 | 1 | dual-protocol |
| R6 | `api.axxx.com` | `api.a2k4.com` | 6 | 1 | cross-family |
| R7 | `api.sanxxxxxai.top` | `api.sandboxai.top` | 4 | 2 | cross-family |
| R8 | `api.aixxxxxx.com` | `api.aipaibox.com` | 4 | 1 | downgrade |
| R9 | `us.noxxxxxx.com` | `us.novaiapi.com` | 4 | 1 | label forgery |
| R10 | `chat.nuxxx.vip/claudecode` | `chat.nuoda.vip/claudecode` | 1 | 1 | low evidence |
| R11 | `119.xx.xxx.xxx:10824` | `119.45.125.109:10824` | 1 | 1 | low evidence / bare IP |
| R12 | `ikxxxxx.com` | `ikunapi.com` | 1 | 1 | low evidence |
| R13 | `anxxx.ai` | `anpin.ai` | 1 | 1 | low evidence |
| R14 | `www.ai-openxxxx.one` | `www.ai-openclaw.one` | 1 | 1 | cross-family |
| R15 | `1xx.ai` | `1xm.ai` | 2 | 2 | same operator as R1 |

---

## Appendix C: Open-Source Implementation Correspondence and Reproducibility

The detection methodology is released under **AGPL-3.0** at:

> Repository: [`github.com/Bazaarlinkorg/LLMprobe-engine`](https://github.com/Bazaarlinkorg/LLMprobe-engine)
> Package: `@bazaarlink/probe-engine`
> Latest release at this manuscript's cut: **v0.7.1** (2026-04-26)

### C.1 Per-Layer Open-Source Status

| Detection layer | Paper section | Source file (v0.7.1) | Status |
|---|---|---|---|
| Surface fingerprint | §3.3 | `src/fingerprint-extractor.ts`, `src/linguistic-fingerprint.ts` | open |
| Behavior column | §3.4 | `src/fingerprint-features-v2.ts` | open |
| Sub-model deterministic match | §3.5 | `src/sub-model-classifier-v3.ts`, `src/sub-model-baselines-v3.ts` | open |
| Behavioral-vector extension | §3.6 | `src/sub-model-classifier-v3e.ts`, `src/sub-model-classifier-v3f.ts`, `src/sub-model-baselines-v3e.ts`, `src/sub-model-baselines-v3e-store.ts`, `src/baselines-v3e-snapshot.json` | open |
| Verdict fusion | §3.7 | `src/identity-verdict.ts` | open |
| Channel signature | §6.5 | `src/channel-signature.ts`, `src/signature-probe.ts` | open |
| Token inflation | (auxiliary) | `src/token-inflation.ts` | open |
| Context-length test | (auxiliary) | `src/context-check.ts` | open |
| SSE compliance | (auxiliary) | `src/sse-compliance.ts` | open |
| Canary benchmark | §4 | `src/canary-bench.ts`, `src/canary-runner.ts` | open |

### C.2 Implications for Reproducibility

The 94.4% intra-family TP figure in §5.2 is achieved with Layer ④ integrated. In v0.7.1 the Layer ④ classifier, the V3F uncertainty correction, the baseline schema, the file-based loader, and the offline baseline snapshot are all included in the public repository. The open-source package therefore supports reproduction of the detector-side results reported in §5 without dependency on this study's SaaS API. The SaaS deployment remains relevant only as the collection instrument for the 14-day field corpus.

### C.3 Differences from SaaS Deployment

The Web probe interface at [bazaarlink.ai/probe](https://bazaarlink.ai/probe) (cf. §4) builds on the open-source core and adds the following SaaS-only application-layer features:

- public probe-history records and admin review interface;
- automated reseller catalogue updates;
- announcement and changelog display;
- aggregate cross-user statistical analytics.

These do not affect the scientific reproducibility of the detection methodology; an academic reproducer using v0.7.1 can independently complete the detector-side §5 experiments with the published snapshot and can rerun new endpoint measurements with purchased API access.

---

## Appendix D: Methodological Evolution Log

For body-text continuity, this appendix supplements the evolution of the detection method, supporting reproducibility and review.

| Stage | Completion | Work | Paper section |
|---|---|---|---|
| L1 | early 2026-04 | surface family-weight classifier (V1) | §3.3 |
| L2 | 2026-04-15 | behavior-column with self-claim zeroed (V2 attack) | §3.4 |
| L3 | 2026-04-18 | sub-model deterministic match (V3 cutoff/capability/refusal) | §3.5 |
| L4-α | 2026-04-23 | refusal ladder + formatting + uncertainty (V3E) | §3.6 |
| L4-β | 2026-04-25 | uncertainty similarity round-rate fix (V3F) | §3.6 |
| Verdict layer | 2026-04-20 | seven-state verdict fusion | §3.7 |
| Verdict extension | 2026-04-25 | V3F as second-opinion + V3C false-positive suppression | §3.7 |
| L4-γ (planned) | TBD | injection-resistant signal channel | §8.2 / §9 |

Engineering details are preserved in the public repository history and in the open-source implementation files listed above.

---

**— End of paper —**
