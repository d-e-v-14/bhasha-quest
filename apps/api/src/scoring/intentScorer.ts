import type { IntentVerdict } from "@learn-live/types";
import { chatCompletion } from "../sarvam/chat.js";

export interface JudgeIntentOptions {
  apiKey: string;
  model: string;
  transcript: string;
  targetPhrase: string;
  languageCode: string;
  round: "guided" | "recall";
}

function stripCodeFence(raw: string): string {
  const trimmed = raw.trim();
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return (fence ? fence[1]! : trimmed)
    .replace(/^```.*$/gm, "")
    .trim();
}

function parseVerdict(raw: string): IntentVerdict {
  const cleaned = stripCodeFence(raw);
  let json: unknown;
  try {
    json = JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error(`Intent scorer returned unparseable output: ${cleaned.slice(0, 200)}`);
    }
    json = JSON.parse(match[0]);
  }

  const obj = json as Record<string, unknown>;
  return {
    achieved: Boolean(obj.achieved),
    confidence: typeof obj.confidence === "number" ? obj.confidence : 0,
    reasoning: typeof obj.reasoning === "string" ? obj.reasoning : "",
    suggestion: typeof obj.suggestion === "string" ? obj.suggestion : "",
  };
}

export async function judgeIntent(opts: JudgeIntentOptions): Promise<IntentVerdict> {
  const system = [
    "You are an evaluator for an Indian-language spoken-learning game.",
    `The learner is practising ${opts.languageCode}.`,
    `The intended utterance is "${opts.targetPhrase}".`,
    "Decide whether the learner's spoken transcript achieved the same real-world communication intent, even if the wording differs.",
    "The transcript may contain transcription errors from speech-to-text, so judge meaning and intent, not exact words.",
    "Return strict JSON only:",
    '{"achieved": boolean, "confidence": 0.0-1.0, "reasoning": "short explanation", "suggestion": "one improvement hint"}',
  ].join("\n");

  const user = `Round: ${opts.round === "recall" ? "recall, unassisted, strict" : "guided, assistant-friendly"}.\nTranscript: "${opts.transcript}"`;

  const content = await chatCompletion({
    apiKey: opts.apiKey,
    model: opts.model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  return parseVerdict(content);
}