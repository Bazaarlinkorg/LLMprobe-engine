import type { IkpOutput } from "./sub-model-classifier-ikp.js";
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
export type V4FuseSource = "v3-scoped" | "v3-global" | "ikp" | "v3f" | "abstain";
export declare const V3F_TIEBREAKER_THRESHOLD = 0.7;
export declare const V3F_TIEBREAKER_GAP_MAX = 0.05;
export type V4Output = V3LikeAdapter & {
    fuseSource: V4FuseSource;
    /** Diagnostic: did V3 Global suggest a different family than V3 Scoped's verdict? */
    crossFamilyDisagreement: boolean;
};
export declare function fuseToV4(v3Scoped: V3LikeAdapter | null | undefined, v3Global: V3LikeAdapter | null | undefined, ikp: IkpOutput | null | undefined, _claimedFamily: string | undefined, v3f?: V4Match | null | undefined): V4Output;
//# sourceMappingURL=sub-model-classifier-v4.d.ts.map