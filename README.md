# Learn Live

**Learn regional languages by living them.**

A browser-based 3D city-exploration game where you learn to *speak* an Indian regional language, not by memorizing flashcards, but by walking up to NPCs and talking to them out loud, powered by [Sarvam AI](https://sarvam.ai).

---

## The problem

India has 22+ officially recognized languages, and most language-learning apps teach vocabulary and grammar in the abstract: flashcards, multiple choice, disconnected sentences. They rarely teach the thing people actually need, which is the confidence to speak out loud, in a real situation, and be understood.

Anyone who has moved to a new Indian city knows the gap directly. You might be able to read a language a little, but you freeze the moment you have to say something to an auto driver, a shopkeeper, or a ticket counter clerk.

Generic speech technology makes this worse. Global speech APIs are tuned for English and other high-resource languages, and they consistently fail on Indic phonetics, accented speech, and code-mixed conversation. A learner who trips over "enga poene?" to an auto driver gets zero useful feedback from software that cannot even hear them correctly.

So the problem is twofold: existing tools do not create real speaking practice, and the ones that try to transcribe Indian languages often cannot do so reliably. Speak is the gap, and Indic-specific AI is the missing foundation.

## The idea

Learn Live drops you into a low-poly recreation of an Indian city, starting with Chennai, where you complete everyday real-life tasks: booking an auto, ordering at a tiffin stall, buying a metro ticket. You complete each task entirely by **speaking the regional language out loud** to NPCs.

There is no dialogue menu. You speak into your microphone, the game listens, scores your attempt, and responds, using Sarvam AI's speech and language models to understand natural, accented, real Indian-language speech.

This turns language learning into **rehearsal for real life**, not memorization. You are not learning abstract grammar rules. You are standing in a virtual auto stand, needing to say a real thing to a real-sounding person, and being tested on it again later without a safety net.

## Profile-Driven NPCs (Personalized NPC Engine)

Every player has a configurable learning profile that the game carries across sessions:

- Target regional language
- Native / preferred language
- Current proficiency level
- Speaking and listening ability
- Areas of weakness
- Previously learned phrases
- Performance history
- Conversation confidence
- Progress through levels

NPC interactions are **dynamically adapted** from this profile. NPCs do not behave identically for every player. Their behavior, difficulty, vocabulary, speaking speed, patience, personality, use of code-switching, and follow-up questions are adjusted to the player's current abilities and previous performance.

A concrete example: a beginner who struggles with numbers encounters an NPC in a shop or at an auto stand who initially speaks more slowly and uses simpler language. As the player improves, NPCs become less predictable, speak more naturally, introduce follow-up questions, use more realistic code-mixed speech, and provide fewer hints.

The whole system is a continuous feedback loop:

```
Player Profile
  -> NPC / Scenario Personalization
  -> Voice Interaction
  -> AI Evaluation
  -> Performance Update
  -> Updated Player Profile
  -> More Adaptive NPCs and Quests
```

The profile is not static, it evolves on every turn. If a player repeatedly struggles with a specific skill, such as prices, directions, listening comprehension, or clarification, future quests and NPC interactions deliberately exercise that weakness. If the player performs consistently well, the system raises the difficulty.

NPC personality is a separate personalization layer. NPCs come with distinct roles and temperaments, such as a friendly shopkeeper, an impatient auto driver, a helpful metro employee, or a conversational local. Their speech speed, vocabulary complexity, patience, and code-switching level vary with the role and with the player.

This is one of the project's key innovations. Conventional language apps and static game NPCs treat every learner the same. Here the game does not simply place the learner inside a 3D world; the world itself adapts to the learner.

## How it plays

Every level is two rounds:

| Round | What's shown | What it tests |
|---|---|---|
| **1. Guided** | Full script, transliteration, translation, target phrase | Reading + speaking the phrase |
| **2. Recall** | Nothing. NPC speaks only via audio, no captions | Listening comprehension + unaided recall |

Round 2 varies the scenario slightly, with a different item, a different price, or a follow-up twist, so you cannot just echo memorized audio. You have to reconstruct the pattern under pressure. Missed phrases get flagged into your **Phrasebook** for spaced-repetition review in later levels.

Each spoken turn is scored on:

- **Correctness**: did the utterance achieve the task's intent?
- **Language match**: was it actually spoken in the target language?
- **Fluency and intelligibility**: proxied through transcription confidence and pacing

## Why Sarvam AI

This game only works because the models behind it are trained specifically for Indian languages and accents. Off-the-shelf global speech APIs consistently fail on Indic phonetics, code-mixed speech, and regional accents, which would break the core loop: if the game cannot understand the player, it cannot teach them.

Sarvam AI is built for exactly this. Its speech models are trained on Indian languages, and its chat model is the first Indic-centric open-weight LLM family built specifically for Indian context and languages. That is the difference between software that hears Tamil, Hindi, and Malayalam like a local, and software that guesses.

## What models we will use

| Sarvam model | Capability | Where we use it |
|---|---|---|
| **Saarika / Saaras** | Speech-to-Text | Transcribing the player's spoken response from the mic |
| **Bulbul v3** | Text-to-Speech | Giving each NPC a natural regional-language voice |
| **Sarvam-M/30B** | Chat Completions | Judging intent in the unscripted Round 2 |
| **Mayura** | Translation + Transliteration | Generating script, transliteration, and translation for the dialogue card |

The choice matters per step of the loop. Saarika/Saaras make the mic input reliable. Mayura pre-fills the regional script and transliteration content so quests are authored fast. Bulbul v3 voices the NPCs so the audio the player hears is natural. And Sarvam-M/30B is what makes the "recall" round possible, because it can judge whether a free-form, unscripted spoken answer actually fulfilled the task's intent.

## Tech stack

**Frontend** (`apps/web`)

- React + TypeScript, bundled with Vite
- Three.js + React Three Fiber for the 3D world
- Tailwind for the HUD and dialogue UI
- Zustand for game state (quests, XP, wallet, phrasebook)
- Browser MediaRecorder API for mic capture

**Backend** (`apps/api`)

- Node and Express, a thin proxy that keeps the Sarvam API key server-side and normalizes Sarvam's response shapes for the frontend

**Shared** (`packages/`)

- `types`: shared TypeScript contracts between frontend and backend
- `game-content`: quest and level data as structured JSON, validated with Zod

**Hosting**

- Single Vercel deployment (static frontend + serverless/Express API routes)