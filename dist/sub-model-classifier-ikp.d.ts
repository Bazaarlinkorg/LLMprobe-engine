export declare const IKP_PROBE_IDS: readonly ["ikp_t3_domain_fact", "ikp_t4_obscure_fact", "ikp_t4_bio_fact", "ikp_t5_deep_fact", "ikp_t5_codegen_edge"];
export interface IkpBaselineRow {
    modelId: string;
    probeId: string;
    responseText: string;
}
export interface IkpMatch {
    modelId: string;
    family: string;
    displayName: string;
    score: number;
}
export interface IkpOutput {
    top: IkpMatch | null;
    candidates: IkpMatch[];
    abstained: boolean;
}
export declare function classifySubmodelIKP(responses: Record<string, string>, baselines: IkpBaselineRow[], options?: {
    predictedFamily?: string;
    threshold?: number;
    gapThreshold?: number;
}): IkpOutput;
export declare function fuseV3WithIKP<T extends {
    subModelMatch: {
        modelId: string;
        displayName: string;
        family: string;
        score: number;
    } | null;
    candidates: Array<{
        modelId: string;
        displayName: string;
        family: string;
        score: number;
    }>;
    abstained: boolean;
}>(v3: T, ikp: IkpOutput | null, family: string | undefined): T;
//# sourceMappingURL=sub-model-classifier-ikp.d.ts.map