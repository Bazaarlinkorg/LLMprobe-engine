"use strict";
// src/submodel-abstain.ts — STEP 2 abstain guard.
//
// When STEP 1 (family classifier) is not confident enough, STEP 2 (sub-model
// matcher) would run inside the wrong family cohort and fabricate a
// "100% model-X" verdict. This pure helper decides whether STEP 2 should
// abstain instead of emitting that spurious verdict.
//
// Abstain conditions:
//   1. topFamilyScore < ABSOLUTE_CONFIDENCE_FLOOR AND margin < MARGIN_FLOOR
//      — the family prediction is weak in absolute terms AND not decisive
//      over the runner-up, so running STEP 2 inside this family cohort is
//      unsafe.
//   2. claimedFamily disagrees with topFamily AND topFamilyScore <
//      CLAIMED_MISMATCH_FLOOR — when the user's claimed model is in a
//      different family than STEP 1 predicted, we need a higher bar before
//      asserting a sub-model verdict against the claim.
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldAbstainSubModel = shouldAbstainSubModel;
const ABSOLUTE_CONFIDENCE_FLOOR = 0.70;
const MARGIN_FLOOR = 0.30;
const CLAIMED_MISMATCH_FLOOR = 0.85;
function shouldAbstainSubModel(input) {
    const { topFamily, topFamilyScore, secondFamilyScore, claimedFamily } = input;
    if (topFamilyScore < ABSOLUTE_CONFIDENCE_FLOOR) {
        const margin = topFamilyScore - secondFamilyScore;
        if (margin < MARGIN_FLOOR)
            return true;
    }
    if (claimedFamily && claimedFamily !== topFamily && topFamilyScore < CLAIMED_MISMATCH_FLOOR) {
        return true;
    }
    return false;
}
//# sourceMappingURL=submodel-abstain.js.map