export interface SSEComplianceResult {
    passed: boolean;
    warning: boolean;
    dataLines: number;
    missingChoicesCount: number;
    issues: string[];
}
export declare function checkSSECompliance(lines: string[]): SSEComplianceResult;
//# sourceMappingURL=sse-compliance.d.ts.map