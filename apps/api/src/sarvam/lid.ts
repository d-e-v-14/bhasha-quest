import { chatCompletion } from "./chat.js";

export interface DetectLanguageTextOptions {
  apiKey: string;
  model: string;
  text: string;
}

interface SarvamLidResponse {
  language?: string;
  language_code?: string;
  error?: { message?: string };
}

export async function detectLanguageText(opts: DetectLanguageTextOptions): Promise<string> {
  const system = [
    "You are a language identification (LID) model for Indian languages.",
    "Given a single utterance, return ONLY the BCP-47 language code of the language it is MOSTLY spoken in.",
    "Prefer the regional script / standard code for that language, e.g. 'ta-IN', 'hi-IN', 'bn-IN', 'mr', 'en-IN'.",
    "Return strict JSON only: {\"language_code\": \"...\"}",
  ].join("\n");

  const raw = await chatCompletion({
    apiKey: opts.apiKey,
    model: opts.model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: `Utterance: "${opts.text}"` },
    ],
  });

  const cleaned = raw.trim().replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/, "$1").trim();
  const json = JSON.parse(cleaned) as SarvamLidResponse;
  return json.language_code ?? json.language ?? "auto";
}
