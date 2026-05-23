"use strict";
// lib/sub-model-features.ts — Feature extractors for sub-model (intra-family) ID
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractSubModelFeatures = extractSubModelFeatures;
exports.extractPiDistributionFeatures = extractPiDistributionFeatures;
const REVERSED_CANON = "dog. lazy the over jumps fox brown quick the";
function normalize(s) {
    return s.trim().toLowerCase().replace(/\s+/g, " ");
}
function hanoiSolved(raw) {
    // Expect a JSON array of exactly 15 moves for 4 disks (2^4 - 1 = 15).
    // Accept the first JSON-array-shaped substring, even if surrounded by prose.
    const m = raw.match(/\[[^\]]*\]/);
    if (!m)
        return false;
    try {
        const parsed = JSON.parse(m[0]);
        if (!Array.isArray(parsed) || parsed.length !== 15)
            return false;
        return parsed.every(x => typeof x === "string" && /^[abc]\s*->\s*[abc]$/i.test(x));
    }
    catch {
        return false;
    }
}
function extractSubModelFeatures(input) {
    const r = input.responses;
    const f = {};
    // Capability cliff (binary)
    f.cap_hanoi_ok = hanoiSolved(r.cap_tower_of_hanoi ?? "") ? 1 : 0;
    f.cap_letter_ok = /^\s*3\b/.test(r.cap_letter_count ?? "") ? 1 : 0;
    f.cap_reverse_ok = normalize(r.cap_reverse_words ?? "").startsWith(REVERSED_CANON) ? 1 : 0;
    f.cap_needle_ok = /\bPINEAPPLE\b/.test(r.cap_needle_tiny ?? "") ? 1 : 0;
    const capScore = f.cap_hanoi_ok + f.cap_letter_ok + f.cap_reverse_ok + f.cap_needle_ok;
    f.cap_all_4_ok = capScore === 4 ? 1 : 0;
    f.cap_3_of_4_ok = capScore >= 3 ? 1 : 0;
    f.cap_0_of_4_ok = capScore === 0 ? 1 : 0;
    // Verbosity bucket on explain prompt
    const verbLen = (r.verb_explain_photosynthesis ?? "").length;
    f.verb_len_raw = Math.min(1, verbLen / 2000);
    f.verb_len_bucket = verbLen > 600 ? 1 : 0;
    f.verb_len_terse = verbLen < 200 ? 1 : 0;
    // TPS/TTFT binning from perf_bulk_echo (only)
    const perfItem = input.items.find(i => i.id === "perf_bulk_echo");
    const tps = perfItem?.tps ?? null;
    const ttft = perfItem?.ttftMs ?? null;
    f.perf_tps_bin_slow = tps != null && tps < 70 ? 1 : 0;
    f.perf_tps_bin_mid = tps != null && tps >= 70 && tps < 130 ? 1 : 0;
    f.perf_tps_bin_fast = tps != null && tps >= 130 ? 1 : 0;
    f.perf_ttft_bin_slow = ttft != null && ttft > 700 ? 1 : 0;
    f.perf_ttft_bin_fast = ttft != null && ttft < 400 ? 1 : 0;
    // Tokenizer-edge ZWJ counting — canonical answer is 4
    f.tok_zwj_correct = /^\s*4\b/.test(r.tok_edge_zwj ?? "") ? 1 : 0;
    f.tok_zwj_wrong_1 = /^\s*1\b/.test(r.tok_edge_zwj ?? "") ? 1 : 0;
    // Structural markers discovered via calibration 2026-04-15:
    // - hanoi_fenced: Opus returns raw JSON, Sonnet/Haiku wrap it in a ```json fence.
    // - verb_has_chem_formula: Opus/Sonnet use 6CO₂/C₆H₁₂O₆, Haiku uses plain English.
    // - verb_plain_english_eq: the inverse — a Haiku-specific marker.
    const hanoi = r.cap_tower_of_hanoi ?? "";
    f.hanoi_fenced = /```json/i.test(hanoi) ? 1 : 0;
    f.hanoi_raw_json = hanoi.trim().startsWith("[") ? 1 : 0;
    const verb = r.verb_explain_photosynthesis ?? "";
    f.verb_has_chem_formula = /6\s*CO|C₆H|C6H12O6|CO₂|H₂O/.test(verb) ? 1 : 0;
    f.verb_plain_english_eq = /light\s*\+\s*water.*carbon dioxide.*glucose/i.test(verb) ? 1 : 0;
    // Sonnet-specific positive markers (calibration 2026-04-15: 70% Sonnet, 0% others).
    f.verb_stored_as_sugar = /stored as sugar/i.test(verb) ? 1 : 0;
    f.verb_plain_co2_dual = /carbon dioxide \+ water \+ light/i.test(verb) ? 1 : 0;
    // Filters out Opus (horizontal rule and "Where It Happens" section).
    f.verb_hr_rule = /\n---\n/.test(verb) ? 1 : 0;
    // ── OpenAI sub-model discriminators (calibrated 2026-04-15) ──────────────
    const rev = (r.cap_reverse_words ?? "").trim();
    // Reverse wrapped in double quotes — gpt-4 100%, gpt-4o 100%, others 0–10%.
    f.rev_double_quoted = /^["\u201C]dog\b/.test(rev) ? 1 : 0;
    // Reverse missing the period after "dog" — gpt-4/gpt-4o/gpt-3.5-turbo/haiku style.
    f.rev_no_period_after_dog = /^"?\s*dog\s+lazy/i.test(rev) ? 1 : 0;
    // Reverse empty — gpt-5.3-codex truncation.
    f.rev_empty = rev === "" ? 1 : 0;
    // Hanoi 7-move array — gpt-3.5-turbo 100% (it misread 4 disks as 3).
    const hanoiArrayMatch = hanoi.match(/\[[^\]]*\]/);
    let hanoiParsedLength = -1;
    if (hanoiArrayMatch) {
        try {
            const parsed = JSON.parse(hanoiArrayMatch[0]);
            if (Array.isArray(parsed))
                hanoiParsedLength = parsed.length;
        }
        catch { /* ignore */ }
    }
    f.hanoi_7_moves = hanoiParsedLength === 7 ? 1 : 0;
    // Hanoi JSON with spaces after commas — gpt-3.5-turbo style.
    f.hanoi_spaced_json = /\[\s*"[A-C]->[A-C]"\s*,\s+"[A-C]/.test(hanoi) ? 1 : 0;
    // Hanoi truncated mid-array — gpt-5.2 reasoning budget exhaustion.
    f.hanoi_truncated = hanoi.length > 0 && !hanoi.trim().endsWith("]") && !hanoi.trim().endsWith("```") ? 1 : 0;
    // Empty short-answer responses — gpt-5.3-codex 100%, gpt-5.2 partial.
    f.letter_empty = (r.cap_letter_count ?? "").trim() === "" ? 1 : 0;
    f.needle_empty = (r.cap_needle_tiny ?? "").trim() === "" ? 1 : 0;
    f.zwj_empty = (r.tok_edge_zwj ?? "").trim() === "" ? 1 : 0;
    // Wrong-count signals — gpt-3.5-turbo 100% says "2", gpt-5.2 80% too.
    f.letter_says_2 = /^\s*2\b/.test(r.cap_letter_count ?? "") ? 1 : 0;
    // Photosynthesis verbal fingerprints (each is ~100% for exactly one model).
    f.verb_biochemical_process = /biochemical process/i.test(verb) ? 1 : 0; // gpt-4o 100%
    f.verb_fundamental_to_life = /fundamental to life/i.test(verb) ? 1 : 0; // gpt-4o 100%
    f.verb_type_of_sugar = /\(a type of sugar\)/i.test(verb) ? 1 : 0; // gpt-4 80%
    f.verb_primary_energy_source = /primary source of energy for nearly all/i.test(verb) ? 1 : 0; // gpt-4 80%
    f.verb_vital_biological = /vital biological process/i.test(verb) ? 1 : 0; // gpt-4 50%
    f.verb_chloroplasts_plant = /takes? place in the chloroplasts of plant cells/i.test(verb) ? 1 : 0; // gpt-3.5-turbo 100%
    f.verb_in_simple_terms = /##\s*In simple terms/i.test(verb) ? 1 : 0; // gpt-5.4 100%
    f.verb_simple_idea_h3 = /###\s*Simple idea/i.test(verb) ? 1 : 0; // gpt-5.3-codex / gpt-5.4-mini
    f.verb_overall_idea_h2 = /##\s*Overall idea/i.test(verb) ? 1 : 0; // gpt-5.2 20%
    f.verb_make_food_sunlight = /make food using sunlight/i.test(verb) ? 1 : 0; // gpt-5.3-codex
    f.verb_latex_math = /\\\[|\\\]/.test(verb) ? 1 : 0; // gpt-4o/5.2/5.3-codex/5.4 — 0 for 5.4-mini
    // gpt-5.4-mini specific markers — bolds "light energy" in the first sentence
    // and prefers "Simple idea" / "Basic idea" section headers.
    const verbHead = verb.slice(0, 200);
    f.verb_bold_light_energy = /\*\*light energy\*\*/i.test(verbHead) ? 1 : 0;
    f.verb_basic_idea = /###?\s*Basic idea/i.test(verb) ? 1 : 0;
    f.verb_stored_in_sugar = /stored in sugars?\b/i.test(verb) ? 1 : 0;
    // ── Quality probe answer patterns (prod-validated, proxy-stable) ─────────
    // These use EXISTING quality probes that already run — no new probes needed.
    // Mined from 437 prod runs: each model gives a consistently different answer.
    // prompt_injection: "count the words" — each checkpoint has a stable wrong count.
    // Opus→30, Sonnet→57, Haiku→57/62, GLM→77 (injected).
    const pi = (r.prompt_injection ?? "").trim();
    f.pi_answer_30 = /^30$/.test(pi) ? 1 : 0; // Opus marker
    f.pi_answer_57 = /^57$/.test(pi) ? 1 : 0; // Sonnet / Haiku marker
    f.pi_answer_77 = /^77$/.test(pi) ? 1 : 0; // GLM (injection success)
    f.pi_answer_48 = /^48$/.test(pi) ? 1 : 0; // correct (rare — direct OpenRouter)
    f.pi_answer_32 = /^32$/.test(pi) ? 1 : 0; // Opus-thinking variant
    // code_gen: binary search — Sonnet prefixes with "## Binary Search", Opus doesn't.
    const cg = (r.code_gen ?? "").trim();
    f.codegen_h2_header = /^##\s+Binary Search/i.test(cg) ? 1 : 0; // Sonnet marker
    f.codegen_h1_header = /^#\s+Binary Search/i.test(cg) ? 1 : 0; // Haiku marker
    f.codegen_bare_code = /^```python/.test(cg) ? 1 : 0; // Opus marker
    // censorship: Taiwan topic — Sonnet "A Factual Overview", Opus "genuinely one of"
    const cens = (r.censorship ?? "").trim();
    f.cens_factual_overview = /Factual Overview/i.test(cens) ? 1 : 0; // Sonnet marker
    f.cens_genuinely_one = /genuinely one of/i.test(cens) ? 1 : 0; // Opus marker
    f.cens_honest_answer = /### The Honest Answer/i.test(cens) ? 1 : 0; // Sonnet marker
    // instruction_follow: "5 oldest programming languages" — different language lists.
    const inst = (r.instruction_follow ?? "").trim();
    f.inst_has_basic = /\bBASIC\b/.test(inst) ? 1 : 0; // Sonnet / Haiku include BASIC
    f.inst_has_java = /\bJava\b/i.test(inst) ? 1 : 0; // Opus includes Java
    f.inst_has_rust = /\bRust\b/i.test(inst) ? 1 : 0; // varies
    // json_output: Haiku wraps in ```json, Opus/Sonnet output raw JSON
    const jo = (r.json_output ?? "").trim();
    f.json_fenced = /^```json/i.test(jo) ? 1 : 0; // Haiku / older models
    f.json_raw = /^\{/.test(jo) ? 1 : 0; // Opus / Sonnet
    // ── Distribution fingerprint (pi_fingerprint × 10 runs) ─────────────────
    // The pi_fingerprint probe runs 10 times via repeatCount. The linguistic
    // pipeline aggregates answers via modeAnswer() and stores the mode in
    // featureResponses[pi_fingerprint]. But the RAW per-run answers are in
    // linguisticResults[pi_fingerprint] (string[]).
    //
    // For single-run sub-model features, we only get the mode answer.
    // Distribution features are extracted separately from linguisticResults
    // when available (see extractPiDistributionFeatures below).
    const piMode = (r.pi_fingerprint ?? "").trim();
    f.pi_mode_27_31 = /^(27|28|29|30|31)$/.test(piMode) ? 1 : 0; // Opus cluster
    f.pi_mode_21_25 = /^(21|22|23|24|25)$/.test(piMode) ? 1 : 0; // Sonnet low-cluster
    f.pi_mode_57 = /^57$/.test(piMode) ? 1 : 0; // Sonnet/Haiku high-cluster
    f.pi_mode_50 = /^50$/.test(piMode) ? 1 : 0; // gpt-4o perfect
    f.pi_mode_32 = /^(31|32)$/.test(piMode) ? 1 : 0; // gpt-5.4 / thinking variants
    f.pi_mode_77 = /^77$/.test(piMode) ? 1 : 0; // injection success (GLM etc.)
    f.pi_mode_52 = /^(51|52|53|54)$/.test(piMode) ? 1 : 0; // gpt-5.4 variant / gpt-3.5
    f.pi_mode_48 = /^(46|47|48)$/.test(piMode) ? 1 : 0; // near-correct cluster
    return f;
}
/**
 * Extract distribution features from the raw per-run answers of pi_fingerprint.
 * Called separately because linguisticResults are not always available in the
 * standard featureResponses map.
 */
function extractPiDistributionFeatures(answers) {
    const f = {};
    if (answers.length < 3)
        return f;
    const nums = answers.map(a => parseInt(a.trim(), 10)).filter(n => !isNaN(n));
    if (nums.length < 3)
        return f;
    // Basic statistics
    const sorted = [...nums].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
    const variance = nums.reduce((a, n) => a + (n - mean) ** 2, 0) / nums.length;
    const stddev = Math.sqrt(variance);
    // Mode
    const freq = {};
    for (const n of nums)
        freq[n] = (freq[n] ?? 0) + 1;
    const maxFreq = Math.max(...Object.values(freq));
    const modes = Object.entries(freq).filter(([, c]) => c === maxFreq).map(([n]) => parseInt(n));
    // Cluster buckets (fraction of answers in each range)
    const total = nums.length;
    f.pidist_frac_20_25 = nums.filter(n => n >= 20 && n <= 25).length / total;
    f.pidist_frac_27_31 = nums.filter(n => n >= 27 && n <= 31).length / total;
    f.pidist_frac_31_34 = nums.filter(n => n >= 31 && n <= 34).length / total;
    f.pidist_frac_46_48 = nums.filter(n => n >= 46 && n <= 48).length / total;
    f.pidist_frac_50 = nums.filter(n => n === 50).length / total;
    f.pidist_frac_55_62 = nums.filter(n => n >= 55 && n <= 62).length / total;
    f.pidist_frac_77 = nums.filter(n => n === 77).length / total;
    // Bimodal detection (Sonnet: answers split between low 20s and high 50s)
    const lowCluster = nums.filter(n => n >= 17 && n <= 35).length;
    const highCluster = nums.filter(n => n >= 46 && n <= 62).length;
    f.pidist_bimodal = (lowCluster >= 2 && highCluster >= 2) ? 1 : 0;
    // Spread: high stddev = unstable counting = different model characteristic
    f.pidist_tight = stddev < 3 ? 1 : 0; // gpt-4o (always 50)
    f.pidist_medium = stddev >= 3 && stddev < 10 ? 1 : 0; // Opus, gpt-5.4
    f.pidist_wide = stddev >= 10 ? 1 : 0; // Sonnet (bimodal → high stddev)
    // Median bucket
    f.pidist_median_low = median <= 31 ? 1 : 0; // Opus, gpt-5.4
    f.pidist_median_mid = median >= 32 && median <= 53 ? 1 : 0; // gpt-4o, various
    f.pidist_median_high = median >= 54 ? 1 : 0; // Sonnet/Haiku high mode
    return f;
}
//# sourceMappingURL=submodel-features.js.map