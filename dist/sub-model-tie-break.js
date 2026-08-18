"use strict";
// src/sub-model-tie-break.ts — cross-family abstain guard for classifySubmodelV3.
//
// classifySubmodelV3 abstains when the top-2 candidates are within
// TIE_BREAK_GAP. Problem: in the GLOBAL pool (no predictedFamily), a
// foreign-family baseline can score close to the true same-family top and
// trip the abstain, suppressing a correct pick.
//
// Fix: the tie-break only considers a SAME-FAMILY sibling as the runner-up.
// Cross-family disambiguation is the family classifier's job, not the
// sub-model tie-break's. A different-family candidate scoring close does not
// force abstain.
//
// IMPORTANT — this does NOT promote a foreign top: it only changes which
// runner-up defines the gap. If a foreign model is itself the #1 candidate,
// that is a family-level signal handled upstream, not here.
Object.defineProperty(exports, "__esModule", { value: true });
exports.sameFamilyTieGap = sameFamilyTieGap;
/**
 * Gap to use for the tie-break abstain: distance from the top candidate to the
 * next candidate OF THE SAME FAMILY. Returns Infinity when the top has no
 * same-family runner-up (so a lone same-family top never abstains on foreign noise).
 * `scoredDesc` must be sorted by score descending.
 */
function sameFamilyTieGap(scoredDesc) {
    const top = scoredDesc[0];
    if (!top)
        return Infinity;
    const sibling = scoredDesc.slice(1).find((c) => c.family === top.family);
    return sibling ? top.score - sibling.score : Infinity;
}
//# sourceMappingURL=sub-model-tie-break.js.map