import type { LanguageCheckResult, LanguageCheckSource } from "@learn-live/types";
import { checkLanguage } from "./languageMatchChecker.js";
import { detectLanguageText } from "../sarvam/lid.js";

const DEVANAGARI_LANGS = new Set(["hi", "mr", "ne", "mai", "sa"]);

function primary(code: string): string {
  return code.split("-")[0]!.toLowerCase();
}

function languagesCompatible(detected: string, target: string): boolean {
  const d = primary(detected);
  const t = primary(target);
  if (d === t) return true;
  if (d === "auto" || d === "und" || d === "unknown") return true;
  const western = new Set(["en", "eng", "es", "fr", "de", "ar", "zh", "ru", "pt"]);
  if (western.has(d)) return false;
  if (DEVANAGARI_LANGS.has(d) && DEVANAGARI_LANGS.has(t)) return true;
  return true;
}

export interface LanguageGateInput {
  transcript: string;
  targetLanguage: string;
  sttLanguageCode?: string;
  apiKey?: string;
  chatModel?: string;
}

export async function evaluateLanguageGate(input: LanguageGateInput): Promise<LanguageCheckResult> {
  const { transcript, targetLanguage } = input;
  const script = checkLanguage(transcript, targetLanguage);

  let detected = input.sttLanguageCode ?? "auto";
  let source: LanguageCheckSource = "sarvam-lid";

  if (!input.sttLanguageCode && input.apiKey && input.chatModel) {
    try {
      detected = await detectLanguageText({ apiKey: input.apiKey, model: input.chatModel, text: transcript });
      source = "sarvam-lid";
    } catch {
      detected = "auto";
    }
  }
  if (detected === "auto") source = "script";

  if (detected === "auto" || detected === "und") {
    return {
      detectedLanguage: detected,
      inTargetLanguage: script.inTargetLanguage,
      confidence: script.confidence,
      source: "script",
      reason: script.reason,
    };
  }

  const compatible = languagesCompatible(detected, targetLanguage);

  if (compatible) {
    return {
      detectedLanguage: detected,
      inTargetLanguage: true,
      confidence: script.inTargetLanguage ? Math.max(script.confidence, 0.7) : 0.7,
      source,
      reason: script.inTargetLanguage
        ? `detected ${detected} (matches target); script also target-dominant`
        : `detected ${detected} (matches target); transcript partially romanized`,
    };
  }

  if (script.inTargetLanguage) {
    return {
      detectedLanguage: detected,
      inTargetLanguage: true,
      confidence: 0.6,
      source,
      reason: `LID reports ${detected} but transcript is target-script dominant; treating as code-mixing`,
    };
  }

  return {
    detectedLanguage: detected,
    inTargetLanguage: false,
    confidence: script.confidence,
    source,
    reason: `LID reports ${detected}; transcript is not target-script dominant`,
  };
}
