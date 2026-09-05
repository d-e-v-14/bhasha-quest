import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { runEvaluation } from "../src/evaluation/graph.js";
import { getLevel } from "../src/evaluation/levels.js";

loadEnv({ path: fileURLToPath(new URL("../../../.env", import.meta.url)) });

const apiKey = process.env.SARVAM_API_KEY;
const chatModel = process.env.SARVAM_CHAT_MODEL ?? "sarvam-105b";

const fluencyMeta = {
  durationMs: 2200,
  wordConfidences: [0.9, 0.85, 0.92, 0.88, 0.95],
  pauseCount: 1,
};

const cases = [
  {
    name: "R1 tiffin — correct",
    level: "tiffin-order-01",
    round: "guided" as const,
    transcript: "ஒரு வடை தரவும்",
    sttLanguageCode: "ta-IN",
  },
  {
    name: "R1 tiffin — wrong item",
    level: "tiffin-order-01",
    round: "guided" as const,
    transcript: "ஒரு இட்லி தரவும்",
    sttLanguageCode: "ta-IN",
  },
  {
    name: "R1 tiffin — wrong language (gate)",
    level: "tiffin-order-01",
    round: "guided" as const,
    transcript: "One vadai please",
    sttLanguageCode: "en-IN",
  },
  {
    name: "R1 auto — correct place",
    level: "auto-booking-01",
    round: "guided" as const,
    transcript: "அண்ணா நகர் போக வேண்டும்",
    sttLanguageCode: "ta-IN",
  },
];

async function runCase(name: string, input: Parameters<typeof runEvaluation>[0]): Promise<void> {
  try {
    const result = await runEvaluation(input);
    console.log(`\n=== ${name} ===`);
    console.log("languageCheck:", result.languageCheck);
    console.log("wordScore.accuracy:", result.wordScore?.accuracy ?? null);
    console.log("slotMatches:", result.slotMatches);
    if (result.intent) console.log("intent:", result.intent);
    console.log("score:", result.score);
  } catch (err) {
    console.log(`\n=== ${name} ===`);
    console.log("ERROR:", (err as Error).message);
  }
}

async function main(): Promise<void> {
  for (const c of cases) {
    const level = getLevel(c.level)!;
    const roundData = level.rounds[c.round]!;
    await runCase(c.name, {
      transcript: c.transcript,
      targetPhrase: roundData.targetPhrase,
      languageCode: level.language,
      round: c.round,
      expectedSlots: roundData.expectedSlots,
      sttMetadata: fluencyMeta,
      sttLanguageCode: c.sttLanguageCode,
      apiKey,
      chatModel,
    });
  }

  if (apiKey) {
    const level = getLevel("tiffin-order-01")!;
    const roundData = level.rounds.recall!;
    await runCase("R2 tiffin — LLM intent judge", {
      transcript: "வடை ஒரு வேண்டும்",
      targetPhrase: roundData.targetPhrase,
      languageCode: level.language,
      round: "recall",
      expectedSlots: roundData.expectedSlots,
      sttMetadata: fluencyMeta,
      sttLanguageCode: "ta-IN",
      apiKey,
      chatModel,
    });
  } else {
    console.log("\n(skipping R2 LLM case — set SARVAM_API_KEY to run it)");
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
