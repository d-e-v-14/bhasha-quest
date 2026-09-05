import type { ScoreResult, TurnScore } from "./scoring.js";

export interface NormalizedSttResult {
  transcript: string;
  languageCode: string;
  durationSeconds?: number;
  source: "realtime" | "rest";
}

export type RelayEvent =
  | { event: "session.begin" }
  | { event: "utterance.start"; utteranceIdx: number }
  | { event: "utterance.end"; utteranceIdx: number }
  | { event: "partial"; utteranceIdx: number; text: string }
  | { event: "result"; transcript: string; latencyMs: number; score: ScoreResult }
  | { event: "intent_verdict"; verdict: TurnScore }
  | { event: "fatal_error"; code: string; message: string; fallbackToRest?: boolean }
  | { event: "error"; code: string; message: string };