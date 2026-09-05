# Real-Time STT Pipeline Architecture

## Overview

This document describes the end-to-end speech-to-text (STT) pipeline for **Learn Live**, a language-learning game powered by Sarvam AI. The pipeline provides a **low-latency real-time path** (WebSocket relay to Sarvam's realtime STT) and a **robust REST fallback**, both feeding a shared **deterministic + LLM scoring stack**.

---

## High-Level Data Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────────┐
│  Browser / App  │     │  /ws/stt Relay   │     │  Sarvam Real-time STT   │
│  (AudioWorklet) │────▶│  (apps/api)      │────▶│  (saaras:v3-realtime)   │
│  16 kHz mono    │ WS  │  Node/WS         │ WS  │  encoding=linear16      │
│  100 ms chunks  │     │  buffering       │     │  sample_rate=16000      │
└─────────────────┘     └──────────────────┘     └─────────────────────────┘
                              │
                              ▼
                        ┌──────────────────┐
                        │  Scoring Stack   │
                        │  (in-process)    │
                        └──────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
       ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
       │ Word Scorer │ │ Language    │ │ Round       │
       │ (Levenshtein│ │ Match       │ │ Weighting   │
       │ 30% tol.)   │ │ (script)    │ │ (guided/    │
       └─────────────┘ └─────────────┘ │  recall)    │
                                      └─────────────┘
              │               │               │
              └───────────────┼───────────────┘
                              ▼
                        ┌──────────────────┐     ┌─────────────────────────┐
                        │  Intent Judge    │────▶│  Sarvam Chat            │
                        │  (async, LLM)    │     │  (sarvam-105b)          │
                        │  sarvam-105b     │     │  OpenAI-compatible      │
                        └──────────────────┘     └─────────────────────────┘
                              │
                              ▼
                        ┌──────────────────┐
                        │  TurnScore       │
                        │  (weighted blend)│
                        └──────────────────┘
```

**Fallback Path** (triggered on `fatal_error` with `fallbackToRest:true`):
```
Client ──▶ POST /api/stt ──▶ Sarvam REST (/speech-to-text, saaras:v4) ──▶ Deterministic Score
```

---

## Component Details

### 1. Client Audio Capture (`apps/web/public/pcm-worklet.js`)

- **AudioWorkletProcessor** running on audio thread (no main-thread jitter)
- Input: 48 kHz from mic → resampled to **16 kHz mono**
- Output: **Linear16 PCM** frames of **100 ms** (1600 samples = 3200 bytes)
- Base64-encoded per chunk, sent as:
  ```json
  { "event": "audio_input", "audio": "<base64>" }
  ```
- On session end: `{ "event": "end" }`

### 2. WebSocket Relay (`apps/api/src/realtime/relay.ts`)

#### Connection Setup
- Endpoint: `ws://localhost:3001/ws/stt?language=hi-IN&targetPhrase=...&round=guided`
- Parses query params → opens upstream to Sarvam:
  ```
  wss://api.sarvam.ai/speech-to-text-realtime/ws?
    language_code=hi-IN&
    model=saaras:v3-realtime&
    stream_type=fast&
    mode=transcribe&
    endpointing=vad&
    encoding=linear16&
    sample_rate=16000&
    threshold=0.3&
    prefix_padding_ms=300&
    silence_duration_ms=350&
    min_speech_duration_ms=200
  ```
- Auth: `Api-Subscription-Key` header

#### Buffering & Forwarding
- **Pre-connect queue**: chunks arriving before upstream `open` are buffered and flushed on connect
- **Ping timer**: every 20 s sends `{event:"ping"}` to avoid Sarvam's 1008 inactivity close
- **Frame translation** (Sarvam → Client):
  | Sarvam Event | Relayed Event |
  |--------------|---------------|
  | `session.begin` | `session.begin` |
  | `vad.speech_start` | `utterance.start` |
  | `vad.speech_end` | `utterance.end` |
  | `transcript.partial` | `partial` |
  | `transcript.final` | `result` (with score) + async `intent_verdict` |
  | `error` (fatal) | `fatal_error` (with `fallbackToRest`) |
  | `error` (non-fatal) | `error` |

#### Final Transcript Handling (2 s Budget)
On `transcript.final`:
1. **Latency** = `Date.now() - firstChunkTimestamp`
2. **Deterministic score** (`scoreTranscript`) → `result` event (synchronous, in-budget)
3. **Async LLM intent judge** (`judgeIntent`) → `intent_verdict` event (decoupled)

#### Error Mapping
| Upstream Close Code | Meaning | `fallbackToRest` |
|---------------------|---------|------------------|
| 1003 | Rate limit / invalid key | `true` |
| 1008 | Inactivity timeout | `false` |
| 1011 | Sarvam server error | `false` |
| 4000 | Rejected config | `false` |

### 3. Deterministic Scoring (`apps/api/src/scoring/`)

#### `wordScorer.ts` — `scoreTranscript(spoken, target, threshold=0.7, editTolerance=0.3)`
- Normalizes: lowercase → NFC → strip `[.,!?।]` → split on whitespace
- For each target word, finds best Levenshtein match among spoken words
- **Tolerated edit distance** = `ceil(targetWord.length × 0.3)`
- **Accuracy** = `matchedWords / targetWords`
- **Passed** = `accuracy ≥ threshold (0.7)`
- Returns `ScoreResult`: `{ words: WordScore[], accuracy, passed, threshold, transcript, targetPhrase }`

#### `languageMatchChecker.ts` — `checkLanguage(transcript, languageCode)`
- Unicode script ranges for 12 Indian languages (Devanagari, Tamil, Bengali, etc.)
- Ratio of target-script chars vs Latin chars
- **In target language** if ratio ≥ 0.5
- Returns `LanguageMatchResult`: `{ inTargetLanguage, confidence, reason }`

#### `roundWeighting.ts` — `computeTurnScore(score, verdict, languageCode, round)`
- Weights:
  - **Guided**: accuracy 0.5, intent 0.3, language 0.2
  - **Recall**: accuracy 0.3, intent 0.5, language 0.2
- **Intent score** = `verdict.achieved ? verdict.confidence : 0`
- **Language score** = `languageMatch.inTargetLanguage ? languageMatch.confidence : 0`
- Returns `TurnScore` with weighted `total` (0–1) and `breakdown`

### 4. Async Intent Judge (`apps/api/src/scoring/intentScorer.ts`)

#### `judgeIntent(opts: JudgeIntentOptions): Promise<IntentVerdict>`
- Calls Sarvam Chat: `POST https://api.sarvam.ai/v1/chat/completions`
- Model: `sarvam-105b` (configurable via `SARVAM_CHAT_MODEL`)
- Temperature: 0.2, `response_format: { type: "json_object" }`
- System prompt: instructs to judge **communicative intent**, forgive ASR errors
- User prompt: round type + transcript
- Response parsed as JSON:
  ```json
  {
    "achieved": true,
    "confidence": 0.95,
    "reasoning": "short explanation",
    "suggestion": "one improvement hint"
  }
  ```
- Robust parsing: strips code fences, regex fallback for malformed JSON

### 5. REST Endpoints (`apps/api/src/routes/`)

#### `POST /api/stt` (`stt.route.ts`)
- Multipart upload (`audio` field, ≤10 MB, `audio/wav` or `audio/mpeg`)
- Body: `language`, optional `targetPhrase`
- Calls Sarvam REST: `POST https://api.sarvam.ai/speech-to-text` (model `saaras:v4`)
- Returns `NormalizedSttResult` + optional `score` + `languageMatch`

#### `POST /api/score` (`score.route.ts`)
- JSON body: `transcript`, `targetPhrase`, `language`, `round`
- Runs full scoring pipeline (word + LLM intent + weighting)
- Returns full `TurnScore`

---

## Shared Type Contracts (`packages/types/src/`)

### `scoring.ts`
```typescript
type Round = "guided" | "recall";

interface WordScore {
  targetWord: string;
  matched: boolean;
  spokenAs: string;
}

interface ScoreResult {
  accuracy: number;
  passed: boolean;
  threshold: number;
  transcript: string;
  targetPhrase: string;
  words: WordScore[];
}

interface LanguageMatchResult {
  inTargetLanguage: boolean;
  confidence: number;
  reason: string;
}

interface IntentVerdict {
  achieved: boolean;
  confidence: number;
  reasoning: string;
  suggestion: string;
}

interface TurnScore {
  score: ScoreResult;
  languageMatch: LanguageMatchResult;
  verdict: IntentVerdict;
  total: number;
  breakdown: { accuracy: number; intent: number; language: number; };
}
```

### `sarvam.ts`
```typescript
interface NormalizedSttResult {
  transcript: string;
  languageCode: string;
  durationSeconds?: number;
  source: "realtime" | "rest";
}

type RelayEvent =
  | { event: "session.begin" }
  | { event: "utterance.start"; utteranceIdx: number }
  | { event: "utterance.end"; utteranceIdx: number }
  | { event: "partial"; utteranceIdx: number; text: string }
  | { event: "result"; transcript: string; latencyMs: number; score: ScoreResult }
  | { event: "intent_verdict"; verdict: TurnScore }
  | { event: "fatal_error"; code: string; message: string; fallbackToRest?: boolean }
  | { event: "error"; code: string; message: string };
```

---

## Configuration (`apps/api/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `SARVAM_API_KEY` | *(required)* | Subscription key for Sarvam APIs |
| `PORT` | `3001` | HTTP/WS server port |
| `SARVAM_STT_REALTIME_MODEL` | `saaras:v3-realtime` | Realtime WS model (valid: `saaras:v3-realtime`, `saaras:v4`) |
| `SARVAM_STT_REST_MODEL` | `saaras:v4` | REST fallback model |
| `SARVAM_CHAT_MODEL` | `sarvam-105b` | Chat model for intent judging |
| `STT_TARGET_LANGUAGE` | `ta-IN` | Default language |
| `STT_STREAM_TYPE` | `fast` | Sarvam `stream_type` |
| `STT_ENDPOINTING` | `vad` | VAD or manual |
| `STT_ENCODING` | `linear16` | Audio encoding |
| `STT_SAMPLE_RATE` | `16000` | Hz |
| `STT_SILENCE_DURATION_MS` | `350` | VAD silence threshold |
| `STT_MIN_SPEECH_DURATION_MS` | `200` | Min speech duration |
| `STT_THRESHOLD` | `0.3` | ASR confidence threshold |
| `STT_PREFIX_PADDING_MS` | `300` | Prefix padding |

---

## Error Handling & Resilience

| Failure Mode | Behavior |
|--------------|----------|
| Upstream 1003 (rate limit) | `fatal_error` + `fallbackToRest:true` → client switches to REST |
| Upstream 1008/1011/4000 | `fatal_error` + `fallbackToRest:false` |
| Network `fetch failed` (REST) | **Retry once** (500 ms backoff) with cause surfaced |
| LLM intent judge failure | Logged, `error` event sent, `result` already delivered |
| Client disconnect | Upstream closed cleanly, resources released |
| Missing `SARVAM_API_KEY` | Hard failure at boot (explicit error) |

---

## Testing the Pipeline

### Unit / Pure Functions (no network)
```bash
# From repo root
node -e "
const { scoreTranscript } = require('./apps/api/src/scoring/wordScorer.ts');
console.log(scoreTranscript('नमस्ते', 'नमस्ते'));        // accuracy=1
console.log(scoreTranscript('नमस्त', 'नमस्ते'));       // typo tolerated
console.log(scoreTranscript('hello', 'नमस्ते'));       // wrong script
"
```

### REST Endpoints (no audio device)
```bash
# Health
curl http://localhost:3001/healthz

# Full intent scoring
curl -s -X POST http://localhost:3001/api/score \
  -H 'content-type: application/json' \
  -d '{"transcript":"मैं यहाँ पे बैठा हूँ","targetPhrase":"मैं यहाँ पे बैठा हूँ","language":"hi-IN","round":"guided"}'

# STT with file + scoring
curl -s -X POST http://localhost:3001/api/stt \
  -F "audio=@data/test1.wav;type=audio/wav" \
  -F "language=hi-IN" -F "targetPhrase=मैं यहाँ पे बैठा हूँ"
```

### WebSocket (realtime path)

**Quick smoke:**
```bash
echo '{"event":"audio_input","audio":"AAAA"}' | \
  curl -s --max-time 5 -N -d @- 'ws://localhost:3001/ws/stt?language=hi-IN&targetPhrase=test'
```

**Full integration (streams `data/test1.wav`):**
```bash
cd apps/api && TARGET_PHRASE="मैं यहाँ पे बैठा हूँ" pnpm ws-test
```

**Sample output:**
```
session.begin received
partial: मैं
partial: मैं यहाँ पे
partial: मैं यहाँ पे बैठा हुआ हूँ
RESULT  transcript="मैं यहाँ पे बैठा हुआ हूँ..." latency=6180ms accuracy=1 passed=true
VERDICT achieved=true confidence=0.95 total=0.98
```

---

## Why This Architecture Works

| Concern | Solution |
|---------|----------|
| **Latency budget** | Deterministic scoring runs locally on `transcript.final` — no extra round-trip. Only Sarvam STT latency counts. |
| **ASR noise** | Intent judge explicitly told to judge *meaning*, not words. LLM tolerates transcription errors. |
| **Upstream failures** | Explicit close-code mapping + REST fallback with retry. Client gets actionable `fallbackToRest` flag. |
| **Partial feedback** | `partial` events stream in real-time for live captions. |
| **Testability** | Pure scoring functions, REST endpoints, and WS relay all independently testable. |
| **Type safety** | Shared `packages/types` with discriminated unions for every relay event. |
| **Observability** | Structured logging, latency measurement, clear event stream. |

---

## Extending the Pipeline

| Extension Point | How |
|-----------------|-----|
| New language | Add script range to `languageMatchChecker.ts:SCRIPTS` |
| Custom scoring | Replace `scoreTranscript` in `stt.route.ts` / `score.route.ts` |
| Different LLM | Change `SARVAM_CHAT_MODEL` env, adjust prompt in `intentScorer.ts` |
| New round type | Add weight to `ROUND_WEIGHTS` in `roundWeighting.ts` |
| Audio pre-processing | Wrap `AudioWorklet` output before base64 encoding |

---

## Operational Notes

- **Server start**: `SARVAM_API_KEY=... PORT=3001 node apps/api/dist/server.js`
- **Model validation**: Only `saaras:v3-realtime` and `saaras:v4` are valid realtime models (verified against live API)
- **Realtime WS** requires valid key; `/healthz` reports active model
- **Rate limits**: Sarvam realtime returns 1003 → relay signals `fallbackToRest:true`
- **Log format**: JSON with `timestamp`, `level`, `message`, context