import { EventEmitter } from "node:events";
import WebSocket from "ws";

export interface RealtimeSttConfig {
  apiKey: string;
  languageCode: string;
  model: string;
  streamType: "fast" | "balanced" | "simulated";
  mode?: "transcribe" | "translate" | "verbatim" | "translit" | "codemix";
  endpointing?: "vad" | "manual";
  encoding?: string;
  sampleRate?: number;
  threshold?: number;
  prefixPaddingMs?: number;
  silenceDurationMs?: number;
  minSpeechDurationMs?: number;
  baseUrl?: string;
}

export interface SarvamServerFrame {
  event: string;
  request_id?: string;
  utterance_idx?: number;
  text?: string;
  code?: string;
  is_fatal?: boolean;
  message?: string;
  status_code?: number;
  confidence?: string;
  [key: string]: unknown;
}

const WS_BASE = "wss://api.sarvam.ai";

/**
 * Low-level raw WebSocket client for the Sarvam realtime STT endpoint
 * (/speech-to-text-realtime/ws). Used instead of the high-level SDK so the
 * stream_type/mode/endpointing knobs and ping cadence are fully under our
 * control, which is what the 2s turn budget depends on.
 */
export class RealtimeSttClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private readonly config: RealtimeSttConfig;
  private closedByUs = false;

  constructor(config: RealtimeSttConfig) {
    super();
    this.config = config;
  }

  connect(): Promise<void> {
    const params = new URLSearchParams({
      language_code: this.config.languageCode,
      model: this.config.model,
      stream_type: this.config.streamType,
      mode: this.config.mode ?? "transcribe",
      endpointing: this.config.endpointing ?? "vad",
      encoding: this.config.encoding ?? "linear16",
      sample_rate: String(this.config.sampleRate ?? 16000),
      return_timestamps: "false",
      threshold: String(this.config.threshold ?? 0.3),
      prefix_padding_ms: String(this.config.prefixPaddingMs ?? 300),
      silence_duration_ms: String(this.config.silenceDurationMs ?? 350),
      min_speech_duration_ms: String(this.config.minSpeechDurationMs ?? 200),
    });

    const baseUrl = this.config.baseUrl ?? WS_BASE;
    const url = `${baseUrl}/speech-to-text-realtime/ws?${params.toString()}`;

    this.ws = new WebSocket(url, {
      headers: { "Api-Subscription-Key": this.config.apiKey },
      perMessageDeflate: false,
    });

    this.ws.on("message", (data) => {
      try {
        const frame = JSON.parse(data.toString()) as SarvamServerFrame;
        this.emit("frame", frame);
      } catch {
        this.emit("error", new Error("Sarvam sent a non-JSON frame"));
      }
    });

    this.ws.on("close", (code, reason) => {
      const frame = { code, reason: reason.toString() };
      if (!this.closedByUs) this.emit("close", frame);
    });

    this.ws.on("error", (err) => this.emit("error", err));

    return new Promise((resolve, reject) => {
      const onOpen = () => {
        this.ws?.off("close", onClose);
        resolve();
      };
      const onClose = () => {
        this.ws?.off("open", onOpen);
        reject(new Error("Sarvam realtime connection rejected"));
      };
      this.ws?.once("open", onOpen);
      this.ws?.once("close", onClose);
    });
  }

  sendAudioChunk(audioBase64: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event: "audio_input", audio: audioBase64 }));
    }
  }

  sendPing(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event: "ping" }));
    }
  }

  end(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event: "end" }));
    }
  }

  close(): void {
    this.closedByUs = true;
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.terminate();
      this.ws = null;
    }
  }
}