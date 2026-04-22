export interface CapabilityOut {
    q1: string;
    q2: string;
    q3: string;
    q4: string;
    q5: string;
}
export interface RefusalOut {
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
    length: number;
}
export declare function extractCutoff(content: string): string | null;
export declare function extractCapability(content: string): CapabilityOut;
export declare function extractRefusal(content: string): RefusalOut;
export declare function mode<T>(arr: T[]): T | null;
export declare function any<K extends string>(arr: Array<Record<K, boolean>>, k: K): boolean;
export declare function avg(arr: number[]): number;
//# sourceMappingURL=sub-model-baselines-v3-extractors.d.ts.map