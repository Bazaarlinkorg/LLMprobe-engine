import { type V3EObserved, type V3EWeights } from "./sub-model-classifier-v3e.js";
import type { SubmodelBaselineV3E } from "./sub-model-baselines-v3e.js";
export interface V3FMatch {
    modelId: string;
    family: string;
    displayName: string;
    score: number;
    matched: string[];
    divergent: string[];
}
export interface V3FOutput {
    observed: V3EObserved;
    top: V3FMatch | null;
    candidates: V3FMatch[];
    abstained: boolean;
}
export declare function scoreV3FMatch(obs: V3EObserved, ref: SubmodelBaselineV3E, weights?: V3EWeights): {
    score: number;
    matched: string[];
    divergent: string[];
};
export declare function classifySubmodelV3F(responses: Record<string, string>, baselines: SubmodelBaselineV3E[], options?: {
    predictedFamily?: string;
    confidenceThreshold?: number;
    weights?: V3EWeights;
}): V3FOutput;
//# sourceMappingURL=sub-model-classifier-v3f.d.ts.map