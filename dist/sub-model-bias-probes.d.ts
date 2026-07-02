export interface BiasProbe {
    id: string;
    prompt: string;
    samples: number;
}
export declare const BIAS_PROBES: BiasProbe[];
/** Normalize a model answer to a comparable token: lowercase, alphanumerics only, ≤16 chars. */
export declare function normalizeBiasAnswer(s: string | null | undefined): string;
//# sourceMappingURL=sub-model-bias-probes.d.ts.map