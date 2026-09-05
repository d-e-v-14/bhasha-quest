import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import WebSocket from "ws";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const wsUrl = process.env.WS_URL ?? "ws://localhost:3001/ws/stt";
const audioPath = process.env.AUDIO_PATH ?? resolve(repoRoot, "data/test1.wav");
const language = process.env.LANGUAGE ?? "hi-IN";
const targetPhrase = process.env.TARGET_PHRASE ?? "";
const round = process.env.ROUND === "recall" ? "recall" : "guided";
const chunkMs = 100;

interface WavHeader {
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
  samples: Int16Array;
}

function parseWav(buf: Buffer): WavHeader {
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error("not a RIFF/WAVE file");
  }
  let offset = 12;
  let channels = 1;
  let sampleRate = 16000;
  let bitsPerSample = 16;
  let dataStart = 0;
  let dataLen = 0;
  while (offset + 8 <= buf.length) {
    const id = buf.toString("ascii", offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    const body = offset + 8;
    if (id === "fmt ") {
      channels = buf.readUInt16LE(body + 2);
      sampleRate = buf.readUInt32LE(body + 4);
      bitsPerSample = buf.readUInt16LE(body + 14);
    } else if (id === "data") {
      dataStart = body;
      dataLen = size;
      break;
    }
    offset = body + size + (size % 2);
  }
  if (!dataStart) throw new Error("no data chunk");
  const bytesPerSample = bitsPerSample / 8;
  const frameCount = Math.floor(dataLen / (channels * bytesPerSample));
  const samples = new Int16Array(frameCount * channels);
  for (let i = 0; i < frameCount * channels; i++) {
    samples[i] = buf.readInt16LE(dataStart + i * bytesPerSample);
  }
  return { sampleRate, channels, bitsPerSample, samples };
}

function toMono16k(header: WavHeader): Int16Array {
  const factor = header.sampleRate / 16000;
  if (factor !== Math.round(factor)) {
    throw new Error(`sample rate ${header.sampleRate} is not an integer multiple of 16000`);
  }
  const step = Math.round(factor);
  const outFrames = Math.floor(header.samples.length / (header.channels * step));
  const out = new Int16Array(outFrames);
  for (let f = 0; f < outFrames; f++) {
    const src = f * step * header.channels;
    let sum = 0;
    for (let c = 0; c < header.channels; c++) sum += header.samples[src + c];
    out[f] = sum / header.channels;
  }
  return out;
}

function base64Pcm(samples: Int16Array, from: number, to: number): string {
  const slice = samples.subarray(from, to);
  return Buffer.from(slice.buffer, slice.byteOffset, slice.byteLength).toString("base64");
}

const wav = parseWav(readFileSync(audioPath));
console.log(`input: ${audioPath} (${wav.sampleRate}Hz, ${wav.channels}ch, ${wav.bitsPerSample}bit, ${wav.samples.length} samples)`);
const pcm = toMono16k(wav);
console.log(`stream: 16000Hz mono, ${pcm.length} samples = ${(pcm.length / 16000).toFixed(2)}s`);

const params = new URLSearchParams({ language, targetPhrase, round });
const url = `${wsUrl}?${params.toString()}`;
const ws = new WebSocket(url);

let bytesPerChunk = (16000 / 1000) * chunkMs * 2; // 100ms -> 3200 bytes
const events: string[] = [];

ws.on("open", () => {
  console.log("connected:", url);
  let offset = 0;
  const timer = setInterval(() => {
    if (offset >= pcm.length) {
      clearInterval(timer);
      ws.send(JSON.stringify({ event: "end" }));
      console.log("sent end frame");
      return;
    }
    const end = Math.min(offset + bytesPerChunk / 2, pcm.length);
    const chunk = base64Pcm(pcm, offset, end);
    offset = end;
    ws.send(JSON.stringify({ event: "audio_input", audio: chunk }));
  }, chunkMs);
});

ws.on("message", (data) => {
  const msg = JSON.parse(data.toString());
  const event = msg.event;
  switch (event) {
    case "partial":
      events.push(`partial: ${msg.text}`);
      process.stdout.write(`\rpartial: ${msg.text}    `);
      break;
    case "result":
      console.log("");
      console.log(`RESULT  transcript="${msg.transcript}" latency=${msg.latencyMs}ms accuracy=${msg.score.accuracy} passed=${msg.score.passed}`);
      break;
    case "intent_verdict":
      console.log(`VERDICT achieved=${msg.verdict.verdict.achieved} confidence=${msg.verdict.verdict.confidence} total=${msg.verdict.total}`);
      console.log(`        reasoning="${msg.verdict.verdict.reasoning}"`);
      break;
    case "fatal_error":
      console.log(`FATAL   code=${msg.code} message="${msg.message}" fallbackToRest=${msg.fallbackToRest}`);
      break;
    case "error":
      console.log(`ERROR   code=${msg.code} message="${msg.message}"`);
      break;
    case "session.begin":
      console.log("session.begin received");
      break;
    default:
      console.log(`event: ${event}`);
  }
});

ws.on("close", (code, reason) => {
  console.log("closed:", code, reason.toString());
  console.log("--- event log ---");
  console.log(events.join("\n"));
  process.exit(0);
});

ws.on("error", (err) => {
  console.error("ws error:", err.message);
  process.exit(1);
});

setTimeout(() => {
  console.error("timeout after 60s");
  process.exit(1);
}, 60_000);