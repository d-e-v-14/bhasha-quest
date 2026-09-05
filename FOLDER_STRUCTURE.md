# Learn Live — Full Project Structure

A pnpm monorepo for a 3D city-exploration language-learning game powered by Sarvam AI.

This document is the reference for where every piece of the system lives and why. Read it top to bottom once, then use it as a lookup table while building.

---

## Top-level layout

```
learn-live/
├── apps/
│   ├── web/                    # Frontend — game client
│   └── api/                    # Backend — Sarvam proxy + game logic
├── packages/
│   ├── types/                  # Shared TypeScript types
│   ├── game-content/           # Quest/level data + schema
│   └── config/                 # Shared lint/tsconfig (optional)
├── docs/                       # Architecture & contract docs
├── .github/workflows/          # CI (optional)
├── pnpm-workspace.yaml
├── package.json
├── turbo.json                  # optional
├── vercel.json
├── .gitignore
└── README.md
```

**Why this shape:** `apps/*` are things that run (a server, a client). `packages/*` are things that get imported by apps but never run on their own. Nothing in `packages/game-content` or `packages/types` should import from `apps/web` or `apps/api` — dependencies only flow one direction, apps depend on packages, never the reverse. This is what keeps a hackathon monorepo from turning into spaghetti by hour 20.

---

## `apps/web/` — Frontend (game client)

```
apps/web/
├── public/
│   ├── models/                 # .glb/.gltf assets: buildings, NPCs, props
│   ├── textures/                # low-poly texture atlases
│   ├── audio/                   # ambient city sound, SFX (footsteps, coin, ding)
│   └── fonts/                   # regional script webfonts (Tamil, Devanagari, etc.)
│
├── src/
│   ├── main.tsx                 # React root, mounts <App/>
│   ├── App.tsx                  # Top-level layout: Canvas + HUD overlay
│   │
│   ├── scenes/                  # Three.js / R3F world
│   │   ├── CityScene.tsx        # Root scene graph, ties world pieces together
│   │   ├── Lighting.tsx         # Ambient + directional light rig
│   │   ├── Ground.tsx           # Terrain/road plane, collision mesh
│   │   └── PostProcessing.tsx   # Optional bloom/AO (skip if time-constrained)
│   │
│   ├── entities/                # In-world actors and objects
│   │   ├── Player.tsx           # Player mesh + camera rig
│   │   ├── PlayerController.ts  # Keyboard/touch input → movement vector
│   │   ├── NPC.tsx              # Single NPC: mesh, idle anim, label
│   │   ├── NPCManager.tsx       # Spawns NPCs from level data, tracks state
│   │   └── InteractionZone.tsx  # Proximity trigger that opens DialogueCard
│   │
│   ├── components/              # DOM/UI layer (sits on top of the canvas)
│   │   ├── Hud/
│   │   │   ├── Hud.tsx
│   │   │   ├── WalletDisplay.tsx    # ₹ balance
│   │   │   ├── XpBar.tsx
│   │   │   ├── QuestLog.tsx         # Active quest list
│   │   │   └── Minimap.tsx
│   │   │
│   │   ├── DialogueCard/            # The core interaction — see proposal §3
│   │   │   ├── DialogueCard.tsx     # Modal container, orchestrates a turn
│   │   │   ├── NpcLineDisplay.tsx   # Script + transliteration + translation (Round 1 only)
│   │   │   ├── MicButton.tsx        # Hold-to-record control
│   │   │   ├── TranscriptFeedback.tsx  # Live transcript, word-level highlight
│   │   │   ├── ScoreReveal.tsx      # Points, correctness breakdown
│   │   │   └── RoundIndicator.tsx   # "Round 1: Guided" / "Round 2: Recall"
│   │   │
│   │   ├── Phrasebook/
│   │   │   ├── PhrasebookPanel.tsx  # List of learned + missed phrases
│   │   │   └── PhraseCard.tsx
│   │   │
│   │   └── shared/                  # Buttons, modals, spinners, toasts
│   │
│   ├── hooks/
│   │   ├── useMicRecorder.ts    # Wraps MediaRecorder API, returns blob + state
│   │   ├── useProximity.ts      # Distance check, fires interaction trigger
│   │   ├── useQuest.ts          # Reads/advances active quest from store
│   │   └── useAudioPlayback.ts  # Plays back Bulbul-generated NPC audio
│   │
│   ├── store/                   # Zustand — see proposal §6
│   │   ├── gameStore.ts         # xp, wallet, streak
│   │   ├── questStore.ts        # active/completed quests
│   │   ├── phrasebookStore.ts   # saved + missed phrases for spaced repetition
│   │   └── dialogueStore.ts     # current conversation state machine (idle → listening → scoring → result)
│   │
│   ├── lib/
│   │   ├── api.ts               # Typed fetch client → apps/api endpoints
│   │   ├── audioUtils.ts        # Blob/encoding helpers (webm→wav if needed)
│   │   └── constants.ts
│   │
│   ├── types/                   # Local UI-only types (re-exports packages/types)
│   └── styles/
│       └── globals.css          # Tailwind base
│
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

**Dialogue state machine (lives in `dialogueStore.ts`):**
`idle → npcSpeaking → listening → transcribing → scoring → resultShown → (advance to Round 2 or next quest)`

Every DialogueCard subcomponent reads from this single state — it's what keeps the mic button, transcript display, and score reveal in sync without prop-drilling.

---

## `apps/api/` — Backend (Sarvam proxy + game logic)

```
apps/api/
├── src/
│   ├── server.ts                # Express app entry, mounts routes
│   │
│   ├── routes/                  # HTTP surface — thin, no business logic
│   │   ├── stt.route.ts         # POST /stt        — audio in, transcript out
│   │   ├── tts.route.ts         # POST /tts        — text in, audio out
│   │   ├── score.route.ts       # POST /score      — transcript + goal in, verdict out
│   │   ├── translate.route.ts   # POST /translate  — text + lang in, script/translit/translation out
│   │   └── content.route.ts     # GET  /levels/:id — serves quest JSON (optional, can be static)
│   │
│   ├── sarvam/                  # AI integration layer — talks to api.sarvam.ai directly
│   │   ├── client.ts            # Base fetch wrapper: base URL, auth header, error handling
│   │   ├── stt.ts               # Saaras/Saarika calls, normalizes multipart response
│   │   ├── tts.ts               # Bulbul v3 calls, unwraps base64 audios[] array
│   │   ├── chat.ts              # Sarvam-M/30B chat completions — used for Round 2 intent judging
│   │   ├── translate.ts         # Mayura / Sarvam-Translate calls
│   │   └── types.ts             # Raw Sarvam response shapes (as documented by Sarvam, not yours)
│   │
│   ├── scoring/                 # Game-specific logic — separate from raw AI calls on purpose
│   │   ├── intentScorer.ts      # Builds the judging prompt, calls chat.ts, parses structured JSON back
│   │   ├── languageMatchChecker.ts  # Confirms the utterance was actually in the target language
│   │   └── roundWeighting.ts    # Applies Round 1 vs Round 2 score weighting — see proposal §4
│   │
│   ├── middleware/
│   │   ├── cors.ts
│   │   ├── errorHandler.ts
│   │   └── uploadMulter.ts      # Handles multipart audio upload for /stt
│   │
│   ├── config/
│   │   └── env.ts               # Validates required env vars at boot (fail fast, not at request time)
│   │
│   └── utils/
│       └── logger.ts
│
├── .env.example                 # SARVAM_API_KEY=, PORT=
├── tsconfig.json
└── package.json
```

**Why `sarvam/` and `scoring/` are separate folders:** `sarvam/*` files know nothing about your game — they're a clean, reusable client for Sarvam's API and would be identical in a totally different app. `scoring/*` files know nothing about HTTP — they take a transcript and a task goal and return a verdict. This split means you can unit-test scoring logic without mocking network calls, and swap/upgrade Sarvam model versions without touching game rules.

**Response normalization matters here specifically:** Sarvam's STT returns `transcript`/`diarized_transcript` fields and TTS returns base64 inside a JSON `audios[]` array — neither matches typical REST conventions. `sarvam/stt.ts` and `sarvam/tts.ts` are the one place that translation happens, so every route and every frontend call sees a consistent shape.

---

## `packages/types/` — Shared types

```
packages/types/
├── src/
│   ├── quest.ts        # Quest, DialogueTurn, Round ("guided" | "recall")
│   ├── scoring.ts       # ScoreResult, IntentMatch, LanguageMatchResult
│   ├── sarvam.ts        # Normalized (not raw) STT/TTS/Chat response types
│   └── index.ts         # Barrel export
└── package.json
```

Imported by both `apps/web` and `apps/api` as `@learn-live/types` via the pnpm workspace protocol. This is the actual payoff of using a monorepo: a `ScoreResult` field can't silently drift between what the backend sends and what the frontend expects, because both sides import the same file.

---

## `packages/game-content/` — Levels, quests, scenario data

```
packages/game-content/
├── schema/
│   └── quest.schema.ts          # Zod schema — validates every level JSON at load/build time
│
├── levels/
│   └── chennai/
│       ├── auto-booking.json
│       ├── tiffin-order.json
│       └── metro-ticket.json
│   └── index.ts                 # Level registry — imports and exposes all levels by id
│
├── scripts/
│   └── generateTransliteration.ts  # One-off script: calls Sarvam Mayura to pre-fill
│                                     # script/transliteration/translation for a draft quest,
│                                     # so you hand-correct instead of hand-write
└── package.json
```

**Shape of one quest JSON** (matches `quest.schema.ts`):

```json
{
  "id": "auto-booking-01",
  "city": "chennai",
  "language": "ta-IN",
  "npc": { "name": "Anbu", "voice": "meera" },
  "rounds": {
    "guided": {
      "npcLine": { "script": "...", "transliteration": "...", "translation": "..." },
      "targetPhrase": { "script": "...", "transliteration": "...", "translation": "..." }
    },
    "recall": {
      "variant": "different destination, follow-up haggling twist",
      "npcAudioOnly": true
    }
  },
  "scoringWeights": { "guided": 0.35, "recall": 0.65 }
}
```

Content is authored here once and consumed identically by both the 3D world (which NPC to spawn where) and the DialogueCard (what to show/say). Keeping it as data, not code, is what let the original proposal skip a database entirely for hackathon scope.

---

## `packages/config/` — Shared tooling (optional bonus)

```
packages/config/
├── eslint-preset.js
└── tsconfig.base.json
```

Only worth building if you have time left after the core loop works — saves duplicating lint/tsconfig across `apps/web` and `apps/api`, but isn't load-bearing for the demo.

---

## `docs/` — Project documentation

```
docs/
├── ARCHITECTURE.md        # System diagram + explanation (data flow, why the proxy exists)
├── API_CONTRACTS.md       # Request/response shape for every /stt, /tts, /score, /translate route
└── CONTENT_AUTHORING.md   # How to write a new quest JSON, run generateTransliteration.ts
```

Keep these thin during the hackathon — a judge or teammate should be able to read `ARCHITECTURE.md` in two minutes and understand the whole system without reading code.

---

## Root-level files

```
learn-live/
├── pnpm-workspace.yaml     # packages: ["apps/*", "packages/*"]
├── package.json            # root scripts: dev, build, lint
├── turbo.json              # optional — only if you want cached parallel builds
├── vercel.json             # routes /api/* to apps/api, everything else to apps/web build
├── .gitignore
└── README.md               # setup instructions: pnpm install && pnpm dev
```

**Root `package.json` scripts (minimum viable):**
```json
{
  "scripts": {
    "dev": "pnpm -r --parallel dev",
    "build": "pnpm -r build",
    "lint": "pnpm -r lint"
  }
}
```

---

## How the pieces connect (quick trace)

1. Player walks near an NPC → `InteractionZone.tsx` fires → `dialogueStore` moves to `npcSpeaking`.
2. `NpcLineDisplay.tsx` reads the quest's guided-round data straight from `packages/game-content`.
3. Player holds `MicButton.tsx` → `useMicRecorder.ts` captures a blob.
4. `lib/api.ts` POSTs the blob to `apps/api`'s `/stt` route.
5. `routes/stt.route.ts` → `sarvam/stt.ts` → Sarvam Saaras/Saarika → normalized transcript back to the client.
6. On Round 2, the transcript also goes to `/score` → `scoring/intentScorer.ts` → `sarvam/chat.ts` → verdict.
7. `ScoreReveal.tsx` shows the result; missed phrases get written into `phrasebookStore.ts`.
8. NPC's spoken reply is fetched from `/tts` → `sarvam/tts.ts` → played via `useAudioPlayback.ts`.

Every arrow in that trace is a boundary between two of the folders above — which is exactly what makes each piece independently buildable and testable during a time crunch.
