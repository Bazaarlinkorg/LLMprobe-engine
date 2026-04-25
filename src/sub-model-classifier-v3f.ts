// src/sub-model-classifier-v3f.ts — V3F: V3E features + improved scoring.
//
// Same probe set as V3E (refusal ladder, formatting, uncertainty). Only the
// uncertainty-similarity formula differs: V3F includes `isRoundRate` so that
// same-family models that share ladder + formatting features but diverge on
// rounding behaviour can still be told apart.
//
// Motivating case: openai/gpt-5.5 (isRoundRate=1.0) vs openai/gpt-5.3-codex
// (isRoundRate=0.33). V3E gave them gap 4.58pp (abstained). V3F widens to
// ~8pp by giving the round-rate signal equal weight to the value signal.
//
// See paper "Model Substitution in the Black-Box LLM API Resale Market"
// (2026-04-26), §3.6, for the full motivation and evaluation.

import {
  extractRefusalLadder,
  extractFormatting,
  extractUncertainty,
  DEFAULT_V3E_WEIGHTS,
  type V3EObserved,
  type V3EWeights,
  type FormattingFeatures,
  type UncertaintyFeatures,
} from "./sub-model-classifier-v3e.js";
import type { SubmodelBaselineV3E } from "./sub-model-baselines-v3e.js";

export interface V3FMatch {
  modelId: string;
  family: string;
  displayName: string;
  score: number;
  matched: string[];
  divergent: string[];
}

export interface V3FOutput {
  observed: V3EObserved;
  top: V3FMatch | null;
  candidates: V3FMatch[];
  abstained: boolean;
}

function ladderSimilarity(obsVec: number[], refVecAvg: number[]): number {
  if (obsVec.length !== refVecAvg.length) return 0;
  let sumSq = 0;
  for (let i = 0; i < obsVec.length; i++) {
    sumSq += (obsVec[i] - refVecAvg[i]) ** 2;
  }
  return Math.max(0, 1 - sumSq / 12);
}

function formatSimilarity(obs: FormattingFeatures, ref: SubmodelBaselineV3E["formatting"]): number {
  const bulletHit = obs.bulletChar === ref.bulletCharMode ? 1 : 0;
  const headerHit = Math.exp(-Math.abs(obs.headerDepth - ref.headerDepthAvg) / 2);
  const codeHit = (obs.codeLangTag ?? "") === (ref.codeLangTagMode ?? "") ? 1 : 0;
  return (bulletHit + headerHit + codeHit) / 3;
}

/**
 * V3F-specific: 50/50 split between value-similarity (gaussian on valueAvg)
 * and round-similarity (linear distance from isRoundRate).
 *
 * V3E only uses valueSim and ignores isRoundRate. That blind spot is what
 * V3F closes — see file header.
 */
function uncertaintySimilarity(obs: UncertaintyFeatures, ref: SubmodelBaselineV3E["uncertainty"]): number {
  let valueSim: number;
  if (obs.value == null || ref.valueAvg == null) {
    valueSim = 0.5;
  } else {
    const sigma = Math.max(5, ref.valueStdDev ?? 10);
    const z = Math.abs(obs.value - ref.valueAvg) / sigma;
    valueSim = Math.max(0, Math.exp(-0.5 * z * z));
  }
  const roundRate = typeof ref.isRoundRate === "number" ? ref.isRoundRate : 0.5;
  const roundSim = 1 - Math.abs((obs.isRound ? 1 : 0) - roundRate);
  return 0.5 * valueSim + 0.5 * roundSim;
}

export function scoreV3FMatch(
  obs: V3EObserved,
  ref: SubmodelBaselineV3E,
  weights: V3EWeights = DEFAULT_V3E_WEIGHTS,
): { score: number; matched: string[]; divergent: string[] } {
  const matched: string[] = [];
  const divergent: string[] = [];

  const ladder = ladderSimilarity(obs.refusalLadder.vector, ref.refusalLadder.vectorAvg);
  if (ladder >= 0.85) matched.push(`ladder(${ladder.toFixed(2)})`);
  else divergent.push(`ladder(${ladder.toFixed(2)})`);

  const fmt = formatSimilarity(obs.formatting, ref.formatting);
  if (fmt >= 0.67) matched.push(`fmt(${fmt.toFixed(2)})`);
  else divergent.push(`fmt(${fmt.toFixed(2)})`);

  const unc = uncertaintySimilarity(obs.uncertainty, ref.uncertainty);
  if (unc >= 0.5) matched.push(`unc(${unc.toFixed(2)})`);
  else divergent.push(`unc(${unc.toFixed(2)})`);

  let citationBonus = 0;
  if (ladder >= 0.75) {
    if (obs.refusalLadder.citesLegal && ref.refusalLadder.citesLegalRate >= 0.5) {
      citationBonus += 0.05;
      matched.push("cite.legal");
    }
    if (obs.refusalLadder.cites988 && ref.refusalLadder.cites988Rate >= 0.5) {
      citationBonus += 0.05;
      matched.push("cite.988");
    }
  }

  const base = weights.ladder * ladder + weights.formatting * fmt + weights.uncertainty * unc;
  const score = Math.min(1, base + weights.citationBonus * (citationBonus * 10));
  return { score, matched, divergent };
}

export function classifySubmodelV3F(
  responses: Record<string, string>,
  baselines: SubmodelBaselineV3E[],
  options: {
    predictedFamily?: string;
    confidenceThreshold?: number;
    weights?: V3EWeights;
  } = {},
): V3FOutput {
  const observed: V3EObserved = {
    refusalLadder: extractRefusalLadder(responses),
    formatting: extractFormatting(responses),
    uncertainty: extractUncertainty(responses),
  };
  const threshold = options.confidenceThreshold ?? 0.60;
  const pool = options.predictedFamily
    ? baselines.filter((b) => b.family === options.predictedFamily)
    : baselines;

  const scored = pool
    .map((ref) => {
      const { score, matched, divergent } = scoreV3FMatch(observed, ref, options.weights);
      return {
        modelId: ref.modelId,
        family: ref.family,
        displayName: ref.displayName,
        score,
        matched,
        divergent,
      };
    })
    .sort((a, b) => b.score - a.score);

  const firstMatch = scored[0] ?? null;
  const runnerUp = scored[1];
  const gap = firstMatch && runnerUp ? firstMatch.score - runnerUp.score : Infinity;
  const abstained = firstMatch != null && gap < 0.05;
  const top = firstMatch && firstMatch.score >= threshold && !abstained ? firstMatch : null;

  return { observed, top, candidates: scored.slice(0, 3), abstained };
}
