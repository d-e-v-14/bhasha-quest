export type Round = "guided" | "recall";

export interface WordScore {
  targetWord: string;
  matched: boolean;
  spokenAs: string;
}

export interface ScoreResult {
  accuracy: number;
  passed: boolean;
  threshold: number;
  transcript: string;
  targetPhrase: string;
  words: WordScore[];
}

export interface LanguageMatchResult {
  inTargetLanguage: boolean;
  confidence: number;
  reason: string;
}

export interface SlotTruth {
  matched: boolean;
  confidence: number;
}

export interface IntentVerdict {
  achieved: boolean;
  confidence: number;
  reasoning: string;
  suggestion: string;
  slots?: Record<string, SlotTruth>;
}

export interface TurnScore {
  score: ScoreResult;
  languageMatch: LanguageMatchResult;
  verdict: IntentVerdict;
  total: number;
  breakdown: {
    accuracy: number;
    intent: number;
    language: number;
  };
}

export type LanguageCheckSource = "sarvam-lid" | "script" | "none";

export interface LanguageCheckResult {
  detectedLanguage: string;
  inTargetLanguage: boolean;
  confidence: number;
  source: LanguageCheckSource;
  reason: string;
}

export interface ExpectedSlot {
  key: string;
  value: string;
  aliases?: string[];
}

export interface SlotMatch {
  key: string;
  expected: string;
  matched: boolean;
  spoken: string | null;
  confidence: number;
}

export interface FluencyResult {
  score: number;
  wordsPerSecond: number;
  avgWordConfidence: number | null;
  pauseCount: number;
  available: boolean;
}

export interface CombinedScore {
  total: number;
  taskScore: number;
  slotAccuracy: number | null;
  fluencyScore: number | null;
  passed: boolean;
  threshold: number;
  gated: boolean;
  breakdown: {
    task: number;
    fluency: number | null;
    slots: number | null;
  };
}

export interface EvaluationResult {
  transcript: string;
  targetPhrase: string;
  languageCode: string;
  round: Round;
  languageCheck: LanguageCheckResult;
  intent?: IntentVerdict;
  slotMatches?: SlotMatch[];
  wordScore?: ScoreResult;
  fluency?: FluencyResult;
  score: CombinedScore;
}