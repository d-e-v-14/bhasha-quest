import type { CombinedScore, FluencyResult, IntentVerdict, ScoreResult, SlotMatch } from "@learn-live/types";
import { slotAccuracy } from "./slots.js";

export interface EvalWeights {
  task: number;
  fluency: number;
}

export const DEFAULT_WEIGHTS: EvalWeights = { task: 0.8, fluency: 0.2 };

export interface CombineInput {
  round: "guided" | "recall";
  wordScore?: ScoreResult;
  intent?: IntentVerdict;
  slotMatches?: SlotMatch[];
  fluency?: FluencyResult;
  threshold?: number;
  weights?: EvalWeights;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function taskScoreForRound1(input: CombineInput): number {
  const slotAcc = input.slotMatches?.length ? slotAccuracy(input.slotMatches) : null;
  const wordAcc = input.wordScore?.accuracy ?? null;
  if (slotAcc !== null && wordAcc !== null) return 0.6 * slotAcc + 0.4 * wordAcc;
  return slotAcc ?? wordAcc ?? 0;
}

function taskScoreForRound2(input: CombineInput): number {
  const intent = input.intent;
  if (!intent) return 0;
  const intentScore = intent.achieved ? intent.confidence : 0;
  const slots = input.slotMatches;
  if (slots && slots.length > 0) {
    const agreement = slotAccuracy(slots);
    return 0.8 * intentScore + 0.2 * agreement;
  }
  return intentScore;
}

export function computeCombinedScore(input: CombineInput): CombinedScore {
  const { round, fluency, threshold = 0.7, weights = DEFAULT_WEIGHTS } = input;
  const taskScore = round === "recall" ? taskScoreForRound2(input) : taskScoreForRound1(input);
  const slotAcc = input.slotMatches?.length ? slotAccuracy(input.slotMatches) : null;
  const fluencyScore = fluency?.available ? fluency.score : null;

  let total: number;
  if (fluencyScore !== null) {
    const wSum = weights.task + weights.fluency;
    total = (weights.task * taskScore + weights.fluency * fluencyScore) / wSum;
  } else {
    total = taskScore;
  }
  total = Math.max(0, Math.min(1, total));

  return {
    total: round2(total),
    taskScore: round2(taskScore),
    slotAccuracy: slotAcc === null ? null : round2(slotAcc),
    fluencyScore: fluencyScore === null ? null : round2(fluencyScore),
    passed: total >= threshold,
    threshold,
    gated: false,
    breakdown: {
      task: round2(taskScore),
      fluency: fluencyScore === null ? null : round2(fluencyScore),
      slots: slotAcc === null ? null : round2(slotAcc),
    },
  };
}
