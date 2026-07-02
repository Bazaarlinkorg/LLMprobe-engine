"use strict";
// lib/identity/family-fusion.ts
// V5 stage 1: FAMILY FUSION — produce a single trusted `confirmedFamily` from all family
// evidence, so sub-model scoping has ONE source of truth (never the claimed model).
//
// Evidence precedence:
//   1. Chinese affirmative self-ID (深度求索/智谱/通义) with hardOverride → wins outright.
//      Unfakeable by a Western relay; corrects V2's English-mimicry blind spot.
//   2. V2 behavioural family (English linguistic fingerprint) when non-"unknown".
//   3. V3/V3E family-implied — corroboration only; can LOWER confidence, never override V2.
// The claimed family is DIAGNOSTIC ONLY — it can never become confirmedFamily (that was the
// root of the chaos "claim-scoped" 47-80% false-accept; see the V3H plan).
//
// Pure + deterministic. No I/O. The route calls this instead of mutating v2 output inline.
Object.defineProperty(exports, "__esModule", { value: true });
exports.fuseFamily = fuseFamily;
const UNKNOWN = new Set(["", "unknown", "unclear", null, undefined]);
function isKnown(f) {
    return !UNKNOWN.has(f);
}
function fuseFamily(input) {
    const { v2Family, v2Scores, chinese, v3FamilyImplied, claimedFamily } = input;
    const evidence = [];
    // ── 1. Chinese affirmative self-ID overrides everything ──────────────────
    if (chinese?.hardOverride && isKnown(chinese.family)) {
        const overrode = isKnown(v2Family) && v2Family !== chinese.family;
        evidence.push(`中文自我認同→${chinese.family}` +
            (overrode ? `（覆蓋英文指紋 ${v2Family} ${Math.round((v2Scores?.[v2Family] ?? 0) * 100)}%）` : ""));
        if (chinese.evidence?.length)
            evidence.push(...chinese.evidence);
        return {
            confirmedFamily: chinese.family,
            confidence: Math.max(0.95, chinese.confidence),
            source: "chinese-self-id",
            hardOverride: true,
            claimIgnored: isKnown(claimedFamily) && claimedFamily !== chinese.family,
            evidence,
        };
    }
    // Chinese PRC-line / soft signal is evidence-only — surface it but do NOT pick a family.
    if (chinese && !chinese.hardOverride && chinese.evidence?.length) {
        evidence.push(...chinese.evidence);
    }
    // ── 2. V2 behavioural family ─────────────────────────────────────────────
    if (isKnown(v2Family)) {
        let confidence = v2Scores?.[v2Family] ?? 0.5;
        // ── 3. V3 family-implied corroboration ──
        if (isKnown(v3FamilyImplied)) {
            if (v3FamilyImplied === v2Family) {
                confidence = Math.min(1, confidence + 0.05);
                evidence.push(`V3 家族一致(${v2Family})`);
            }
            else {
                confidence = Math.max(0, confidence - 0.15);
                evidence.push(`V3 家族不一致(V2=${v2Family} vs V3=${v3FamilyImplied})→降信心`);
            }
        }
        evidence.push(`family ${v2Family} ${Math.round(confidence * 100)}%`);
        return {
            confirmedFamily: v2Family,
            confidence,
            source: "v2",
            hardOverride: false,
            claimIgnored: isKnown(claimedFamily) && claimedFamily !== v2Family,
            evidence,
        };
    }
    // ── Abstain: no usable family evidence ───────────────────────────────────
    evidence.push("no usable family evidence → abstain");
    return { confirmedFamily: null, confidence: 0, source: "abstain", hardOverride: false, claimIgnored: false, evidence };
}
//# sourceMappingURL=identity-family-fusion.js.map