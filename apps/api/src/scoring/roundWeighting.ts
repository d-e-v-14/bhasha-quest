import type { IntentVerdict, ScoreResult, TurnScore } from "@learn-live/types";
import { checkLanguage } from "./languageMatchChecker.js";

interface Weighting {
  accuracy: number;
  intent: number;
  language: number;
}

const ROUND_WEIGHTS: Record<string, Weighting> = {
  guided: { accuracy: 0.5, intent: 0.3, language: 0.2 },
  recall: { accuracy: 0.3, intent: 0.5, language: 0.2 },
};

export function computeTurnScore(
  score: ScoreResult,
  verdict: IntentVerdict,
  languageCode: string,
  round: "guided" | "recall",
): TurnScore {
  const languageMatch = checkLanguage(score.transcript, languageCode);
  const weights = ROUND_WEIGHTS[round] ?? ROUND_WEIGHTS.guided!;

  const accuracy = score.accuracy;
  const intent = verdict.achieved ? verdict.confidence : 0;
  const language = languageMatch.inTargetLanguage ? languageMatch.confidence : 0;

  const total =
    weights.accuracy * accuracy +
    weights.intent * intent +
    weights.language * language;

  return {
    score,
    languageMatch,
    verdict,
    total: Math.round(total * 100) / 100,
    breakdown: {
      accuracy: Math.round(accuracy * 100) / 100,
      intent: Math.round(intent * 100) / 100,
      language: Math.round(language * 100) / 100,
    },
  };
}