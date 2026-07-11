import type { IkpOutput } from "./sub-model-classifier-ikp";
/** Intentionally LOWER than V3's own 0.60 gate (classifier-v3.ts confidenceThreshold):
 *  V4 only reaches this check after family corroboration from multiple signals
 *  (fuse rules 1-4), so a 0.55 sub-model score is safer here than a raw V3 0.55.
 *  Do NOT unify to 0.60 without re-running the v3e-backtest 36-spoof suite —
 *  see docs/reports/2026-05-10-v4-attack-accuracy.md. */
export declare const V4_GLOBAL_CONFIDENCE_THRESHOLD = 0.55;
export type V4Match = {
    modelId: string;
    displayName: string;
    family: string;
    score: number;
};
export type V3LikeAdapter = {
    subModelMatch: V4Match | null;
    candidates: V4Match[];
    abstained: boolean;
    /** V3 Scoped only: when V3 features clearly imply a family but sub-model
     *  match was below threshold, V3 still records the implied family.
     *  V4 uses this to override IKP when IKP picks a different family. */
    familyImplied?: string | null;
};
export type V4FuseSource = "v3-scoped" | "v3-global" | "ikp" | "v3f" | "v3e" | "v3h" | "abstain";
export declare const V3F_TIEBREAKER_THRESHOLD = 0.7;
export declare const V3F_TIEBREAKER_GAP_MAX = 0.05;
export type V4Output = V3LikeAdapter & {
    fuseSource: V4FuseSource;
    /** Diagnostic: did V3 Global suggest a different family than V3 Scoped's verdict? */
    crossFamilyDisagreement: boolean;
};
/** Corroboration signal for Claude 5 / Mythos's structured empty refusal.
 *  A native empty refusal (native_finish_reason="refusal", empty body) is unique
 *  to Claude 5 — IKP's codegen probes are blind to it, so without this hint V4
 *  can fuse to a contradictory IKP pick (see runId cmq7mlmma…, 4router.net). */
export type EmptyRefusalSignal = {
    /** true ONLY when the whole-ladder empty fingerprint is confirmed: the single
     *  refusal probe AND the V3E refusal ladder (L2..L7) all returned empty while
     *  cutoff/capability answered. A foreign model that merely blanks the single
     *  refusal probe but answers the ladder is NOT confirmed — see
     *  lib/sub-model/empty-refusal-signal.ts (runId cmqch9zci0…, gpt-5.5). */
    confirmed: boolean;
    /** does this baseline modelId carry the nativeEmptyRefusal flag? */
    isEmptyRefusalModel: (modelId: string) => boolean;
};
/** The behavioural family verdict (V2/phase-1 family classifier), e.g.
 *  { family: "openai", confidence: 0.98 }. Used to veto a nativeEmptyRefusal
 *  (Claude 5) sub-model pick when the family classifier confidently says a
 *  different family — the dominant signal across the prod false positives,
 *  most of which had V3E abstained (so the V3E veto alone could not catch them). */
export type FamilySignal = {
    family: string;
    confidence: number;
} | null | undefined;
/** Min family-classifier confidence to veto a contradicting empty-refusal pick.
 *  0.6: a non-anthropic TOP family at ≥0.6 is a clear "not Claude" signal, since
 *  genuine Fable always has anthropic as its top family (so it never contradicts
 *  at any threshold). Catches borderline cross-family relays (glm/google 0.67). */
export declare const FAMILY_VETO_CONFIDENCE = 0.6;
export declare function fuseToV4(v3Scoped: V3LikeAdapter | null | undefined, v3Global: V3LikeAdapter | null | undefined, ikp: IkpOutput | null | undefined, _claimedFamily: string | undefined, v3f?: V4Match | null | undefined, emptyRefusal?: EmptyRefusalSignal | null | undefined, v3eTop?: V4Match | null | undefined, behavioralFamily?: FamilySignal): V4Output;
//# sourceMappingURL=sub-model-classifier-v4.d.ts.map