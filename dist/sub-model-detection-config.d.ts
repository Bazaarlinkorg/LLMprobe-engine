export declare const DETECTION_DISABLED_MODEL_IDS: ReadonlySet<string>;
export declare function isDetectionDisabled(modelId: string | null | undefined): boolean;
/** Drop entries whose modelId is a disabled detection target. Order-preserving. */
export declare function filterDetectable<T extends {
    modelId: string;
}>(items: T[]): T[];
//# sourceMappingURL=sub-model-detection-config.d.ts.map