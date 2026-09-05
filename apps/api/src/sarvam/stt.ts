import type { NormalizedSttResult } from "@learn-live/types";

const STS_BASE = "https://api.sarvam.ai";

export interface RestSttOptions {
  apiKey: string;
  model: string;
  languageCode: string;
  audio: Buffer;
}

interface SarvamSttResponse {
  transcript?: string;
  diarized_transcript?: string;
  language_code?: string;
  error?: { message?: string };
}

export async function transcribeViaRest(opts: RestSttOptions): Promise<NormalizedSttResult> {
  const form = new FormData();
  const blob = new Blob([new Uint8Array(opts.audio)], { type: "audio/wav" });
  form.append("file", blob, "audio.wav");
  form.append("model", opts.model);
  form.append("language_code", opts.languageCode);

  const res = await fetch(`${STS_BASE}/speech-to-text`, {
    method: "POST",
    headers: { "api-subscription-key": opts.apiKey },
    body: form,
  });

  const json = (await res.json().catch(() => ({}))) as SarvamSttResponse;
  if (!res.ok) {
    const message = json.error?.message ?? `Sarvam REST STT failed (${res.status})`;
    throw new Error(message);
  }

  const transcript = json.transcript ?? json.diarized_transcript ?? "";
  return {
    transcript,
    languageCode: json.language_code ?? opts.languageCode,
    source: "rest",
  };
}