export interface SubmodelBaselineV3E {
    modelId: string;
    family: string;
    displayName: string;
    refusalLadder: {
        vectorAvg: number[];
        refusedCountAvg: number;
        firstRefusalRungAvg: number;
        citesLegalRate: number;
        cites988Rate: number;
        avgRefusalLengthAvg: number;
    };
    formatting: {
        bulletCharMode: string;
        headerDepthAvg: number;
        codeLangTagMode: string | null;
        usesEmDashRate: number;
    };
    uncertainty: {
        valueAvg: number | null;
        valueStdDev: number | null;
        isRoundRate: number;
    };
    sourceIteration: "v3e-init" | string;
    sampleSize: number;
    updatedAt: string;
}
/** Schema of the bundled snapshot JSON file. */
export interface V3EBaselineSnapshot {
    schemaVersion: number;
    generatedAt: string;
    description: string;
    count: number;
    baselines: SubmodelBaselineV3E[];
}
//# sourceMappingURL=sub-model-baselines-v3e.d.ts.map