"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const sse_compliance_js_1 = require("../sse-compliance.js");
(0, vitest_1.describe)("checkSSECompliance — valid stream", () => {
    (0, vitest_1.it)("passes a well-formed stream ending with [DONE]", () => {
        const lines = [
            JSON.stringify({ choices: [{ delta: { content: "Hello" }, index: 0 }] }),
            JSON.stringify({ choices: [{ delta: { content: " world" }, index: 0 }] }),
            "[DONE]",
        ];
        const r = (0, sse_compliance_js_1.checkSSECompliance)(lines);
        (0, vitest_1.expect)(r.passed).toBe(true);
        (0, vitest_1.expect)(r.issues).toHaveLength(0);
        (0, vitest_1.expect)(r.dataLines).toBe(2);
    });
    (0, vitest_1.it)("counts data lines correctly", () => {
        const lines = [
            JSON.stringify({ choices: [{ delta: { content: "a" } }] }),
            JSON.stringify({ choices: [{ delta: { content: "b" } }] }),
            JSON.stringify({ choices: [{ delta: { content: "c" } }] }),
            "[DONE]",
        ];
        (0, vitest_1.expect)((0, sse_compliance_js_1.checkSSECompliance)(lines).dataLines).toBe(3);
    });
    (0, vitest_1.it)("[DONE] is not counted as a data line", () => {
        const lines = [
            JSON.stringify({ choices: [{ delta: { content: "hi" } }] }),
            "[DONE]",
        ];
        (0, vitest_1.expect)((0, sse_compliance_js_1.checkSSECompliance)(lines).dataLines).toBe(1);
    });
});
(0, vitest_1.describe)("checkSSECompliance — missing [DONE]", () => {
    (0, vitest_1.it)("fails when [DONE] is absent", () => {
        const lines = [
            JSON.stringify({ choices: [{ delta: { content: "hello" } }] }),
        ];
        const r = (0, sse_compliance_js_1.checkSSECompliance)(lines);
        (0, vitest_1.expect)(r.passed).toBe(false);
        (0, vitest_1.expect)(r.issues.some(i => i.includes("[DONE]"))).toBe(true);
    });
});
(0, vitest_1.describe)("checkSSECompliance — empty stream", () => {
    (0, vitest_1.it)("fails on empty input", () => {
        const r = (0, sse_compliance_js_1.checkSSECompliance)([]);
        (0, vitest_1.expect)(r.passed).toBe(false);
        (0, vitest_1.expect)(r.issues.some(i => i.toLowerCase().includes("empty"))).toBe(true);
        (0, vitest_1.expect)(r.dataLines).toBe(0);
    });
});
(0, vitest_1.describe)("checkSSECompliance — invalid JSON chunks", () => {
    (0, vitest_1.it)("fails on non-JSON data line", () => {
        const r = (0, sse_compliance_js_1.checkSSECompliance)(["this is not json", "[DONE]"]);
        (0, vitest_1.expect)(r.passed).toBe(false);
        (0, vitest_1.expect)(r.issues.some(i => i.toLowerCase().includes("json"))).toBe(true);
    });
    (0, vitest_1.it)("reports the bad line content in the issue", () => {
        const r = (0, sse_compliance_js_1.checkSSECompliance)(["BAD_JSON_CHUNK", "[DONE]"]);
        (0, vitest_1.expect)(r.issues[0]).toMatch(/BAD_JSON_CHUNK/);
    });
});
(0, vitest_1.describe)("checkSSECompliance — missing choices (warning)", () => {
    (0, vitest_1.it)("does not fail but sets warning for usage-only chunks (no choices array)", () => {
        const lines = [
            JSON.stringify({ choices: [{ delta: { content: "hi" } }] }),
            JSON.stringify({ usage: { prompt_tokens: 10, completion_tokens: 5 } }), // usage chunk
            "[DONE]",
        ];
        const r = (0, sse_compliance_js_1.checkSSECompliance)(lines);
        (0, vitest_1.expect)(r.passed).toBe(true);
        (0, vitest_1.expect)(r.warning).toBe(true);
        (0, vitest_1.expect)(r.missingChoicesCount).toBe(1);
    });
    (0, vitest_1.it)("tracks missingChoicesCount correctly", () => {
        const lines = [
            JSON.stringify({ choices: [] }), // empty choices array
            JSON.stringify({ choices: [] }),
            "[DONE]",
        ];
        const r = (0, sse_compliance_js_1.checkSSECompliance)(lines);
        (0, vitest_1.expect)(r.missingChoicesCount).toBe(2);
        (0, vitest_1.expect)(r.warning).toBe(true);
    });
});
(0, vitest_1.describe)("checkSSECompliance — warning suppressed when failing", () => {
    (0, vitest_1.it)("does not set warning=true when stream also has hard failures", () => {
        // Missing [DONE] is a hard fail, warning should be suppressed
        const lines = [
            JSON.stringify({ usage: { prompt_tokens: 10 } }), // no choices → would warn
            // no [DONE] → hard fail
        ];
        const r = (0, sse_compliance_js_1.checkSSECompliance)(lines);
        (0, vitest_1.expect)(r.passed).toBe(false);
        (0, vitest_1.expect)(r.warning).toBe(false);
    });
});
(0, vitest_1.describe)("checkSSECompliance — result shape", () => {
    (0, vitest_1.it)("always returns all required fields", () => {
        const r = (0, sse_compliance_js_1.checkSSECompliance)(["[DONE]"]);
        (0, vitest_1.expect)(typeof r.passed).toBe("boolean");
        (0, vitest_1.expect)(typeof r.warning).toBe("boolean");
        (0, vitest_1.expect)(typeof r.dataLines).toBe("number");
        (0, vitest_1.expect)(typeof r.missingChoicesCount).toBe("number");
        (0, vitest_1.expect)(Array.isArray(r.issues)).toBe(true);
    });
});
//# sourceMappingURL=sse-compliance.test.js.map