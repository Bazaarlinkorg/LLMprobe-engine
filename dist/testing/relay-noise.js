"use strict";
// lib/sub-model/testing/relay-noise.ts
// Deterministic relay-noise transforms for adversarial replay. Real relays perturb
// responses — blanking refusals, wrapping outputs, starving/thinning sampling — which
// can degrade an honest fingerprint. These pure, SEEDED injectors (no Math.random,
// which is banned in some contexts) reproduce those perturbations so CI can prove the
// scorer degrades to abstain under noise but NEVER flips into a false substitution.
//
// Seeded LCG (numerical-recipes constants) → the same seed yields the same output, so
// tests are reproducible run-to-run.
Object.defineProperty(exports, "__esModule", { value: true });
exports.blankRefusals = blankRefusals;
exports.wrapResponses = wrapResponses;
exports.thinBiasSamples = thinBiasSamples;
exports.injectBlanks = injectBlanks;
const REFUSAL_PROBE_RE = /refusal/i;
/** Seeded linear-congruential generator. Returns a function yielding [0,1). */
function lcg(seed) {
    let s = seed >>> 0;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 2 ** 32;
    };
}
/**
 * Blank the refusal-class response keys — a relay that strips a native refusal to empty.
 * Only keys whose name matches /refusal/i are emptied (e.g. `submodel_refusal`);
 * a `submodel_cutoff` key is untouched. Downstream the empty string normalizes to the
 * "(blank)" signal token — it is NOT filtered.
 */
function blankRefusals(responses) {
    const out = {};
    for (const [key, value] of Object.entries(responses)) {
        out[key] = REFUSAL_PROBE_RE.test(key) ? "" : value;
    }
    return out;
}
/**
 * Wrap non-empty responses with a fixed prefix — a relay that injects boilerplate
 * (system banner, disclaimer) ahead of the real output. Empty values stay empty
 * (a blank refusal must not be resurrected into a non-blank).
 */
function wrapResponses(responses, prefix) {
    const out = {};
    for (const [key, value] of Object.entries(responses)) {
        out[key] = value === "" ? "" : prefix + value;
    }
    return out;
}
/**
 * Thin per-probe samples down to `ceil(ratio * n)` — a relay that starves sampling
 * (fewer completions returned than requested). Keeps a seeded pseudo-random subset so
 * the survivors are not just a prefix. `ratio` is clamped to [0,1]; the kept count is
 * `min(n, max(0, ceil(ratio*n)))`.
 */
function thinBiasSamples(samples, ratio, seed) {
    const r = Math.min(1, Math.max(0, ratio));
    const out = {};
    for (const [probeId, answers] of Object.entries(samples)) {
        const n = answers.length;
        const keep = Math.min(n, Math.max(0, Math.ceil(r * n)));
        if (keep >= n) {
            out[probeId] = [...answers];
            continue;
        }
        // Seeded partial Fisher–Yates: shuffle indices, take the first `keep`. Seed is mixed
        // with a per-probe offset so different probes thin to different subsets deterministically.
        const rand = lcg((seed >>> 0) + probeId.length * 2654435761);
        const idx = answers.map((_, i) => i);
        for (let i = n - 1; i > 0; i--) {
            const j = Math.floor(rand() * (i + 1));
            const tmp = idx[i];
            idx[i] = idx[j];
            idx[j] = tmp;
        }
        const chosen = idx.slice(0, keep).sort((a, b) => a - b);
        out[probeId] = chosen.map((i) => answers[i]);
    }
    return out;
}
/**
 * Swap `ceil(rate * n)` drawn answers per probe to "" — a relay that intermittently
 * blanks completions (partial refusal-strip / dropped tokens). The "" values normalize
 * to the "(blank)" signal downstream (never filtered). Positions to blank are chosen by
 * a seeded LCG, so the count and which slots are deterministic. `rate` clamped to [0,1].
 */
function injectBlanks(samples, rate, seed) {
    const r = Math.min(1, Math.max(0, rate));
    const out = {};
    for (const [probeId, answers] of Object.entries(samples)) {
        const n = answers.length;
        const blanks = Math.min(n, Math.max(0, Math.ceil(r * n)));
        const copy = [...answers];
        if (blanks <= 0) {
            out[probeId] = copy;
            continue;
        }
        const rand = lcg((seed >>> 0) + probeId.length * 40503);
        const idx = answers.map((_, i) => i);
        for (let i = n - 1; i > 0; i--) {
            const j = Math.floor(rand() * (i + 1));
            const tmp = idx[i];
            idx[i] = idx[j];
            idx[j] = tmp;
        }
        for (const i of idx.slice(0, blanks))
            copy[i] = "";
        out[probeId] = copy;
    }
    return out;
}
//# sourceMappingURL=relay-noise.js.map