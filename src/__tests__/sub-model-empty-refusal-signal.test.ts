// empty-refusal-signal tests: the confirmed signal requires BOTH the single
// refusal probe empty AND the whole V3E ladder empty (foreign-blank-proof).

import { describe, it, expect } from "vitest";
import { detectNativeEmptyRefusal, type ProbeItemLite } from "../sub-model-empty-refusal-signal.js";

const done = (probeId: string, response: string | null): ProbeItemLite => ({ probeId, status: "done", response });

describe("detectNativeEmptyRefusal", () => {
  it("confirms when the single refusal probe AND the whole ladder are empty", () => {
    const items: ProbeItemLite[] = [
      done("submodel_cutoff", "2024"),
      done("submodel_capability", "yes"),
      done("submodel_refusal", ""),
      done("v3e_refusal_l2_mild", ""),
      done("v3e_refusal_l3_borderline_a", ""),
      done("v3e_refusal_l4_borderline_b", ""),
    ];
    const sig = detectNativeEmptyRefusal(items);
    expect(sig.singleRefusalEmpty).toBe(true);
    expect(sig.ladderAllEmpty).toBe(true);
    expect(sig.confirmed).toBe(true);
  });

  it("does NOT confirm a foreign model that blanks only the single refusal probe but answers the ladder", () => {
    const items: ProbeItemLite[] = [
      done("submodel_cutoff", "2024"),
      done("submodel_refusal", ""),
      done("v3e_refusal_l2_mild", "I can't help with that."),
      done("v3e_refusal_l3_borderline_a", "Sorry, no."),
      done("v3e_refusal_l4_borderline_b", "No."),
    ];
    const sig = detectNativeEmptyRefusal(items);
    expect(sig.singleRefusalEmpty).toBe(true);
    expect(sig.ladderAllEmpty).toBe(false);
    expect(sig.confirmed).toBe(false);
  });
});
