// detection-config tests. Registry was EMPTY as of 2026-07-02; opus-5
// (2026-07-25) and fable-5 (2026-08-10) were both added since — see
// sub-model-detection-config.ts's own comments for why.

import { describe, it, expect } from "vitest";
import {
  DETECTION_DISABLED_MODEL_IDS,
  isDetectionDisabled,
  filterDetectable,
} from "../sub-model-detection-config.js";

describe("detection-config", () => {
  it("opus-5 and fable-5 are disabled at the V3 layer — neither has a discriminating V3 feature", () => {
    expect(DETECTION_DISABLED_MODEL_IDS.size).toBe(2);
    expect(isDetectionDisabled("anthropic/claude-opus-5")).toBe(true);
    expect(isDetectionDisabled("anthropic/claude-fable-5")).toBe(true);
  });

  it("isDetectionDisabled is false for other ids (and null/undefined)", () => {
    expect(isDetectionDisabled("openai/gpt-5.3-codex")).toBe(false);
    expect(isDetectionDisabled("openai/gpt-5.5")).toBe(false);
    expect(isDetectionDisabled(null)).toBe(false);
    expect(isDetectionDisabled(undefined)).toBe(false);
  });

  it("filterDetectable drops only the disabled targets, order-preserving", () => {
    const items = [
      { modelId: "openai/gpt-5.5" },
      { modelId: "anthropic/claude-opus-5" },
      { modelId: "anthropic/claude-fable-5" },
      { modelId: "anthropic/claude-opus-4.8" },
    ];
    expect(filterDetectable(items).map((i) => i.modelId)).toEqual([
      "openai/gpt-5.5",
      "anthropic/claude-opus-4.8",
    ]);
  });

  // The disable is V3-only by construction: both models must REMAIN V3H
  // candidates, because V3H is the layer that can still identify them. If a
  // future change routes filterDetectable into the V3H path, this fails and
  // says why.
  it("both stay in the V3H bias-baseline pool despite being V3-disabled", async () => {
    const { BIAS_BASELINES } = await import("../sub-model-bias-baselines.js");
    const { V3H_ACTIVE_PROMPT_POLICIES } = await import("../sub-model-v3g-bias-fingerprint.js");
    expect(BIAS_BASELINES.some((b) => b.modelId === "anthropic/claude-opus-5")).toBe(true);
    expect(BIAS_BASELINES.some((b) => b.modelId === "anthropic/claude-fable-5")).toBe(true);
    const cluster = V3H_ACTIVE_PROMPT_POLICIES.find((p) => p.id === "anthropic-claude-cluster")!;
    expect(cluster.modelIds).toContain("anthropic/claude-opus-5");
    expect(cluster.modelIds).toContain("anthropic/claude-fable-5");
  });
});
