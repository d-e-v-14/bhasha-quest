import type { ScoreResult, WordScore } from "@learn-live/types";

function normalize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFC")
    .replace(/[.,!?।]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0]![j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i]![j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1]![j - 1]!
          : 1 + Math.min(dp[i - 1]![j]!, dp[i]![j - 1]!, dp[i - 1]![j - 1]!);
    }
  }
  return dp[a.length]![b.length]!;
}

export function scoreTranscript(
  spoken: string,
  target: string,
  threshold = 0.7,
  editTolerance = 0.3,
): ScoreResult {
  const spokenWords = normalize(spoken);
  const targetWords = normalize(target);

  const words: WordScore[] = targetWords.map((word) => {
    const bestMatch = spokenWords.reduce<{ word: string; dist: number }>(
      (best, sw) => {
        const dist = levenshtein(word, sw);
        return dist < best.dist ? { word: sw, dist } : best;
      },
      { word: "", dist: Infinity },
    );
    const maxAllowedDist = Math.ceil(word.length * editTolerance);
    return {
      targetWord: word,
      matched: bestMatch.dist <= maxAllowedDist,
      spokenAs: bestMatch.word,
    };
  });

  const correctCount = words.filter((w) => w.matched).length;
  const accuracy = targetWords.length === 0 ? 0 : correctCount / targetWords.length;

  return {
    words,
    accuracy,
    passed: accuracy >= threshold,
    threshold,
    transcript: spoken.trim(),
    targetPhrase: target.trim(),
  };
}