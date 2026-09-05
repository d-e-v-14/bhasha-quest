import type { ExpectedSlot, SlotMatch } from "@learn-live/types";

function normalize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFC")
    .replace(/[.,!?।؟]/g, " ")
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

function wordDistance(a: string, b: string): number {
  const d = levenshtein(a, b);
  return d / Math.max(a.length, b.length, 1);
}

function fuzzyPhraseMatch(tokens: string[], phrase: string, tolerance = 0.3): { found: boolean; best: number } {
  const phraseTokens = normalize(phrase);
  if (phraseTokens.length === 0) return { found: false, best: 0 };

  let best = 0;
  for (let start = 0; start <= tokens.length - phraseTokens.length; start++) {
    let matchCount = 0;
    let totalDist = 0;
    for (let i = 0; i < phraseTokens.length; i++) {
      const target = phraseTokens[i]!;
      const actual = tokens[start + i]!;
      const dist = wordDistance(target, actual);
      totalDist += dist;
      if (dist <= tolerance) matchCount++;
    }
    const score = matchCount / phraseTokens.length - totalDist / (phraseTokens.length * 2);
    if (score > best) best = score;
  }

  return { found: best >= 0.5, best };
}

export function matchSlots(transcript: string, expectedSlots: ExpectedSlot[]): SlotMatch[] {
  const tokens = normalize(transcript);
  if (expectedSlots.length === 0) return [];

  return expectedSlots.map((slot) => {
    const candidates = [slot.value, ...(slot.aliases ?? [])];
    let best = { found: false, best: 0 };
    let spoken: string | null = null;

    for (const candidate of candidates) {
      const r = fuzzyPhraseMatch(tokens, candidate);
      if (r.best > best.best) {
        best = r;
        if (r.found) spoken = candidate;
      }
    }

    return {
      key: slot.key,
      expected: slot.value,
      matched: best.found,
      spoken,
      confidence: Math.min(best.best, 1),
    };
  });
}

export function slotAccuracy(matches: SlotMatch[]): number {
  if (matches.length === 0) return 0;
  return matches.filter((m) => m.matched).length / matches.length;
}
