// tests/vitest/lib/sub-model/candidate-family-zhipu.test.ts
// Regression (2026-07-03, found by real end-to-end probe): confirmedFamily is
// "zhipu" but GLM baseline ids are "z-ai/glm-*". Without canonicalFamily,
// candidateSiblingsForFamily("zhipu") returns [] → GLM V3H never fires.
import { describe, it, expect } from "vitest";
import { candidateSiblingsForFamily } from "../sub-model-v3g-bias-fingerprint.js";
import { canonicalFamily } from "../model-id-normalize.js";
import type { BiasBaseline } from "../sub-model-v3g-bias-fingerprint.js";

const bl = (modelId: string): BiasBaseline => ({ modelId, capturedAt: "2026-07-03", sampleCount: 540, probes: {} });
const POOL = [bl("z-ai/glm-5"), bl("z-ai/glm-5.1"), bl("z-ai/glm-5.2"), bl("openai/gpt-5.5"), bl("anthropic/claude-opus-4.6")];

describe("candidateSiblingsForFamily — zhipu⟷z-ai", () => {
  it("family 'zhipu' finds the z-ai/glm baselines", () => {
    expect(candidateSiblingsForFamily("zhipu", POOL).map((b) => b.modelId)).toEqual(["z-ai/glm-5", "z-ai/glm-5.1", "z-ai/glm-5.2"]);
  });
  it("family 'z-ai' finds them too", () => {
    expect(candidateSiblingsForFamily("z-ai", POOL)).toHaveLength(3);
  });
  it("other families unaffected", () => {
    expect(candidateSiblingsForFamily("openai", POOL).map((b) => b.modelId)).toEqual(["openai/gpt-5.5"]);
  });
});

describe("canonicalFamily", () => {
  it("collapses zhipu/zai → z-ai; passes others through", () => {
    expect(canonicalFamily("zhipu")).toBe("z-ai");
    expect(canonicalFamily("z-ai")).toBe("z-ai");
    expect(canonicalFamily("openai")).toBe("openai");
    expect(canonicalFamily("anthropic")).toBe("anthropic");
  });
});

// The V3H OVERRIDE (catching a substitution) also compares the picked model's
// family to confirmedFamily — same zhipu⟷z-ai split. Without canonicalFamily the
// override never fires for GLM → a glm-5.2 endpoint claiming glm-5.1 is NOT caught.
import { shouldPromoteSubModelFromV3H, V3H_ACTIVE_PROMPT_POLICIES } from "../sub-model-v3g-bias-fingerprint.js";

describe("shouldPromoteSubModelFromV3H — zhipu⟷z-ai override", () => {
  const glmPolicy = V3H_ACTIVE_PROMPT_POLICIES.find((p) => p.id === "zhipu-glm-cluster")!;
  const decisiveV3H = {
    version: "v3h" as const, topModel: "z-ai/glm-5.2", policyId: "zhipu-glm-cluster",
    confidence: 1, logLikelihoodGap: 999, probeVoteMargin: 9, abstained: false,
    scores: {}, perProbe: [], activeProbeIds: glmPolicy.activeProbeIds, sampleCount: 54,
    runnerUpModel: "z-ai/glm-5.1", posteriors: [{ modelId: "z-ai/glm-5.2", score: 1 }],
    empiricalAccuracyFloor: 0.95, avgLogLikelihood: -1, strongPass: true, usedExpiredBaselines: [],
  };
  it("confirmedFamily 'zhipu' + V3H top 'z-ai/glm-5.2' → promotes (catches the substitution)", () => {
    // endpoint really glm-5.2, fuse picked the claimed glm-5.1 → override must fire
    expect(shouldPromoteSubModelFromV3H(decisiveV3H, "zhipu", { modelId: "z-ai/glm-5.1", family: "zhipu" }, "z-ai/glm-5.1")).toBe(true);
  });
  it("confirmedFamily 'z-ai' also works", () => {
    expect(shouldPromoteSubModelFromV3H(decisiveV3H, "z-ai", { modelId: "z-ai/glm-5.1", family: "z-ai" }, "z-ai/glm-5.1")).toBe(true);
  });
});
