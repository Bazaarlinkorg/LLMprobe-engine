// detection-config tests: the disable registry is EMPTY as of 2026-07-02, so
// nothing is filtered and no id is disabled.

import { describe, it, expect } from "vitest";
import {
  DETECTION_DISABLED_MODEL_IDS,
  isDetectionDisabled,
  filterDetectable,
} from "../sub-model-detection-config.js";

describe("detection-config (empty registry)", () => {
  it("registry is empty", () => {
    expect(DETECTION_DISABLED_MODEL_IDS.size).toBe(0);
  });

  it("isDetectionDisabled is false for any id (and null/undefined)", () => {
    expect(isDetectionDisabled("openai/gpt-5.3-codex")).toBe(false);
    expect(isDetectionDisabled("anthropic/claude-fable-5")).toBe(false);
    expect(isDetectionDisabled(null)).toBe(false);
    expect(isDetectionDisabled(undefined)).toBe(false);
  });

  it("filterDetectable is a no-op passthrough when registry is empty", () => {
    const items = [{ modelId: "a/b" }, { modelId: "c/d" }];
    expect(filterDetectable(items)).toBe(items); // same reference — early return
  });
});
