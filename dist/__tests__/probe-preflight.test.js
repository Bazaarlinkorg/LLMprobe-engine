"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const probe_preflight_js_1 = require("../probe-preflight.js");
function body(obj) {
    return JSON.stringify(obj);
}
(0, vitest_1.describe)("classifyPreflightResult — ok range", () => {
    (0, vitest_1.it)("returns ok for HTTP 200", () => {
        (0, vitest_1.expect)((0, probe_preflight_js_1.classifyPreflightResult)(200, "").outcome).toBe("ok");
    });
    (0, vitest_1.it)("returns ok for HTTP 201", () => {
        (0, vitest_1.expect)((0, probe_preflight_js_1.classifyPreflightResult)(201, "").outcome).toBe("ok");
    });
    (0, vitest_1.it)("returns ok for HTTP 299", () => {
        (0, vitest_1.expect)((0, probe_preflight_js_1.classifyPreflightResult)(299, "").outcome).toBe("ok");
    });
});
(0, vitest_1.describe)("classifyPreflightResult — auth errors (abort)", () => {
    (0, vitest_1.it)("aborts on 401 invalid API key", () => {
        const r = (0, probe_preflight_js_1.classifyPreflightResult)(401, body({ error: { message: "Invalid API key" } }));
        (0, vitest_1.expect)(r.outcome).toBe("abort");
        (0, vitest_1.expect)(r.reason).toMatch(/401/);
    });
    (0, vitest_1.it)("aborts on 403 forbidden", () => {
        const r = (0, probe_preflight_js_1.classifyPreflightResult)(403, body({ error: { message: "Forbidden" } }));
        (0, vitest_1.expect)(r.outcome).toBe("abort");
        (0, vitest_1.expect)(r.reason).toMatch(/403/);
    });
    (0, vitest_1.it)("includes error message in abort reason", () => {
        const r = (0, probe_preflight_js_1.classifyPreflightResult)(401, body({ error: { message: "Your API key is expired" } }));
        (0, vitest_1.expect)(r.reason).toMatch(/expired/i);
    });
});
(0, vitest_1.describe)("classifyPreflightResult — model not found (abort)", () => {
    (0, vitest_1.it)("aborts on 503 + model_not_found code", () => {
        const r = (0, probe_preflight_js_1.classifyPreflightResult)(503, body({ error: { code: "model_not_found", message: "No available channel for model x" } }));
        (0, vitest_1.expect)(r.outcome).toBe("abort");
    });
    (0, vitest_1.it)("aborts on 404 + model_not_found code", () => {
        const r = (0, probe_preflight_js_1.classifyPreflightResult)(404, body({ error: { code: "model_not_found", message: "Model not found" } }));
        (0, vitest_1.expect)(r.outcome).toBe("abort");
    });
    (0, vitest_1.it)("aborts when message contains 'no available channel' without error code", () => {
        const r = (0, probe_preflight_js_1.classifyPreflightResult)(503, body({ error: { message: "No available channel for model gpt-99" } }));
        (0, vitest_1.expect)(r.outcome).toBe("abort");
    });
    (0, vitest_1.it)("aborts when message contains 'model not found' case-insensitively", () => {
        const r = (0, probe_preflight_js_1.classifyPreflightResult)(400, body({ error: { message: "Model Not Found" } }));
        (0, vitest_1.expect)(r.outcome).toBe("abort");
    });
});
(0, vitest_1.describe)("classifyPreflightResult — retryable / warn", () => {
    (0, vitest_1.it)("warns on generic 503 without model_not_found", () => {
        const r = (0, probe_preflight_js_1.classifyPreflightResult)(503, body({ error: { message: "Service Unavailable" } }));
        (0, vitest_1.expect)(r.outcome).toBe("warn");
        (0, vitest_1.expect)(r.reason).toMatch(/503/);
    });
    (0, vitest_1.it)("warns on 429 rate limit", () => {
        const r = (0, probe_preflight_js_1.classifyPreflightResult)(429, body({ error: { message: "rate limit exceeded" } }));
        (0, vitest_1.expect)(r.outcome).toBe("warn");
    });
    (0, vitest_1.it)("warns on 500 internal server error", () => {
        (0, vitest_1.expect)((0, probe_preflight_js_1.classifyPreflightResult)(500, "").outcome).toBe("warn");
    });
    (0, vitest_1.it)("warns on 502 bad gateway", () => {
        (0, vitest_1.expect)((0, probe_preflight_js_1.classifyPreflightResult)(502, "").outcome).toBe("warn");
    });
});
(0, vitest_1.describe)("classifyPreflightResult — edge cases", () => {
    (0, vitest_1.it)("handles empty body without throwing", () => {
        const r = (0, probe_preflight_js_1.classifyPreflightResult)(503, "");
        (0, vitest_1.expect)(["abort", "warn"]).toContain(r.outcome);
        (0, vitest_1.expect)(typeof r.reason).toBe("string");
        (0, vitest_1.expect)(r.reason.length).toBeGreaterThan(0);
    });
    (0, vitest_1.it)("handles non-JSON body without throwing", () => {
        const r = (0, probe_preflight_js_1.classifyPreflightResult)(503, "Bad Gateway");
        (0, vitest_1.expect)(typeof r.reason).toBe("string");
    });
    (0, vitest_1.it)("includes HTTP status in reason for unknown errors", () => {
        (0, vitest_1.expect)((0, probe_preflight_js_1.classifyPreflightResult)(503, "").reason).toMatch(/503/);
        (0, vitest_1.expect)((0, probe_preflight_js_1.classifyPreflightResult)(429, "").reason).toMatch(/429/);
    });
    (0, vitest_1.it)("returns a reason string for every outcome", () => {
        for (const status of [200, 400, 401, 403, 404, 429, 500, 503]) {
            const r = (0, probe_preflight_js_1.classifyPreflightResult)(status, "");
            (0, vitest_1.expect)(typeof r.reason).toBe("string");
        }
    });
});
//# sourceMappingURL=probe-preflight.test.js.map