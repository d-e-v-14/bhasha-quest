import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.length === 0) {
    throw new Error(`Missing required env var ${name}. Copy apps/api/.env.example to apps/api/.env.`);
  }
  return value;
}

function optional(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.length > 0 ? value : fallback;
}

function optionalInt(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export const env = {
  sarvaApiKey: required("SARVAM_API_KEY"),
  port: optionalInt("PORT", 3001),
  sttRealtimeModel: optional("SARVAM_STT_REALTIME_MODEL", "saaras:v4-realtime"),
  sttRestModel: optional("SARVAM_STT_REST_MODEL", "saaras:v4"),
  chatModel: optional("SARVAM_CHAT_MODEL", "sarvam-30b"),
  targetLanguage: optional("STT_TARGET_LANGUAGE", "ta-IN"),
  streamType: optional("STT_STREAM_TYPE", "fast"),
  endpointing: optional("STT_ENDPOINTING", "vad"),
  encoding: optional("STT_ENCODING", "linear16"),
  sampleRate: optionalInt("STT_SAMPLE_RATE", 16000),
  silenceDurationMs: optionalInt("STT_SILENCE_DURATION_MS", 350),
  minSpeechDurationMs: optionalInt("STT_MIN_SPEECH_DURATION_MS", 200),
  threshold: Number(optional("STT_THRESHOLD", "0.3")),
  prefixPaddingMs: optionalInt("STT_PREFIX_PADDING_MS", 300),
} as const;