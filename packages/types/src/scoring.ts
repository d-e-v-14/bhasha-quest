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

export interface IntentVerdict {
  achieved: boolean;
  confidence: number;
  reasoning: string;
  suggestion: string;
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