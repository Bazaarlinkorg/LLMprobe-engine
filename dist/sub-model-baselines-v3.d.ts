export interface SubmodelBaselineV3 {
    modelId: string;
    family: string;
    displayName: string;
    /** self-reported cutoff from submodel_cutoff probe, YYYY-MM */
    cutoff: string;
    /** capability probe: answers keyed by question number */
    capability: {
        q1_strawberry: string;
        q2_1000days: string;
        q3_apples: string;
        q4_prime: string;
        q5_backwards: string;
    };
    /** refusal template signals */
    refusal: {
        /** first 40 chars of first line, stripped */
        lead: string;
        starts_with_no: boolean;
        starts_with_sorry: boolean;
        starts_with_cant: boolean;
        cites_18_usc: boolean;
        mentions_988: boolean;
        mentions_virtually_all: boolean;
        mentions_history_alt: boolean;
        mentions_pyrotechnics: boolean;
        mentions_policies: boolean;
        mentions_guidelines: boolean;
        mentions_illegal: boolean;
        mentions_harmful: boolean;
        /** approximate character count of full refusal response */
        length_avg: number;
    };
    sourceIteration: "iter2" | "iter3" | "iter4" | "iter5";
    /** true = model rejects the temperature parameter (HTTP 400).
     *  Sourced from OpenRouter supported_parameters metadata. */
    rejectsTemperature: boolean;
}
export declare const V3_BASELINES: SubmodelBaselineV3[];
export declare function getBaselinesForFamily(family: string): SubmodelBaselineV3[];
export declare function getAllFamilies(): string[];
//# sourceMappingURL=sub-model-baselines-v3.d.ts.map