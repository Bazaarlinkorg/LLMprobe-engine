# README Tutorial & Push to Main Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update README.md with a complete real-world tutorial (using BazaarLink endpoint + deepseek judge), update the probe table for the new identity group, then push everything to GitHub main.

**Architecture:** Single-file edit (README.md) + git push. No code changes needed — all probe fixes and identity probes are already committed.

**Tech Stack:** Markdown, Git, GitHub (Bazaarlinkorg/LLMprobe-engine)

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `README.md` | Modify | Add tutorial, update probe table |
| `docs/superpowers/plans/2026-04-07-readme-and-push.md` | Create (this file) | Plan tracking |

---

### Task 1: Update README — probe table

The current probe table is missing the 8 new `identity` group probes added in commit `676ac16`.

**Files:**
- Modify: `README.md:102-125`

- [ ] **Step 1: Replace the Probe Suite table**

In `README.md`, replace the entire `## Probe Suite` section with:

```markdown
## Probe Suite

### Quality

| ID | Scoring | Description |
|---|---|---|
| zh_reasoning | llm_judge | 中文推理能力 |
| code_gen | llm_judge | Code generation quality |
| instruction_follow | exact_match | Strict instruction following |
| en_reasoning | llm_judge | English reasoning |
| math_logic | exact_match | Math reasoning |
| hallucination | llm_judge | Hallucination resistance |
| censorship | keyword_match | Taiwan political question |
| json_output | exact_match | Pure JSON output |
| prompt_injection | keyword_match | Prompt injection resistance *(neutral)* |

### Security

| ID | Scoring | Description |
|---|---|---|
| infra_probe | keyword_match | Infrastructure leak detection |
| bedrock_probe | keyword_match | AWS Bedrock identifier leak |
| identity_leak | keyword_match | System prompt leak detection (multilingual) |

### Integrity

| ID | Scoring | Description |
|---|---|---|
| knowledge_cutoff | keyword_match | Knowledge cutoff honesty |
| symbol_exact | exact_match | Unicode symbol pass-through |
| cache_detection | header_check | Response cache detection |
| token_inflation | token_check | Hidden system prompt detection |
| sse_compliance | sse_compliance | SSE stream format validation |
| thinking_block | thinking_check | Anthropic beta header forwarding *(neutral)* |
| consistency_check | consistency_check | Response caching detection |
| context_length *(optional)* | context_check | Actual context window measurement |

### Identity *(all neutral — for fingerprint analysis, not scored)*

| ID | Scoring | Description |
|---|---|---|
| identity_style_en | feature_extract | English writing style fingerprint |
| identity_style_zh_tw | feature_extract | 繁體中文風格識別 |
| identity_reasoning_shape | feature_extract | Reasoning format preference |
| identity_self_knowledge | feature_extract | Model self-description collection |
| identity_list_format | feature_extract | List formatting preference |
| identity_refusal_pattern | keyword_match | Refusal phrase detection |
| identity_json_discipline | keyword_match | JSON-only instruction compliance |
| identity_capability_claim | keyword_match | False real-time capability detection |
```

- [ ] **Step 2: Verify table renders correctly**

Preview the markdown mentally — each table should have 3 columns and no broken pipes.

---

### Task 2: Update README — real-world tutorial section

Add a complete end-to-end tutorial using the BazaarLink endpoint as the real example.

**Files:**
- Modify: `README.md` — insert after `## Quick Start (CLI)`, before `## Install`

- [ ] **Step 1: Replace Quick Start with full tutorial block**

Replace the existing `## Quick Start (CLI)` section with:

```markdown
## Quick Start

### Step 1 — Check available baselines

Before running, find the correct `--baseline-model` ID for your target model:

```bash
curl https://bazaarlink.ai/api/probe/baselines
```

Example response:
```json
{"models":["openai/gpt-5.4","openai/gpt-5.4-mini","anthropic/claude-sonnet-4.6",...]}
```

> Note: The baseline model ID (e.g. `openai/gpt-5.4`) may differ from the model ID
> your endpoint accepts (e.g. `gpt-5.4`). Use `--baseline-model` to specify the
> baseline lookup key separately from `--model`.

### Step 2 — Check available judge models

```bash
curl https://bazaarlink.ai/api/v1/models \
  -H "Authorization: Bearer <YOUR_KEY>" \
  | python -m json.tool | grep '"id"' | grep deepseek
```

### Step 3 — Run the full probe suite

```bash
node dist/cli.js run \
  --base-url https://bazaarlink.ai/api/v1 \
  --api-key sk-bl-... \
  --model gpt-5.4 \
  --fetch-baseline https://bazaarlink.ai \
  --baseline-model openai/gpt-5.4 \
  --judge-base-url https://bazaarlink.ai/api/v1 \
  --judge-api-key sk-bl-... \
  --judge-model deepseek/deepseek-v3.2 \
  --output report.json
```

### Example output

```
  Baseline  : downloaded 19 entries for 'openai/gpt-5.4'

BazaarLink Probe Engine
  Endpoint : https://bazaarlink.ai/api/v1
  Model    : gpt-5.4
  Judge    : deepseek/deepseek-v3.2 @ https://bazaarlink.ai/api/v1 (threshold 7)
  Timeout  : 180000ms per probe

  [1/19] ✓ 中文推理           12.7s  Similarity score: 9/10 — nearly identical
  [2/19] ✓ 程式碼生成           3.7s  Similarity score: 9/10 — nearly identical
  [3/19] ✓ 指令遵從             1.5s  Response contains expected string "Fortran"
  ...
  [12/19] ✓ 身份洩露            6.7s  Response contains expected keyword: "확인할 수 없"
  ...
  [18/19] ⚠ Thinking Block    2.5s  No thinking block (neutral — non-Claude model)

────────────────────────────────────────────────────────────
  Score     : 100 / 100
  Results   : 18 passed  1 warning  0 failed  (19 total)
────────────────────────────────────────────────────────────
```

### Step 4 — Read the report

```bash
# Print a specific probe's response
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
```

- [ ] **Step 2: Update the install section to reflect local-first usage**

After the tutorial, update `## Install` to also show the local (no npm) path:

```markdown
## Install

### Option A: Local (no npm publish required)

```bash
git clone https://github.com/Bazaarlinkorg/LLMprobe-engine
cd LLMprobe-engine
npm install
npm run build
node dist/cli.js run --help
```

### Option B: Global CLI via npm

```bash
npm install -g @bazaarlink/probe-engine
bazaarlink-probe run --help
```
```

---

### Task 3: Update README — add link to modification guide

After the Probe Suite section, add a reference to the modification guide.

**Files:**
- Modify: `README.md` — after probe table, before `## Programmatic Usage`

- [ ] **Step 1: Add modification guide link**

```markdown
## Customising Probes

To add multilingual keywords, mark probes as neutral, or create new probes,
see the step-by-step guide: [`docs/probe-modification-guide.md`](docs/probe-modification-guide.md)
```

---

### Task 4: Update report schema — add identity group

**Files:**
- Modify: `README.md` — `## Report JSON Schema` section

- [ ] **Step 1: Update group field in schema**

Change:
```json
"group": "quality | security | integrity",
```
To:
```json
"group": "quality | security | integrity | identity",
```

---

### Task 5: Commit and push to main

**Files:**
- Commit: `README.md`

- [ ] **Step 1: Stage README**

```bash
cd d:/code/LLMprobe-engine
git add README.md
```

- [ ] **Step 2: Commit**

```bash
git commit -m "$(cat <<'EOF'
docs(readme): add real-world tutorial, identity probe table, modification guide link

- Add Step 1-4 quick start tutorial using BazaarLink endpoint + deepseek judge
- Show baseline model ID discovery (curl /api/probe/baselines)
- Show judge model discovery (curl /api/v1/models)
- Add local install path (git clone + npm run build)
- Update probe suite table with identity group (8 new probes)
- Link to docs/probe-modification-guide.md
- Update report schema group enum to include identity

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 3: Push to main**

```bash
git push origin main
```

Expected output:
```
To https://github.com/Bazaarlinkorg/LLMprobe-engine.git
   676ac16..xxxxxxx  main -> main
```

- [ ] **Step 4: Verify on GitHub**

Open `https://github.com/Bazaarlinkorg/LLMprobe-engine` and confirm README renders correctly with the tutorial and all probe tables.
