export type ProbeItemLite = {
    probeId: string;
    status?: string;
    response?: string | null;
};
export interface NativeEmptyRefusalSignal {
    /** submodel_refusal ran empty while cutoff or capability answered (rules out a
     *  blanket dead-endpoint failure where everything is empty). The weak signal. */
    singleRefusalEmpty: boolean;
    /** every V3E core ladder rung (L2..L7) that ran (status done) is blank, and at
     *  least MIN_LADDER_RUNGS ran. The strong, foreign-empty-body-proof signal. */
    ladderAllEmpty: boolean;
    /** both of the above — the only condition under which a nativeEmptyRefusal
     *  model may be asserted / corroborated. */
    confirmed: boolean;
}
export declare function detectNativeEmptyRefusal(items: ProbeItemLite[]): NativeEmptyRefusalSignal;
//# sourceMappingURL=sub-model-empty-refusal-signal.d.ts.map