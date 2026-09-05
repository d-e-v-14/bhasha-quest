import type { ExpectedSlot, IntentVerdict, SlotTruth } from "@learn-live/types";
import { chatCompletion } from "../sarvam/chat.js";

export interface JudgeIntentOptions {
  apiKey: string;
  model: string;
  transcript: string;
  targetPhrase: string;
  languageCode: string;
  round: "guided" | "recall";
  expectedSlots?: ExpectedSlot[];
}

function stripCodeFence(raw: string): string {
  const trimmed = raw.trim();
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return (fence ? fence[1]! : trimmed)
    .replace(/^```.*$/gm, "")
    .trim();
}

function parseSlots(obj: Record<string, unknown>): Record<string, SlotTruth> | undefined {
  const slots = obj.slots;
  if (!slots || typeof slots !== "object" || Array.isArray(slots)) return undefined;
  const out: Record<string, SlotTruth> = {};
  for (const [key, val] of Object.entries(slots as Record<string, unknown>)) {
    if (val && typeof val === "object" && !Array.isArray(val)) {
      const v = val as Record<string, unknown>;
      out[key] = {
        matched: Boolean(v.matched),
        confidence: typeof v.confidence === "number" ? v.confidence : 0,
      };
    } else if (typeof val === "boolean") {
      out[key] = { matched: val, confidence: val ? 1 : 0 };
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
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
    slots: parseSlots(obj),
  };
}

export async function judgeIntent(opts: JudgeIntentOptions): Promise<IntentVerdict> {
  const slotList = (opts.expectedSlots ?? [])
    .map((s) => `  - "${s.key}": expected "${s.value}"${s.aliases?.length ? ` (ok: ${s.aliases.join(", ")})` : ""}`)
    .join("\n");

  const system = [
    "You are an evaluator for an Indian-language spoken-learning game.",
    `The learner is practising ${opts.languageCode}.`,
    `The intended utterance is "${opts.targetPhrase}".`,
    "Decide whether the learner's spoken transcript achieved the same real-world communication intent, even if the wording differs.",
    "The transcript may contain transcription errors from speech-to-text, so judge meaning and intent, not exact words.",
    ...(opts.expectedSlots?.length
      ? [
          "For each required fact below, state whether the transcript communicates it, even with different wording:",
          slotList,
          "Return strict JSON only:",
          '{"achieved": boolean, "confidence": 0.0-1.0, "reasoning": "short explanation", "suggestion": "one improvement hint", "slots": {"<key>": {"matched": boolean, "confidence": 0.0-1.0}}}',
        ]
      : [
          "Return strict JSON only:",
          '{"achieved": boolean, "confidence": 0.0-1.0, "reasoning": "short explanation", "suggestion": "one improvement hint"}',
        ]),
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