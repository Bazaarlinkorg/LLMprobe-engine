# Model Identity Verification MVP v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a two-phase identity assessment to `probe-engine` that compares a `claimedModel` against probe evidence to output `match | mismatch | uncertain` with confidence score and evidence sentences.

**Architecture:** After the existing probe loop, a new identity phase extracts behavioral features from `feature_extract` probe responses, compares them against rule-based model-family baselines, and produces an `IdentityAssessment` appended to `RunReport`. The comparison is heuristic (weighted rule scoring) — no ML required for v1.

**Tech Stack:** TypeScript, Node.js 18+, vitest (new dev dependency for tests), no external runtime deps added.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/identity-report.ts` | `IdentityAssessment` and `FingerprintFeatureSet` type definitions + `buildIdentityAssessment()` |
| Create | `src/fingerprint-extractor.ts` | Extracts `FingerprintFeatureSet` from `feature_extract` probe responses |
| Create | `src/fingerprint-baseline.ts` | Static rule-based signal matchers per model family |
| Create | `src/candidate-matcher.ts` | Weighted scoring → top-k candidates → `match/mismatch/uncertain` verdict |
| Modify | `src/runner.ts:28-38,46-71` | Add `claimedModel?` to `RunOptions`, `identityAssessment?` to `RunReport`, call identity phase |
| Modify | `src/index.ts` | Export new types and functions |
| Modify | `package.json` | Add `vitest` dev dep, `"test"` script |
| Create | `src/__tests__/fingerprint-extractor.test.ts` | Unit tests for extractor |
| Create | `src/__tests__/candidate-matcher.test.ts` | Unit tests for matcher |

---

## Task 1: Test Infrastructure

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add vitest**

```bash
cd d:/code/LLMprobe-engine
npm install -D vitest
```

- [ ] **Step 2: Add test script to package.json**

Edit `package.json` — replace the `"scripts"` block:

```json
"scripts": {
  "build": "tsc",
  "dev": "ts-node src/cli.ts",
  "test": "vitest run"
},
```

- [ ] **Step 3: Verify vitest runs (no tests yet)**

```bash
npx vitest run
```

Expected output: `No test files found, exiting with code 0` or similar passing message. If it errors, check that `vitest` installed correctly.

- [ ] **Step 4: Commit**

```bash
cd d:/code/LLMprobe-engine
git add package.json package-lock.json
git commit -m "chore: add vitest for unit testing"
```

---

## Task 2: Define Identity Types

**Files:**
- Create: `src/identity-report.ts`

- [ ] **Step 1: Create `src/identity-report.ts` with all types**

```typescript
// src/identity-report.ts — Identity assessment types for @bazaarlink/probe-engine (MIT)

export type IdentityStatus = "match" | "mismatch" | "uncertain";

export interface IdentityCandidate {
  model: string;        // e.g. "anthropic/claude" or "openai/gpt-4"
  family: string;       // e.g. "anthropic", "openai", "qwen"
  score: number;        // 0.0–1.0 normalized similarity
  reasons: string[];    // human-readable evidence sentences
}

export interface IdentityAssessment {
  status: IdentityStatus;
  confidence: number;           // 0.0–1.0
  claimedModel: string | undefined;
  predictedFamily: string | undefined;
  predictedCandidates: IdentityCandidate[];
  riskFlags: string[];          // endpoint-level anomalies that reduce confidence
  evidence: string[];           // top evidence sentences for the verdict
}

/**
 * Feature signals extracted from behavioral probe responses.
 * Each sub-object maps a signal key to a numeric weight (0 = absent, 1 = present, fractional = partial).
 */
export interface FingerprintFeatureSet {
  /** Signals derived from self-identity probe (identity_self_knowledge) */
  selfClaim: Record<string, number>;
  /** Signals derived from lexical style probes (identity_style_en, identity_style_zh_tw) */
  lexical: Record<string, number>;
  /** Signals derived from reasoning format probe (identity_reasoning_shape) */
  reasoning: Record<string, number>;
  /** Signals derived from JSON discipline probe (identity_json_discipline) */
  jsonDiscipline: Record<string, number>;
  /** Signals derived from refusal pattern probe (identity_refusal_pattern) */
  refusal: Record<string, number>;
  /** Signals derived from list format probe (identity_list_format) */
  listFormat: Record<string, number>;
}
```

- [ ] **Step 2: No test needed yet (pure types — tested via compilation)**

Run TypeScript compile to check:
```bash
cd d:/code/LLMprobe-engine
npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/identity-report.ts
git commit -m "feat(identity): add IdentityAssessment and FingerprintFeatureSet types"
```

---

## Task 3: Fingerprint Extractor

**Files:**
- Create: `src/fingerprint-extractor.ts`
- Create: `src/__tests__/fingerprint-extractor.test.ts`

The extractor reads probe responses by `probeId` and outputs a `FingerprintFeatureSet`.

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/fingerprint-extractor.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { extractFingerprint } from "../fingerprint-extractor.js";

describe("extractFingerprint", () => {
  it("detects Claude self-claim from identity_self_knowledge response", () => {
    const responses: Record<string, string> = {
      identity_self_knowledge: "I am Claude, an AI assistant made by Anthropic. I'm Claude 3.5 Sonnet.",
    };
    const features = extractFingerprint(responses);
    expect(features.selfClaim["claude"]).toBe(1);
    expect(features.selfClaim["openai"]).toBe(0);
  });

  it("detects GPT/OpenAI self-claim", () => {
    const responses: Record<string, string> = {
      identity_self_knowledge: "I'm ChatGPT, made by OpenAI. I'm based on GPT-4.",
    };
    const features = extractFingerprint(responses);
    expect(features.selfClaim["openai"]).toBe(1);
    expect(features.selfClaim["claude"]).toBe(0);
  });

  it("detects Qwen self-claim", () => {
    const responses: Record<string, string> = {
      identity_self_knowledge: "我是通义千问，阿里巴巴开发的AI助手。",
    };
    const features = extractFingerprint(responses);
    expect(features.selfClaim["qwen"]).toBe(1);
  });

  it("detects JSON pollution from identity_json_discipline response", () => {
    const responses: Record<string, string> = {
      identity_json_discipline: "```json\n{\"name\": \"Alice\", \"age\": 30, \"city\": \"Paris\"}\n```",
    };
    const features = extractFingerprint(responses);
    expect(features.jsonDiscipline["markdown_polluted"]).toBe(1);
    expect(features.jsonDiscipline["pure_json"]).toBe(0);
  });

  it("detects clean JSON discipline", () => {
    const responses: Record<string, string> = {
      identity_json_discipline: '{"name": "Alice", "age": 30, "city": "Paris"}',
    };
    const features = extractFingerprint(responses);
    expect(features.jsonDiscipline["pure_json"]).toBe(1);
    expect(features.jsonDiscipline["markdown_polluted"]).toBe(0);
  });

  it("detects 'certainly' opener in lexical style", () => {
    const responses: Record<string, string> = {
      identity_style_en: "Certainly! The most important skill for a software engineer in 2025 is...",
    };
    const features = extractFingerprint(responses);
    expect(features.lexical["opener_certainly"]).toBe(1);
  });

  it("returns zero-signal features for empty input", () => {
    const features = extractFingerprint({});
    expect(Object.values(features.selfClaim).every(v => v === 0)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd d:/code/LLMprobe-engine
npx vitest run
```

Expected: All tests fail with `Cannot find module '../fingerprint-extractor.js'`.

- [ ] **Step 3: Implement `src/fingerprint-extractor.ts`**

```typescript
// src/fingerprint-extractor.ts — Rule-based behavioral feature extractor (MIT)

import type { FingerprintFeatureSet } from "./identity-report.js";

/** Extract behavioral fingerprint features from probe response map. */
export function extractFingerprint(
  responses: Record<string, string>,
): FingerprintFeatureSet {
  const r = (id: string) => (responses[id] ?? "").toLowerCase();

  // ── Self-claim signals ────────────────────────────────────────────────────
  const selfText = r("identity_self_knowledge");
  const selfClaim: Record<string, number> = {
    claude:    has(selfText, ["claude", "anthropic"]) ? 1 : 0,
    openai:    has(selfText, ["chatgpt", "gpt-4", "gpt-3", "openai"]) ? 1 : 0,
    qwen:      has(selfText, ["qwen", "通义千问", "阿里", "alibaba"]) ? 1 : 0,
    gemini:    has(selfText, ["gemini", "google deepmind", "bard"]) ? 1 : 0,
    llama:     has(selfText, ["llama", "meta ai", "meta llama"]) ? 1 : 0,
    mistral:   has(selfText, ["mistral"]) ? 1 : 0,
    deepseek:  has(selfText, ["deepseek"]) ? 1 : 0,
    vague:     selfText.length > 0 && !has(selfText, [
      "claude","anthropic","chatgpt","gpt","openai","qwen","通义","gemini","llama","mistral","deepseek"
    ]) ? 1 : 0,
  };

  // ── Lexical style signals ─────────────────────────────────────────────────
  const styleEn = r("identity_style_en");
  const styleZh = r("identity_style_zh_tw");
  const combinedStyle = styleEn + " " + styleZh;
  const lexical: Record<string, number> = {
    opener_certainly:   startsWithAny(styleEn, ["certainly", "of course", "sure!", "absolutely"]) ? 1 : 0,
    opener_great:       startsWithAny(styleEn, ["great question", "that's a great", "excellent question"]) ? 1 : 0,
    opener_direct:      startsWithAny(styleEn, ["the most", "in my view", "i think", "i believe"]) ? 1 : 0,
    uses_bold_headers:  combinedStyle.includes("**") ? 1 : 0,
    uses_numbered_list: /\n\d+\.\s/.test(combinedStyle) ? 1 : 0,
    uses_dash_bullets:  /\n-\s/.test(combinedStyle) ? 1 : 0,
    verbose_zh:         styleZh.length > 600 ? 1 : 0,
    concise_en:         styleEn.length > 0 && styleEn.length < 400 ? 1 : 0,
  };

  // ── Reasoning format signals ──────────────────────────────────────────────
  const reasonText = r("identity_reasoning_shape");
  const reasoning: Record<string, number> = {
    starts_with_letme:   startsWithAny(reasonText, ["let me", "let's", "let us"]) ? 1 : 0,
    starts_with_first:   startsWithAny(reasonText, ["first,", "first:", "step 1", "to solve"]) ? 1 : 0,
    gives_answer_first:  /\$0\.05|five cents|answer is \$0\.05/.test(reasonText) && reasonText.indexOf("$0.05") < 50 ? 1 : 0,
    uses_chain_of_thought: reasonText.includes("step by step") || reasonText.includes("thinking through") ? 1 : 0,
    uses_therefore:      reasonText.includes("therefore") || reasonText.includes("thus,") ? 1 : 0,
  };

  // ── JSON discipline signals ───────────────────────────────────────────────
  const jsonText = responses["identity_json_discipline"] ?? "";
  const jsonTrimmed = jsonText.trim();
  const markdown_polluted = jsonText.includes("```") ||
    /^(certainly|sure|of course|here is|here's)/i.test(jsonTrimmed) ? 1 : 0;
  const pure_json = !markdown_polluted && jsonTrimmed.startsWith("{") && jsonTrimmed.endsWith("}") ? 1 : 0;
  const jsonDiscipline: Record<string, number> = {
    pure_json,
    markdown_polluted,
    preamble_text: /^(certainly|sure|of course|here is|here's)/i.test(jsonTrimmed) ? 1 : 0,
  };

  // ── Refusal pattern signals ───────────────────────────────────────────────
  const refusalText = r("identity_refusal_pattern");
  const refusal: Record<string, number> = {
    claude_style:      has(refusalText, ["i'm not able to assist", "i'm unable to assist", "i can't assist with"]) ? 1 : 0,
    gpt_style:         has(refusalText, ["i'm sorry, but i cannot", "i apologize, but", "i'm sorry, i can't"]) ? 1 : 0,
    generic_cannot:    has(refusalText, ["i cannot", "i can't", "i won't"]) ? 1 : 0,
    chinese_refusal:   has(refusalText, ["无法", "不能提供", "不应该", "不合适"]) ? 1 : 0,
    no_refusal:        refusalText.length > 20 && !has(refusalText, ["cannot", "can't", "won't", "unable", "无法", "不能"]) ? 1 : 0,
  };

  // ── List format signals ───────────────────────────────────────────────────
  const listText = r("identity_list_format");
  const listFormat: Record<string, number> = {
    bold_headers:      listText.includes("**") ? 1 : 0,
    plain_numbered:    /^\d+\.\s/m.test(listText) && !listText.includes("**") ? 1 : 0,
    has_explanations:  listText.split("\n").length > 10 ? 1 : 0,
    emoji_bullets:     /[🔸🔹✅❌💡🌟]/u.test(listText) ? 1 : 0,
  };

  return { selfClaim, lexical, reasoning, jsonDiscipline, refusal, listFormat };
}

function has(text: string, keywords: string[]): boolean {
  return keywords.some(kw => text.includes(kw));
}

function startsWithAny(text: string, prefixes: string[]): boolean {
  const t = text.trimStart();
  return prefixes.some(p => t.startsWith(p));
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd d:/code/LLMprobe-engine
npx vitest run
```

Expected: All 7 tests pass. If any fail, check that the signal logic matches the test input exactly (case sensitivity, prefix vs. contains).

- [ ] **Step 5: Compile check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/fingerprint-extractor.ts src/__tests__/fingerprint-extractor.test.ts
git commit -m "feat(identity): add rule-based fingerprint extractor with tests"
```

---

## Task 4: Model Family Baselines

**Files:**
- Create: `src/fingerprint-baseline.ts`

This module defines the family signal weights that the matcher will compare against. No test needed — the matcher tests in Task 5 cover the combined behavior.

- [ ] **Step 1: Create `src/fingerprint-baseline.ts`**

```typescript
// src/fingerprint-baseline.ts — Rule-based model family signal weights (MIT)

import type { FingerprintFeatureSet } from "./identity-report.js";

export interface FamilyBaseline {
  family: string;
  displayName: string;
  /** Weighted signal rules: [featureCategory, signalKey, weight] */
  signals: Array<[keyof FingerprintFeatureSet, string, number]>;
}

/**
 * Signal weight table per model family.
 * Weights are +/- indicating how strongly a signal indicates (positive) or
 * contradicts (negative) this family. Range: -2.0 to +2.0.
 */
export const FAMILY_BASELINES: FamilyBaseline[] = [
  {
    family: "anthropic",
    displayName: "Anthropic / Claude",
    signals: [
      ["selfClaim", "claude", 3.0],
      ["refusal", "claude_style", 2.0],
      ["lexical", "opener_direct", 1.0],
      ["lexical", "uses_bold_headers", 0.5],
      ["jsonDiscipline", "pure_json", 1.0],
      ["jsonDiscipline", "markdown_polluted", -1.5],
      ["lexical", "opener_certainly", -0.5],
      ["reasoning", "starts_with_letme", -0.5],
    ],
  },
  {
    family: "openai",
    displayName: "OpenAI / GPT",
    signals: [
      ["selfClaim", "openai", 3.0],
      ["lexical", "opener_certainly", 2.0],
      ["lexical", "opener_great", 1.5],
      ["refusal", "gpt_style", 2.0],
      ["reasoning", "starts_with_letme", 1.0],
      ["jsonDiscipline", "pure_json", 0.5],
      ["jsonDiscipline", "markdown_polluted", -0.5],
      ["selfClaim", "claude", -3.0],
    ],
  },
  {
    family: "qwen",
    displayName: "Alibaba / Qwen",
    signals: [
      ["selfClaim", "qwen", 3.0],
      ["refusal", "chinese_refusal", 2.0],
      ["lexical", "verbose_zh", 1.0],
      ["jsonDiscipline", "preamble_text", 1.0],
      ["jsonDiscipline", "markdown_polluted", 0.5],
      ["selfClaim", "claude", -3.0],
      ["selfClaim", "openai", -3.0],
    ],
  },
  {
    family: "google",
    displayName: "Google / Gemini",
    signals: [
      ["selfClaim", "gemini", 3.0],
      ["lexical", "uses_numbered_list", 1.0],
      ["reasoning", "uses_therefore", 0.5],
      ["selfClaim", "claude", -3.0],
      ["selfClaim", "openai", -3.0],
    ],
  },
  {
    family: "meta",
    displayName: "Meta / Llama",
    signals: [
      ["selfClaim", "llama", 3.0],
      ["jsonDiscipline", "markdown_polluted", 1.0],
      ["refusal", "no_refusal", 1.5],
      ["selfClaim", "claude", -3.0],
      ["selfClaim", "openai", -3.0],
    ],
  },
  {
    family: "mistral",
    displayName: "Mistral AI",
    signals: [
      ["selfClaim", "mistral", 3.0],
      ["lexical", "concise_en", 1.0],
      ["selfClaim", "claude", -3.0],
      ["selfClaim", "openai", -3.0],
    ],
  },
  {
    family: "deepseek",
    displayName: "DeepSeek",
    signals: [
      ["selfClaim", "deepseek", 3.0],
      ["reasoning", "uses_chain_of_thought", 1.0],
      ["selfClaim", "claude", -3.0],
      ["selfClaim", "openai", -3.0],
    ],
  },
];

/** Map a claimedModel string to its expected family identifier. Returns undefined if unknown. */
export function claimedModelToFamily(claimedModel: string): string | undefined {
  const m = claimedModel.toLowerCase();
  if (m.includes("claude") || m.includes("anthropic")) return "anthropic";
  if (m.includes("gpt") || m.includes("chatgpt") || m.includes("openai") || m.startsWith("o1") || m.startsWith("o3") || m.startsWith("o4")) return "openai";
  if (m.includes("qwen") || m.includes("tongyi")) return "qwen";
  if (m.includes("gemini") || m.includes("bard") || m.includes("google")) return "google";
  if (m.includes("llama") || m.includes("meta")) return "meta";
  if (m.includes("mistral") || m.includes("mixtral")) return "mistral";
  if (m.includes("deepseek")) return "deepseek";
  return undefined;
}
```

- [ ] **Step 2: Compile check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/fingerprint-baseline.ts
git commit -m "feat(identity): add rule-based model family baselines"
```

---

## Task 5: Candidate Matcher

**Files:**
- Create: `src/candidate-matcher.ts`
- Create: `src/__tests__/candidate-matcher.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/__tests__/candidate-matcher.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { matchCandidates, deriveVerdict } from "../candidate-matcher.js";
import type { FingerprintFeatureSet } from "../identity-report.js";

const claudeFeatures: FingerprintFeatureSet = {
  selfClaim:      { claude: 1, openai: 0, qwen: 0, gemini: 0, llama: 0, mistral: 0, deepseek: 0, vague: 0 },
  lexical:        { opener_certainly: 0, opener_great: 0, opener_direct: 1, uses_bold_headers: 1, uses_numbered_list: 0, uses_dash_bullets: 1, verbose_zh: 0, concise_en: 0 },
  reasoning:      { starts_with_letme: 0, starts_with_first: 0, gives_answer_first: 0, uses_chain_of_thought: 0, uses_therefore: 0 },
  jsonDiscipline: { pure_json: 1, markdown_polluted: 0, preamble_text: 0 },
  refusal:        { claude_style: 1, gpt_style: 0, generic_cannot: 1, chinese_refusal: 0, no_refusal: 0 },
  listFormat:     { bold_headers: 1, plain_numbered: 0, has_explanations: 1, emoji_bullets: 0 },
};

const gptFeatures: FingerprintFeatureSet = {
  selfClaim:      { claude: 0, openai: 1, qwen: 0, gemini: 0, llama: 0, mistral: 0, deepseek: 0, vague: 0 },
  lexical:        { opener_certainly: 1, opener_great: 1, opener_direct: 0, uses_bold_headers: 1, uses_numbered_list: 1, uses_dash_bullets: 0, verbose_zh: 0, concise_en: 0 },
  reasoning:      { starts_with_letme: 1, starts_with_first: 0, gives_answer_first: 0, uses_chain_of_thought: 0, uses_therefore: 0 },
  jsonDiscipline: { pure_json: 1, markdown_polluted: 0, preamble_text: 0 },
  refusal:        { claude_style: 0, gpt_style: 1, generic_cannot: 0, chinese_refusal: 0, no_refusal: 0 },
  listFormat:     { bold_headers: 1, plain_numbered: 0, has_explanations: 1, emoji_bullets: 0 },
};

describe("matchCandidates", () => {
  it("ranks anthropic first for Claude-like features", () => {
    const candidates = matchCandidates(claudeFeatures);
    expect(candidates[0].family).toBe("anthropic");
    expect(candidates[0].score).toBeGreaterThan(0.5);
  });

  it("ranks openai first for GPT-like features", () => {
    const candidates = matchCandidates(gptFeatures);
    expect(candidates[0].family).toBe("openai");
    expect(candidates[0].score).toBeGreaterThan(0.5);
  });

  it("returns at most 3 candidates", () => {
    const candidates = matchCandidates(claudeFeatures);
    expect(candidates.length).toBeLessThanOrEqual(3);
  });
});

describe("deriveVerdict", () => {
  it("returns match when top candidate matches claimed family with high confidence", () => {
    const candidates = matchCandidates(claudeFeatures);
    const verdict = deriveVerdict(candidates, "anthropic");
    expect(verdict.status).toBe("match");
    expect(verdict.confidence).toBeGreaterThan(0.6);
  });

  it("returns mismatch when top candidate contradicts claimed family", () => {
    const candidates = matchCandidates(gptFeatures);
    const verdict = deriveVerdict(candidates, "anthropic");
    expect(verdict.status).toBe("mismatch");
  });

  it("returns uncertain when no claimed family provided", () => {
    const candidates = matchCandidates(claudeFeatures);
    const verdict = deriveVerdict(candidates, undefined);
    expect(verdict.status).toBe("uncertain");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run
```

Expected: All 5 new tests fail with import error.

- [ ] **Step 3: Implement `src/candidate-matcher.ts`**

```typescript
// src/candidate-matcher.ts — Weighted family scoring and verdict derivation (MIT)

import { FAMILY_BASELINES, claimedModelToFamily } from "./fingerprint-baseline.js";
import type { FingerprintFeatureSet, IdentityCandidate, IdentityStatus } from "./identity-report.js";

/**
 * Score each family baseline against the observed feature set.
 * Returns top-3 candidates sorted by score descending, with scores normalized to 0-1.
 */
export function matchCandidates(features: FingerprintFeatureSet): IdentityCandidate[] {
  const rawScores: Array<{ family: string; displayName: string; raw: number; reasons: string[] }> = [];

  for (const baseline of FAMILY_BASELINES) {
    let raw = 0;
    const reasons: string[] = [];

    for (const [category, key, weight] of baseline.signals) {
      const value = (features[category] as Record<string, number>)[key] ?? 0;
      if (value === 0) continue;
      raw += weight * value;
      if (weight > 0) {
        reasons.push(`${key.replace(/_/g, " ")} detected (+${weight.toFixed(1)})`);
      } else {
        reasons.push(`${key.replace(/_/g, " ")} contradicts ${baseline.family} (${weight.toFixed(1)})`);
      }
    }

    rawScores.push({ family: baseline.family, displayName: baseline.displayName, raw, reasons });
  }

  // Normalize scores to 0-1 range using max positive score
  const maxRaw = Math.max(...rawScores.map(s => s.raw), 1);
  const candidates: IdentityCandidate[] = rawScores
    .filter(s => s.raw > 0)
    .sort((a, b) => b.raw - a.raw)
    .slice(0, 3)
    .map(s => ({
      model: s.displayName,
      family: s.family,
      score: Math.min(1, Math.max(0, s.raw / maxRaw)),
      reasons: s.reasons.slice(0, 5),
    }));

  return candidates;
}

/**
 * Given top candidates and optionally a claimed family, derive the overall verdict.
 * - "match": top candidate matches claimed family with confidence > 0.5
 * - "mismatch": top candidate is a different known family and score is high enough
 * - "uncertain": no clear signal, no claimed family, or scores too close
 */
export function deriveVerdict(
  candidates: IdentityCandidate[],
  claimedFamily: string | undefined,
): { status: IdentityStatus; confidence: number; evidence: string[] } {
  if (candidates.length === 0) {
    return { status: "uncertain", confidence: 0, evidence: ["No behavioral signals detected"] };
  }

  const top = candidates[0];
  const evidence = top.reasons.slice(0, 3);

  if (!claimedFamily) {
    return { status: "uncertain", confidence: top.score * 0.7, evidence };
  }

  if (top.family === claimedFamily && top.score > 0.5) {
    const secondScore = candidates[1]?.score ?? 0;
    const margin = top.score - secondScore;
    const confidence = Math.min(1, top.score * (0.6 + margin * 0.4));
    return { status: "match", confidence, evidence };
  }

  if (top.family !== claimedFamily && top.score > 0.4) {
    return {
      status: "mismatch",
      confidence: top.score,
      evidence: [
        `Behavior most consistent with ${top.model} (score: ${top.score.toFixed(2)})`,
        `Claimed family ${claimedFamily} not in top candidates`,
        ...evidence,
      ],
    };
  }

  return { status: "uncertain", confidence: top.score * 0.5, evidence };
}

/** Convenience: given a raw claimedModel string, resolve family then derive verdict. */
export function deriveVerdictFromClaimedModel(
  candidates: IdentityCandidate[],
  claimedModel: string | undefined,
): { status: IdentityStatus; confidence: number; evidence: string[]; predictedFamily: string | undefined } {
  const claimedFamily = claimedModel ? claimedModelToFamily(claimedModel) : undefined;
  const verdict = deriveVerdict(candidates, claimedFamily);
  return { ...verdict, predictedFamily: candidates[0]?.family };
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run
```

Expected: All tests pass (7 extractor + 5 matcher = 12 total). If `matchCandidates` returns no candidates for a feature set with all zeros, check the `filter(s => s.raw > 0)` line — it's correct since zero-signal inputs have no evidence.

Note: The `deriveVerdict(candidates, undefined)` test expects `"uncertain"` — this works because the function returns `"uncertain"` when `claimedFamily` is undefined.

- [ ] **Step 5: Compile check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/candidate-matcher.ts src/__tests__/candidate-matcher.test.ts
git commit -m "feat(identity): add candidate matcher with weighted family scoring"
```

---

## Task 6: Wire Identity Phase into Runner

**Files:**
- Modify: `src/runner.ts:28-71` (interfaces) and end of `runProbes()` function
- Modify: `src/index.ts`

- [ ] **Step 1: Update `RunOptions` and `RunReport` in `src/runner.ts`**

In `src/runner.ts`, add `claimedModel?` to `RunOptions` (after `baseline?`) and `identityAssessment?` to `RunReport`:

Replace the `RunReport` interface (lines 28-38):
```typescript
export interface RunReport {
  baseUrl: string;
  modelId: string;
  claimedModel?: string;
  startedAt: string;
  completedAt: string;
  score: number;       // conservative 0-100
  scoreMax: number;    // optimistic 0-100
  totalInputTokens: number | null;
  totalOutputTokens: number | null;
  results: ProbeResult[];
  identityAssessment?: IdentityAssessment;
}
```

Add `claimedModel?` to `RunOptions` (after `baseline?`, before closing brace):
```typescript
  /**
   * The model name the operator claims is running behind this endpoint.
   * When provided, the identity phase compares observed behavior against this family.
   */
  claimedModel?: string;
```

- [ ] **Step 2: Add imports to `src/runner.ts`**

After the existing imports (after line 9 `import { runContextCheck ...}`), add:
```typescript
import { extractFingerprint } from "./fingerprint-extractor.js";
import { matchCandidates, deriveVerdictFromClaimedModel } from "./candidate-matcher.js";
import type { IdentityAssessment } from "./identity-report.js";
```

- [ ] **Step 3: Add identity phase after the probe loop in `runProbes()`**

In `src/runner.ts`, just before the `// ── Finalize ──` comment (around line 463), add the identity phase:

```typescript
  // ── Identity Phase ────────────────────────────────────────────────────────
  let identityAssessment: IdentityAssessment | undefined;
  {
    // Collect feature_extract probe responses by probeId
    const featureResponses: Record<string, string> = {};
    for (const r of results) {
      if (r.status === "done" && r.response) {
        const probe = probes.find(p => p.id === r.probeId);
        if (probe?.scoring === "feature_extract") {
          featureResponses[r.probeId] = r.response;
        }
      }
    }

    // Derive risk flags from endpoint integrity results
    const riskFlags: string[] = [];
    for (const r of results) {
      if (r.passed === false) {
        const groups = ["integrity", "security"];
        const probe = probes.find(p => p.id === r.probeId);
        if (probe && groups.includes(probe.group)) {
          riskFlags.push(`${r.label}: ${r.passReason ?? r.error ?? "failed"}`);
        }
      }
      if (r.passed === "warning" && r.probeId === "consistency_check") {
        riskFlags.push("consistency_check warning: possible cache hit — fingerprint confidence reduced");
      }
    }

    // Only run identity assessment if we have at least one feature_extract response
    if (Object.keys(featureResponses).length > 0) {
      const features = extractFingerprint(featureResponses);
      const candidates = matchCandidates(features);
      const { status, confidence, evidence, predictedFamily } = deriveVerdictFromClaimedModel(
        candidates,
        options.claimedModel,
      );
      // Reduce confidence when endpoint risk flags are present
      const adjustedConfidence = riskFlags.length > 0
        ? Math.max(0, confidence - 0.15 * Math.min(riskFlags.length, 3))
        : confidence;

      identityAssessment = {
        status,
        confidence: Math.round(adjustedConfidence * 100) / 100,
        claimedModel: options.claimedModel,
        predictedFamily,
        predictedCandidates: candidates,
        riskFlags,
        evidence,
      };
    }
  }
```

- [ ] **Step 4: Include `identityAssessment` in the return value**

In the `return` statement at the end of `runProbes()`, add `identityAssessment`:

```typescript
  return {
    baseUrl,
    modelId,
    claimedModel: options.claimedModel,
    startedAt,
    completedAt,
    score: low,
    scoreMax: high,
    totalInputTokens: totalIn > 0 ? totalIn : null,
    totalOutputTokens: totalOut > 0 ? totalOut : null,
    results,
    identityAssessment,
  };
```

- [ ] **Step 5: Compile check**

```bash
npx tsc --noEmit
```

Expected: No errors. Fix any type mismatches — `IdentityAssessment` from `identity-report.ts` must import cleanly.

- [ ] **Step 6: Run all tests**

```bash
npx vitest run
```

Expected: All 12 tests still pass (runner changes have no unit tests, covered by integration).

- [ ] **Step 7: Commit**

```bash
git add src/runner.ts
git commit -m "feat(identity): wire identity assessment phase into runProbes()"
```

---

## Task 7: Update Public Exports

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: Add exports to `src/index.ts`**

Append to the end of `src/index.ts`:

```typescript
export { extractFingerprint } from "./fingerprint-extractor.js";
export type { FingerprintFeatureSet, IdentityAssessment, IdentityCandidate, IdentityStatus } from "./identity-report.js";
export { matchCandidates, deriveVerdict, deriveVerdictFromClaimedModel } from "./candidate-matcher.js";
export { FAMILY_BASELINES, claimedModelToFamily } from "./fingerprint-baseline.js";
export type { FamilyBaseline } from "./fingerprint-baseline.js";
```

- [ ] **Step 2: Compile check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/index.ts
git commit -m "feat(identity): export new identity types and functions from public API"
```

---

## Task 8: CLI Flag

**Files:**
- Modify: `src/cli.ts`

- [ ] **Step 1: Read current CLI to understand option structure**

Run:
```bash
cat d:/code/LLMprobe-engine/src/cli.ts
```

Find where `--model` or similar options are defined.

- [ ] **Step 2: Add `--claimed-model` option**

In the `program.option(...)` chain (wherever `--model` is defined), add:
```typescript
.option("--claimed-model <model>", "Model name the vendor claims — used for identity verification")
```

In the option handler where `runProbes()` is called, pass `claimedModel: opts.claimedModel` in the options object.

- [ ] **Step 3: Display identity assessment in CLI output**

After printing the score, add identity report display. Find where `report.score` is printed and add after it:

```typescript
if (report.identityAssessment) {
  const ia = report.identityAssessment;
  const statusEmoji = ia.status === "match" ? "✓" : ia.status === "mismatch" ? "✗" : "?";
  console.log(`\nIdentity: ${statusEmoji} ${ia.status.toUpperCase()} (confidence: ${(ia.confidence * 100).toFixed(0)}%)`);
  if (ia.claimedModel) console.log(`  Claimed : ${ia.claimedModel}`);
  if (ia.predictedFamily) console.log(`  Detected: ${ia.predictedFamily}`);
  if (ia.predictedCandidates.length > 0) {
    console.log("  Top candidates:");
    for (const c of ia.predictedCandidates) {
      console.log(`    ${(c.score * 100).toFixed(0)}%  ${c.model}`);
    }
  }
  if (ia.evidence.length > 0) {
    console.log("  Evidence:");
    for (const e of ia.evidence) console.log(`    • ${e}`);
  }
  if (ia.riskFlags.length > 0) {
    console.log(`  Risk flags (${ia.riskFlags.length} endpoint anomalies reduce confidence):`);
    for (const f of ia.riskFlags.slice(0, 3)) console.log(`    ⚠ ${f}`);
  }
}
```

- [ ] **Step 4: Compile check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Smoke test CLI help**

```bash
node dist/cli.js --help
```

Expected: `--claimed-model <model>` appears in the help output.

- [ ] **Step 6: Commit and bump version**

```bash
# Update package.json version from 0.1.0 → 0.2.0 (feat → bump minor)
# Edit package.json manually or with sed
git add src/cli.ts package.json
git commit -m "feat(identity): add --claimed-model CLI flag and identity report display"
```

---

## Task 9: Build and Final Verification

- [ ] **Step 1: Full build**

```bash
cd d:/code/LLMprobe-engine
npm run build
```

Expected: No TypeScript errors, `dist/` populated with updated `.js` and `.d.ts` files.

- [ ] **Step 2: Run all tests**

```bash
npx vitest run
```

Expected: All 12 tests pass.

- [ ] **Step 3: Verify exported types are in dist**

```bash
grep -l "IdentityAssessment" dist/*.d.ts
```

Expected: `dist/index.d.ts` and `dist/identity-report.d.ts` listed.

- [ ] **Step 4: Final commit**

```bash
git add dist/
git commit -m "chore: rebuild dist for identity assessment MVP v1"
```

---

## Self-Review

### Spec Coverage

| Spec Requirement | Task |
|-----------------|------|
| Support `claimedModel` input | Task 6 (RunOptions), Task 8 (CLI) |
| 10-20 identity probes | Already in probe-suite.ts (8 probes); can add 2 more later |
| Rule/weighted score for model family | Tasks 4, 5 |
| Output `match / mismatch / uncertain` | Task 5 (`deriveVerdict`) |
| Evidence sentences in report | Tasks 5, 6 |
| `identityAssessment` block in RunReport | Task 6 |
| `IdentityAssessment` TypeScript interface | Task 2 |
| CLI display | Task 8 |

### Spec Requirements Not in This Plan (future phases)
- `FingerprintFeatureSet` full ML/embedding similarity → v2
- Baseline dataset files (`baselines/models/...`) → v2
- Multiple sampling + averaging → v2
- Visual comparison → v3

### Placeholder Scan
- No "TBD", "TODO", or vague steps found.
- All code blocks show complete implementations.

### Type Consistency
- `IdentityAssessment` defined in `identity-report.ts` and imported in `runner.ts`, `candidate-matcher.ts`, `index.ts`.
- `FingerprintFeatureSet` defined in `identity-report.ts`, imported in `fingerprint-extractor.ts`, `candidate-matcher.ts`, `fingerprint-baseline.ts`.
- `IdentityCandidate` used in `candidate-matcher.ts` return types and in `IdentityAssessment.predictedCandidates` — consistent.
- `deriveVerdictFromClaimedModel` in `candidate-matcher.ts` is the function called in `runner.ts` — names match.
