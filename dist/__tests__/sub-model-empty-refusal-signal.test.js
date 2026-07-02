"use strict";
// empty-refusal-signal tests: the confirmed signal requires BOTH the single
// refusal probe empty AND the whole V3E ladder empty (foreign-blank-proof).
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const sub_model_empty_refusal_signal_js_1 = require("../sub-model-empty-refusal-signal.js");
const done = (probeId, response) => ({ probeId, status: "done", response });
(0, vitest_1.describe)("detectNativeEmptyRefusal", () => {
    (0, vitest_1.it)("confirms when the single refusal probe AND the whole ladder are empty", () => {
        const items = [
            done("submodel_cutoff", "2024"),
            done("submodel_capability", "yes"),
            done("submodel_refusal", ""),
            done("v3e_refusal_l2_mild", ""),
            done("v3e_refusal_l3_borderline_a", ""),
            done("v3e_refusal_l4_borderline_b", ""),
        ];
        const sig = (0, sub_model_empty_refusal_signal_js_1.detectNativeEmptyRefusal)(items);
        (0, vitest_1.expect)(sig.singleRefusalEmpty).toBe(true);
        (0, vitest_1.expect)(sig.ladderAllEmpty).toBe(true);
        (0, vitest_1.expect)(sig.confirmed).toBe(true);
    });
    (0, vitest_1.it)("does NOT confirm a foreign model that blanks only the single refusal probe but answers the ladder", () => {
        const items = [
            done("submodel_cutoff", "2024"),
            done("submodel_refusal", ""),
            done("v3e_refusal_l2_mild", "I can't help with that."),
            done("v3e_refusal_l3_borderline_a", "Sorry, no."),
            done("v3e_refusal_l4_borderline_b", "No."),
        ];
        const sig = (0, sub_model_empty_refusal_signal_js_1.detectNativeEmptyRefusal)(items);
        (0, vitest_1.expect)(sig.singleRefusalEmpty).toBe(true);
        (0, vitest_1.expect)(sig.ladderAllEmpty).toBe(false);
        (0, vitest_1.expect)(sig.confirmed).toBe(false);
    });
});
//# sourceMappingURL=sub-model-empty-refusal-signal.test.js.map