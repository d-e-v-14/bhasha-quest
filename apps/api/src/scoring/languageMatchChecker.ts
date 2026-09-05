import type { LanguageMatchResult } from "@learn-live/types";

const SCRIPTS: Record<string, RegExp> = {
  "ta-IN": /[\u0B80-\u0BFF]/,
  "hi-IN": /[\u0900-\u097F]/,
  mr: /[\u0900-\u097F]/,
  "bn-IN": /[\u0980-\u09FF]/,
  "gu-IN": /[\u0A80-\u0AFF]/,
  "kn-IN": /[\u0C80-\u0CFF]/,
  "ml-IN": /[\u0D00-\u0D7F]/,
  "te-IN": /[\u0C00-\u0C7F]/,
  "pa-IN": /[\u0A00-\u0A7F]/,
  "or-IN": /[\u0B00-\u0B7F]/,
  "ur-IN": /[\u0600-\u06FF]/,
  "as-IN": /[\u0980-\u09FF]/,
};

const LATIN = /[a-zA-Z]/;

export function checkLanguage(transcript: string, languageCode: string): LanguageMatchResult {
  if (languageCode === "auto") {
    return { inTargetLanguage: true, confidence: 0.5, reason: "auto language detection, no target script check" };
  }

  const script = SCRIPTS[languageCode];
  if (!script) {
    return { inTargetLanguage: true, confidence: 0.5, reason: `no script mapping for ${languageCode}` };
  }

  const scriptChars = (transcript.match(script) ?? []).length;
  const latinChars = (transcript.match(LATIN) ?? []).length;
  const total = Math.max(scriptChars + latinChars, 1);

  if (scriptChars === 0 && latinChars > 0) {
    return {
      inTargetLanguage: false,
      confidence: 0.3,
      reason: "transcript is entirely romanized; likely wrong language or heavy code-mixing",
    };
  }

  const ratio = Math.min(scriptChars / total, 1);
  return {
    inTargetLanguage: ratio >= 0.5,
    confidence: ratio,
    reason:
      ratio >= 0.5
        ? "transcript is predominantly in the target-language script"
        : "transcript contains significant non-target content",
  };
}