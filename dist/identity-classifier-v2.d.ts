import type { FingerprintFeatureSet } from "./identity-report.js";
import { type BaselineRow } from "./baseline-match-votes.js";
import { type SubModelBaselineRow } from "./sub-model-bayesian.js";
export interface ClassifyV2Input {
    fingerprintFeatures: FingerprintFeatureSet;
    observedResponses: Record<string, string>;
    baselines: BaselineRow[];
    referenceSubModels: SubModelBaselineRow[];
    observedSubModelFeatures?: Record<string, number>;
    predictedFamily?: string;
    llmmapWeight?: number;
    version?: "v2a" | "v2b";
    baselineMatchVotes?: Record<string, number>;
    subModelTemperature?: number;
}
export interface ClassifyV2Output {
    topFamily: string;
    familyScores: Record<string, number>;
    attackFamilyScores: Record<string, number>;
    spoofDetected: boolean;
    spoofReason?: string;
    subModelPosteriors: Array<{
        modelId: string;
        posterior: number;
    }>;
    subModelTop?: {
        modelId: string;
        posterior: number;
    };
    subModelConfident: boolean;
}
export declare function classifyIdentityV2A(input: ClassifyV2Input): ClassifyV2Output;
export declare function classifyIdentityV2B(input: ClassifyV2Input): ClassifyV2Output;
export declare function classifyIdentityV2(input: ClassifyV2Input): ClassifyV2Output;
//# sourceMappingURL=identity-classifier-v2.d.ts.map