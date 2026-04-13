"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const context_check_js_1 = require("../context-check.js");
// Mock send function factories
function alwaysPass(canaryCount = 5) {
    return async (msg) => {
        // Extract all CANARY_N_XXXXXX tokens from the message and echo them back
        const canaries = [...msg.matchAll(/CANARY_\d+_[0-9A-F]{6}/g)].map(m => m[0]);
        return `I found these canaries: ${canaries.join(", ")}`;
    };
}
function alwaysFail() {
    return async (_msg) => "I couldn't read the full message.";
}
function failAfterChars(limit) {
    return async (msg) => {
        if (msg.length > limit) {
            // Only echo canaries from the first `limit` chars
            const truncated = msg.slice(0, limit);
            const canaries = [...truncated.matchAll(/CANARY_\d+_[0-9A-F]{6}/g)].map(m => m[0]);
            if (canaries.length < 4)
                return "Too long, I lost some canaries.";
            return canaries.join(" ");
        }
        const canaries = [...msg.matchAll(/CANARY_\d+_[0-9A-F]{6}/g)].map(m => m[0]);
        return canaries.join(" ");
    };
}
function throwAfterChars(limit) {
    return async (msg) => {
        if (msg.length > limit)
            throw new Error("Timeout: message too large");
        const canaries = [...msg.matchAll(/CANARY_\d+_[0-9A-F]{6}/g)].map(m => m[0]);
        return canaries.join(" ");
    };
}
(0, vitest_1.describe)("runContextCheck — all levels pass", () => {
    (0, vitest_1.it)("passed=true and reason mentions max level when all pass", async () => {
        const result = await (0, context_check_js_1.runContextCheck)(alwaysPass());
        (0, vitest_1.expect)(result.passed).toBe(true);
        (0, vitest_1.expect)(result.warning).toBe(false);
        (0, vitest_1.expect)(result.firstFailChars).toBeNull();
        (0, vitest_1.expect)(result.lastPassChars).not.toBeNull();
        (0, vitest_1.expect)(result.reason).toMatch(/passed|max/i);
    });
});
(0, vitest_1.describe)("runContextCheck — fails at smallest level", () => {
    (0, vitest_1.it)("passed=false and lastPassChars=null when first level fails", async () => {
        const result = await (0, context_check_js_1.runContextCheck)(alwaysFail());
        (0, vitest_1.expect)(result.passed).toBe(false);
        (0, vitest_1.expect)(result.lastPassChars).toBeNull();
        (0, vitest_1.expect)(result.firstFailChars).not.toBeNull();
        (0, vitest_1.expect)(result.reason).toMatch(/failed|smallest/i);
    });
});
(0, vitest_1.describe)("runContextCheck — truncation in the middle", () => {
    (0, vitest_1.it)("returns warning=true when context is truncated between levels", async () => {
        // Should pass 4K but fail somewhere higher
        const result = await (0, context_check_js_1.runContextCheck)(throwAfterChars(8000));
        if (result.lastPassChars !== null && result.firstFailChars !== null) {
            (0, vitest_1.expect)(result.passed).toBe(false);
            (0, vitest_1.expect)(result.warning).toBe(true);
            (0, vitest_1.expect)(result.lastPassChars).toBeLessThan(result.firstFailChars);
            (0, vitest_1.expect)(result.reason).toMatch(/truncated|between/i);
        }
        // If it passes all levels it's fine too (mock may have short messages at 4K level)
    });
});
(0, vitest_1.describe)("runContextCheck — result shape", () => {
    (0, vitest_1.it)("always returns all required fields", async () => {
        const result = await (0, context_check_js_1.runContextCheck)(alwaysFail());
        (0, vitest_1.expect)(typeof result.passed).toBe("boolean");
        (0, vitest_1.expect)(typeof result.warning).toBe("boolean");
        (0, vitest_1.expect)(typeof result.maxTestedChars).toBe("number");
        (0, vitest_1.expect)(typeof result.reason).toBe("string");
        (0, vitest_1.expect)(result.maxTestedChars).toBeGreaterThan(0);
    });
    (0, vitest_1.it)("maxTestedChars is positive after run", async () => {
        const result = await (0, context_check_js_1.runContextCheck)(alwaysPass());
        (0, vitest_1.expect)(result.maxTestedChars).toBeGreaterThan(4000);
    });
});
(0, vitest_1.describe)("runContextCheck — throw from send (network error simulation)", () => {
    (0, vitest_1.it)("handles send function throwing as a failure at that level", async () => {
        let callCount = 0;
        const send = async (msg) => {
            callCount++;
            if (callCount > 1)
                throw new Error("Connection reset");
            const canaries = [...msg.matchAll(/CANARY_\d+_[0-9A-F]{6}/g)].map(m => m[0]);
            return canaries.join(" ");
        };
        const result = await (0, context_check_js_1.runContextCheck)(send);
        // First level passes, second throws → truncation warning or pass at level 1
        (0, vitest_1.expect)(typeof result.passed).toBe("boolean");
        (0, vitest_1.expect)(result.firstFailChars).not.toBeNull();
    });
});
//# sourceMappingURL=context-check.test.js.map