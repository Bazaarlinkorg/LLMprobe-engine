# V4 Sub-Model Classifier — Attack-Scenario Accuracy Report

Date: 2026-05-10

## Summary

V4 = `V3 Scoped + V3 Global + IKP` ensemble fuse with 4-tier priority rules.
Replaces V3F as the primary sub-model verdict; V3F is preserved as a
tiebreaker for the openai/gpt-5.5 ↔ openai/gpt-5.3-codex feature-overlap pair.

**Headline numbers (claim = anthropic/claude-opus-4.7, 36 spoof + 6 control runs):**

| Metric | V3 alone | **V4** | Δ |
|---|---:|---:|---:|
| Honest opus-4.7 (control) — family ✓ | 100% | **100%** | 0 ✓ no regression |
| All-attack — sub-model ✓ | 39% | **83%** | **+44pp** |
| Cross-family — sub-model ✓ | 0% | **72%** | **+72pp** |
| All-attack — spoof detected | 42% | **97%** | **+55pp** |

**Headline numbers (claim = openai/gpt-5.5, 43 simulated scenarios):**

| Configuration | family ✓ | sub-model ✓ | spoofDet |
|---|---:|---:|---:|
| With `openaiNearSibling` gate (V3 only) | 26% | 21% | 26% |
| **V4 universal (gate removed)** | **100%** | **84%** | **100%** |

## Why V4

### Discovery: V3 Global already had the answer

V3 has two execution modes:
- **V3 Scoped**: candidates limited to claimed family
- **V3 Global**: candidates across all 28 hardcoded baselines

Both run on every probe. Only V3 Scoped feeds the primary verdict; V3 Global
result is computed but stored in a debug panel.

When qwen attacks claiming opus-4.7:
- V3 Scoped (anthropic pool): top-3 are all anthropic with score < 0.5 → abstain
- V3 Global (full pool): top = qwen/qwen3-max, score 0.700, gap 0.228 → ✓

A live OpenRouter test on 2026-05-10 confirmed this. V3 Global has the signal —
it was just not being surfaced in the verdict.

### IKP's earlier scoped fuse had the right intuition, wrong implementation

The previous `fuseV3WithIKP` was scoped to `predictedFamily` (the family
verdict). When the family verdict was wrong (e.g., gpt-5.4 spoof where V3
said anthropic), the IKP candidate pool was filtered to anthropic — losing
the cross-family signal IKP could otherwise provide.

Worse: when V3 Scoped abstained AND `predictedFamily` was undefined, the
fuse short-circuited at `if (!ikp || !family || ikp.candidates.length === 0) return v3`.
Net effect: IKP contributed zero in the cross-family attack scenarios it
was designed to address.

### V4 fuse rules

```
1. V3 Scoped hit + V3 Global same family → keep V3 Scoped
   (protects honest claims; preserves V3F-style intra-family discrimination)

2. V3 Scoped hit + V3 Global high-confidence cross-family → use V3 Global
   (catches cross-family spoof where V3 Scoped was deceived by claim)

3. V3 Scoped abstain + V3 Global hit → use V3 Global
   (cross-family rescue: qwen claiming opus-4.7, etc.)

4. V3 Scoped abstain + V3 Global abstain + IKP hit → use IKP
   (last-resort defense in depth)

5. otherwise → abstain
```

V4 ignores any family pre-filtering — IKP runs in global pool unconditionally.
V4 also removes the previous `openaiNearSibling` gate that excluded gpt-5.x
claims; rule 1 already protects intra-family verdicts (V3F sibling
discrimination unaffected — see numbers below).

## Per-Model Accuracy (claim = opus-4.7)

| Actual model (impostor) | V3 sub ✓ | **V4 sub ✓** | V3 spoofDet | **V4 spoofDet** |
|---|---:|---:|---:|---:|
| opus-4.7 (honest control) | 67% | **67%** | 33% | 33% |
| opus-4.6 → 4.7 | 83% | 83% | 100% | 100% |
| sonnet-4.6 → 4.7 | 50% | **100%** | 50% | **100%** |
| haiku-4.5 → 4.7 | 100% | 100% | 100% | 100% |
| gpt-5.3-codex → 4.7 | 0% | **67%** | 0% | **100%** |
| gpt-5.4 → 4.7 | 0% | **83%** | 0% | **83%** |
| deepseek-v3.2 → 4.7 | 0% | **67%** | 0% | **100%** |

## Per-Model Accuracy (claim = gpt-5.5, 7 backtest models + qwen live)

| Actual model | V3 + gate | **V4 universal** |
|---|---:|---:|
| opus-4.7 → gpt-5.5 | 0% spoof | **100%** |
| opus-4.6 → gpt-5.5 | 0% | **100%** |
| sonnet-4.6 → gpt-5.5 | 0% | **100%** |
| haiku-4.5 → gpt-5.5 | 0% | **100%** |
| gpt-5.3-codex → gpt-5.5 (intra) | 100% | 100% |
| gpt-5.4 → gpt-5.5 (intra) | 83% | **100%** |
| deepseek → gpt-5.5 | 0% | **100%** |
| qwen3-max → gpt-5.5 | 0% | **100%** |

V3F intra-family discrimination preserved (75% → 83% slightly improved due to
V3 Global double-confirm). No regression for honest gpt-5.5 users (the V3
baseline gap for gpt-5.5 is a separate, pre-existing issue documented for
follow-up).

## Implementation in this engine

Reproduced in OSS via:

- `src/sub-model-classifier-v4.ts` — V4 fuse function (the rules above)
- `src/sub-model-classifier-ikp.ts` — Inherent Knowledge Probe classifier
  (the IKP path V4 falls back to)
- `src/__tests__/sub-model-classifier-v4.test.ts` — 18 unit tests covering
  all 5 rules + tiebreaker + cross-family rescue + honest-user regression

V3F is still computed and exposed for callers that want a second-opinion
classifier; V3 Scoped / V3 Global / IKP are all callable independently
through the public API.

## Validation Methodology

1. **36 spoof runs** (cached responses, claim=opus-4.7) re-classified
   through V4 fuse using existing raw response data.
2. **qwen3-max live call** (claim=opus-4.7) — confirmed V3 Global score=0.700.
3. **Simulation under claim=gpt-5.5**: re-purposed backtest raw responses
   (V3 features stable across claim spoofs) plus qwen live response. 43 scenarios.
4. **IKP global-pool simulation** against a 9-model baseline pool × 5 IKP probes.
5. **Leave-one-out unknown-family simulation**: each baselined model treated
   as if absent — verifies IKP never wrongly confirms a claim's family
   (0/9 false positives).

## Known Limitations

1. **gpt-5.5 honest user**: V3 baseline lacks a calibrated gpt-5.5 entry; V3
   picks a gpt-5.4 sibling. Pre-existing issue, NOT introduced by V4.
2. **gpt-5.3-codex sub-model**: V4 catches family but only 67% sub-model
   (V3 baseline cutoff features overlap with other gpt-5.x models). Acceptable
   — spoofDet is 100%, which is the security-critical metric.
3. **Qwen live vs spoof responses**: qwen live test used claim=opus-4.7;
   simulation extrapolates to claim=gpt-5.5. V3 features (cutoff/capability/
   refusal) are largely claim-independent so extrapolation is sound but not
   empirical for that exact claim.
