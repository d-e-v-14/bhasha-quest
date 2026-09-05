# Learn Live

**Not a game that teaches language. A personalized world that teaches you how to communicate.**

Learn Live is a **personalized simulation of real-world communication**, not an AI language-learning game. It drops a browser into a low-poly Indian city where everyday situations actually happen, and every interaction in it is generated around one learner: you.

Powered by [Sarvam AI](https://sarvam.ai) for Indian-language speech, transcription, and evaluation.

---

## The problem

Most language-learning tools teach you to recall words and reproduce sentences. They test whether you can match a flashcard, pick the right option, or greet out loud. None of that prepares you for the moment the situation actually changes: the auto driver quotes a different price, the shopkeeper misunderstands you, or someone speaks faster than you expected.

That is where learners freeze. Reading a language a little does not help when you need to negotiate a fare in real time, ask for clarification, or rephrase under pressure.

Generic speech technology makes this worse. Global speech APIs are tuned for high-resource languages and consistently fail on Indic phonetics, accented speech, and the code-mixed speech that is normal in Indian cities. A learner who trips over a phrase to a Chennai auto driver gets no useful feedback from software that cannot hear them correctly.

So the problem is twofold: existing tools practice the wrong skill (recall, not communication), and the ones that try often cannot even understand Indian-language speech reliably.

## The product

Every learner gets a different world, because every learner has a different communication profile.

Learn Live is a **personalized conversational simulation engine**. The system maintains a persistent **Player Communication Profile** containing:

- Target language
- Native / preferred language
- Proficiency level
- Speaking ability
- Listening ability
- Vocabulary knowledge
- Recurring mistakes
- Weak conversational skills
- Confidence
- Previously mastered situations
- Previously failed situations
- Preferred difficulty

NPCs are not static characters with predefined dialogue trees. They are **adaptive conversational agents** whose behavior is generated and configured according to the player's evolving profile. The 3D environment is the interface that makes these simulations immersive and memorable. The simulation itself, how it adapts to a specific learner, is the product.

## The core loop

Every interaction runs a continuous, closed loop:

```
PLAYER PROFILE
  -> PERSONALIZED SCENARIO
  -> ADAPTIVE NPC
  -> NATURAL VOICE CONVERSATION
  -> AI EVALUATION
  -> SKILL/WEAKNESS UPDATE
  -> UPDATED PLAYER PROFILE
  -> NEXT INTERACTION ADAPTS
```

You speak out loud into your microphone, with no dialogue menu. Sarvam AI hears you, the system evaluates the exchange, updates your profile, and the next scenario is built from that updated profile.

## Adaptive NPCs

Each NPC is an adaptive conversational agent with its own:

- Personality
- Occupation
- Communication style
- Patience
- Speech speed
- Vocabulary complexity
- Regional language characteristics
- Code-switching behavior
- Willingness to repeat or rephrase
- Difficulty level

The NPC decides how to communicate based on **both** its own personality **and** the learner's current communication profile.

- A learner who struggles with listening initially meets a patient shopkeeper who speaks clearly and allows clarification.
- A learner who has mastered basic conversations meets a faster, less predictable shopkeeper who changes the request, asks follow-up questions, or uses natural code-mixed speech.
- A learner who repeatedly struggles with prices encounters future situations that naturally require handling prices, negotiation, numbers, or clarification.

The system does **not** simply increase a numerical "difficulty level". It identifies what the learner can and cannot currently do, and constructs the next interactions around those capabilities.

## Learning progression

The Guided and Recall structure is not game levels. It is part of the personalized learning engine, a progression the learner moves through as their profile improves.

- **Guided exposure**: the system provides contextual support appropriate to the learner's current ability.
- **Controlled practice**: the NPC interacts naturally while staying within the learner's current capability.
- **Adaptive recall**: the learner meets the same underlying communication skill in a different situation, with reduced assistance.
- **Open interaction**: the NPC becomes less predictable and the system evaluates whether the learner can independently accomplish the real-world goal.

The learning objective is not "Can the player reproduce the correct sentence?" It is **"Can the player successfully communicate an intention when the situation changes?"**

## What gets evaluated

The system evaluates communication at multiple levels:

- Intent
- Task completion
- Language choice
- Listening comprehension
- Response appropriateness
- Fluency and intelligibility
- Ability to recover from misunderstandings

## Communication recovery

Real conversations are not perfect scripted exchanges. People misunderstand each other, ask for clarification, change their request, speak differently, or introduce unexpected information. **Communication recovery** is a core learning objective: the learner must be able to recover from conversational failures.

```
NPC asks something unexpected
  -> learner misunderstands
  -> learner asks for clarification
  -> NPC responds differently
  -> learner rephrases
  -> task continues
```

Surviving and repairing a real exchange is the skill. Repeating a memorized line is not.

## The world as a learning model

The environment is not the product itself. The environment provides realistic context in which communication skills are tested. One underlying communication skill can therefore appear across many contexts.

For example, the skill **"asking for a price"** can show up as:

- Buying food at a stall
- Negotiating an auto fare
- Shopping at a market
- Buying a metro ticket

Because the same skill reappears in different contexts, the learner cannot pass by memorizing individual dialogues. They must have actually acquired the transferable communication skill.

## Why this is different

1. **Profile-driven interactions**: every scenario is generated from the learner's communication profile.
2. **Adaptive NPC behavior**: NPCs calibrate language, pacing, and personality per learner, not per script.
3. **Persistent learner memory**: the profile carries mistakes, mastered situations, and confidence across sessions.
4. **Skill-based scenario generation**: scenarios are built around weak skills, not a fixed level list.
5. **Communication recovery**: learners are trained and assessed on repairing misunderstandings.
6. **Transfer learning across contexts**: the same skill is retested in new situations to prevent dialogue memorization.
7. **Guided to Recall to Adaptive to Open progression**: support is removed as capability grows.
8. **Indian-language speech and code-switching**: handled natively through Sarvam AI.

A concrete example: two players can enter the exact same location and receive completely different interactions, because their communication profiles differ.

- Player A struggles with numbers: the NPC naturally creates a price or quantity interaction.
- Player B struggles with listening: the NPC uses a different conversational challenge.
- Player C has mastered both: the NPC introduces an unexpected follow-up and removes assistance.

There is no single fixed "correct gameplay path". The learner's behavior shapes what happens next.

## Why Sarvam AI

This system only works because the models behind it are trained specifically for Indian languages and accents. Off-the-shelf global speech APIs consistently fail on Indic phonetics, code-mixed speech, and regional accents, which would break the core loop: if the system cannot understand the player, it cannot adapt to them.

Sarvam AI is built for exactly this. Its speech models are trained on Indian languages, and its chat model is an Indic-centric open-weight LLM family built for Indian context and languages. That is the difference between software that hears Tamil, Hindi, and Malayalam like a local, and software that guesses.

## What models we will use

| Sarvam model | Capability | Where we use it |
|---|---|---|
| **Saarika / Saaras** | Speech-to-Text | Transcribing the player's spoken response from the mic |
| **Bulbul v3** | Text-to-Speech | Giving each NPC a natural regional-language voice |
| **Sarvam-M/30B** | Chat Completions | Judging intent and generating adaptive NPC behavior |
| **Mayura** | Translation + Transliteration | Generating script, transliteration, and translation for dialogue support |

The choice matters per step of the loop. Saarika/Saaras make the mic input reliable. Mayura pre-fills regional script and transliteration so content is authored fast. Bulbul v3 voices the NPCs so the audio the player hears is natural. And Sarvam-M/30B is what makes adaptive NPCs possible: it judges whether a free-form, unscripted spoken answer fulfilled the task's intent, and it drives the unscripted follow-ups that open interaction demands.

## Tech stack

**Frontend** (`apps/web`)

- React + TypeScript, bundled with Vite
- Three.js + React Three Fiber for the 3D world
- Tailwind for the HUD and dialogue UI
- Zustand for game state (profile, session progress, phrasebook)
- Browser MediaRecorder API for mic capture

**Backend** (`apps/api`)

- Node and Express, a thin proxy that keeps the Sarvam API key server-side and normalizes Sarvam's response shapes for the frontend

**Shared** (`packages/`)

- `types`: shared TypeScript contracts between frontend and backend
- `game-content`: scenario and NPC data as structured JSON, validated with Zod

**Hosting**

- Single Vercel deployment (static frontend + serverless/Express API routes)