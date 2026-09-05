import type { FluencyResult, SttMetadata } from "@learn-live/types";

function clamp(v: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, v));
}

export function computeFluency(metadata?: SttMetadata): FluencyResult {
  const wordConfidences = metadata?.wordConfidences;
  const durationMs = metadata?.durationMs;
  const pauseCount = metadata?.pauseCount;

  const available = Boolean(
    (wordConfidences && wordConfidences.length > 0) || durationMs || pauseCount !== undefined,
  );

  const wordCount = wordConfidences?.length ?? 0;

  const avgConfidence =
    wordConfidences && wordConfidences.length > 0
      ? wordConfidences.reduce((a, b) => a + b, 0) / wordConfidences.length
      : null;

  const wordsPerSecond = durationMs && durationMs > 0 ? wordCount / (durationMs / 1000) : 0;

  const confNorm = avgConfidence ?? 0.6;
  const speedNorm = clamp(1 - Math.abs(wordsPerSecond - 2.2) / 3);
  const pauseNorm =
    pauseCount !== undefined && wordCount > 0 ? clamp(1 - pauseCount / wordCount) : 0.7;

  const score = clamp(0.55 * confNorm + 0.3 * speedNorm + 0.15 * pauseNorm);

  return {
    score: Math.round(score * 100) / 100,
    wordsPerSecond: Math.round(wordsPerSecond * 100) / 100,
    avgWordConfidence: avgConfidence === null ? null : Math.round(avgConfidence * 100) / 100,
    pauseCount: pauseCount ?? 0,
    available,
  };
}
