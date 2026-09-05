import type { IncomingMessage } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import type { RelayEvent, TurnScore } from "@learn-live/types";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { RealtimeSttClient } from "../sarvam/realtimeSttClient.js";
import { scoreTranscript } from "../scoring/wordScorer.js";
import { judgeIntent } from "../scoring/intentScorer.js";
import { computeTurnScore } from "../scoring/roundWeighting.js";

interface OpenQuery {
  language: string;
  targetPhrase: string;
  round: "guided" | "recall";
}

const CLOSE_CODE_1003 = 1003;
const CLOSE_CODE_1008 = 1008;
const CLOSE_CODE_1011 = 1011;
const CLOSE_CODE_4000 = 4000;

const PING_INTERVAL_MS = 20_000;

function parseOpenQuery(req: IncomingMessage): OpenQuery {
  const url = new URL(req.url ?? "/", "http://localhost");
  const round = url.searchParams.get("round") === "recall" ? "recall" : "guided";
  return {
    language: url.searchParams.get("language") ?? env.targetLanguage,
    targetPhrase: url.searchParams.get("targetPhrase") ?? "",
    round,
  };
}

export function attachRealtimeRelay(wss: WebSocketServer): void {
  wss.on("connection", (clientWs: WebSocket, req: IncomingMessage) => {
    const query = parseOpenQuery(req);
    const session = new RealtimeSttClient({
      apiKey: env.sarvaApiKey,
      languageCode: query.language,
      model: env.sttRealtimeModel,
      streamType: env.streamType as "fast" | "balanced" | "simulated",
      mode: "transcribe",
      endpointing: env.endpointing as "vad" | "manual",
      encoding: env.encoding,
      sampleRate: env.sampleRate,
      threshold: env.threshold,
      prefixPaddingMs: env.prefixPaddingMs,
      silenceDurationMs: env.silenceDurationMs,
      minSpeechDurationMs: env.minSpeechDurationMs,
    });

    let connected = false;
    let turnStartedAt = 0;
    let queuedChunks: string[] = [];
    let pingTimer: NodeJS.Timeout | null = null;
    let closed = false;

    const send = (payload: RelayEvent): void => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify(payload));
      }
    };

    const closeSarvam = (): void => {
      if (pingTimer) {
        clearInterval(pingTimer);
        pingTimer = null;
      }
      session.off("frame", onFrame);
      session.close();
    };

    const handleFatalClose = (code: number, reason: string): void => {
      logger.warn("Sarvam realtime closed", { code, reason, query });
      const fallbackToRest = code === CLOSE_CODE_1003;
      const codeMessage = code === CLOSE_CODE_1003
        ? "Rate limited or subscription key invalid"
        : code === CLOSE_CODE_1008
          ? "Inactivity timeout"
          : code === CLOSE_CODE_1011
            ? "Sarvam server error"
            : code === CLOSE_CODE_4000
              ? "Connection rejected by Sarvam (invalid config)"
              : `Sarvam closed (${code})`;
      send({
        event: "fatal_error",
        code: String(code),
        message: codeMessage,
        fallbackToRest,
      });
      clientWs.close(4001, "upstream closed");
    };

    const onFrame = (frame: unknown): void => {
      const msg = frame as {
        event: string;
        utterance_idx?: number;
        text?: string;
        code?: string;
        is_fatal?: boolean;
        message?: string;
        status_code?: number;
      };

      switch (msg.event) {
        case "session.begin":
          send({ event: "session.begin" });
          break;

        case "vad.speech_start":
          send({ event: "utterance.start", utteranceIdx: msg.utterance_idx ?? 0 });
          break;

        case "vad.speech_end":
          send({ event: "utterance.end", utteranceIdx: msg.utterance_idx ?? 0 });
          break;

        case "transcript.partial":
          send({ event: "partial", utteranceIdx: msg.utterance_idx ?? 0, text: msg.text ?? "" });
          break;

        case "transcript.final": {
          const transcript = msg.text ?? "";
          if (turnStartedAt > 0) {
            const latencyMs = Date.now() - turnStartedAt;
            turnStartedAt = 0;

            const score = scoreTranscript(transcript, query.targetPhrase);
            send({
              event: "result",
              transcript,
              latencyMs,
              score,
            });

            void judgeIntent({
              apiKey: env.sarvaApiKey,
              model: env.chatModel,
              transcript,
              targetPhrase: query.targetPhrase,
              languageCode: query.language,
              round: query.round,
            })
              .then((verdict) => {
                const turn: TurnScore = computeTurnScore(score, verdict, query.language, query.round);
                send({ event: "intent_verdict", verdict: turn });
              })
              .catch((err: unknown) => {
                logger.error("Intent scoring failed", err);
                send({ event: "error", code: "intent_score_failed", message: String(err) });
              });
          }
          break;
        }

        case "session.end":
          closeSarvam();
          break;

        case "error": {
          const isFatal = msg.is_fatal ?? false;
          if (isFatal) {
            send({
              event: "fatal_error",
              code: msg.code ?? "error",
              message: msg.message ?? "Sarvam realtime error",
              fallbackToRest: msg.status_code === 429,
            });
          } else {
            send({ event: "error", code: msg.code ?? "error", message: msg.message ?? "" });
          }
          break;
        }

        default:
          break;
      }
    };

    session.on("frame", onFrame);
    session.on("error", (err) => {
      logger.error("Sarvam realtime client error", err);
      send({ event: "error", code: "upstream_error", message: String(err) });
    });

    session
      .connect()
      .then(() => {
        connected = true;
        pingTimer = setInterval(() => session.sendPing(), PING_INTERVAL_MS);
        while (queuedChunks.length > 0) {
          const chunk = queuedChunks.shift();
          if (chunk) session.sendAudioChunk(chunk);
        }
      })
      .catch(() => {
        handleFatalClose(CLOSE_CODE_4000, "connect rejected");
      });

    session.on("close", ({ code, reason }) => {
      if (!closed) {
        closed = true;
        handleFatalClose(code, reason);
      }
    });

    clientWs.on("message", (data) => {
      let msg: { event?: string; audio?: string };
      try {
        msg = JSON.parse(data.toString()) as { event?: string; audio?: string };
      } catch {
        send({ event: "error", code: "bad_frame", message: "client sent non-JSON" });
        return;
      }

      if (msg.event === "audio_input" && msg.audio) {
        if (turnStartedAt === 0 && connected) turnStartedAt = Date.now();
        if (connected) {
          session.sendAudioChunk(msg.audio);
        } else {
          queuedChunks.push(msg.audio);
        }
      } else if (msg.event === "end") {
        session.end();
      }
    });

    clientWs.on("close", () => {
      if (!closed) {
        closed = true;
        closeSarvam();
      }
    });

    clientWs.on("error", (err) => {
      logger.error("Client socket error", err);
      closeSarvam();
    });
  });
}