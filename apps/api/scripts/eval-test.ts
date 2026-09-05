import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import type { SttMetadata } from "@learn-live/types";
import { runEvaluation, type EvaluationInput } from "../src/evaluation/graph.js";
import { getLevel } from "../src/evaluation/levels.js";

loadEnv({ path: fileURLToPath(new URL("../../../.env", import.meta.url)) });

const apiKey = process.env.SARVAM_API_KEY;
const chatModel = process.env.SARVAM_CHAT_MODEL ?? "sarvam-105b";

const fluencyMeta: SttMetadata = {
  durationMs: 2200,
  wordConfidences: [0.9, 0.85, 0.92, 0.88, 0.95],
  pauseCount: 1,
};

interface Expect {
  gated?: boolean;
  passed?: boolean;
  minTotal?: number;
  maxTotal?: number;
  slots?: Record<string, boolean>;
  intentProduced?: boolean;
}

interface TestCase {
  name: string;
  input: EvaluationInput;
  expect: Expect;
}

function tiffin(round: "guided" | "recall"): { targetPhrase: string; expectedSlots: EvaluationInput["expectedSlots"] } {
  const level = getLevel("tiffin-order-01")!;
  const data = level.rounds[round]!;
  return { targetPhrase: data.targetPhrase, expectedSlots: data.expectedSlots };
}

const t = tiffin("guided");
const tr = tiffin("recall");

const cases: TestCase[] = [
  {
    name: "R1 correct (ta-IN)",
    input: { transcript: "ஒரு வடை தரவும்", targetPhrase: t.targetPhrase, languageCode: "ta-IN", round: "guided", expectedSlots: t.expectedSlots, sttMetadata: fluencyMeta, sttLanguageCode: "ta-IN", apiKey, chatModel },
    expect: { passed: true, minTotal: 0.8, slots: { item: true, quantity: true } },
  },
  {
    name: "R1 wrong item (idli not vadai)",
    input: { transcript: "ஒரு இட்லி தரவும்", targetPhrase: t.targetPhrase, languageCode: "ta-IN", round: "guided", expectedSlots: t.expectedSlots, sttMetadata: fluencyMeta, sttLanguageCode: "ta-IN", apiKey, chatModel },
    expect: { passed: false, slots: { item: false, quantity: true } },
  },
  {
    name: "R1 missing quantity",
    input: { transcript: "வடை தரவும்", targetPhrase: t.targetPhrase, languageCode: "ta-IN", round: "guided", expectedSlots: t.expectedSlots, sttMetadata: fluencyMeta, sttLanguageCode: "ta-IN", apiKey, chatModel },
    expect: { passed: false, slots: { item: true, quantity: false } },
  },
  {
    name: "R1 wrong language → gate (en)",
    input: { transcript: "One vadai please", targetPhrase: t.targetPhrase, languageCode: "ta-IN", round: "guided", expectedSlots: t.expectedSlots, sttMetadata: fluencyMeta, sttLanguageCode: "en-IN", apiKey, chatModel },
    expect: { gated: true, passed: false, maxTotal: 0.01, slots: undefined },
  },
  {
    name: "R1 no STT metadata (fluency neutral)",
    input: { transcript: "ஒரு வடை தரவும்", targetPhrase: t.targetPhrase, languageCode: "ta-IN", round: "guided", expectedSlots: t.expectedSlots, sttLanguageCode: "ta-IN", apiKey, chatModel },
    expect: { passed: true, minTotal: 0.8 },
  },
  {
    name: "R1 auto correct place",
    input: (() => {
      const level = getLevel("auto-booking-01")!;
      const data = level.rounds.guided!;
      return { transcript: "அண்ணா நகர் போக வேண்டும்", targetPhrase: data.targetPhrase, languageCode: level.language, round: "guided" as const, expectedSlots: data.expectedSlots, sttMetadata: fluencyMeta, sttLanguageCode: "ta-IN", apiKey, chatModel };
    })(),
    expect: { passed: true, minTotal: 0.8, slots: { place: true } },
  },
  {
    name: "R2 correct intent (LLM)",
    input: { transcript: "வடை ஒரு வேண்டும்", targetPhrase: tr.targetPhrase, languageCode: "ta-IN", round: "recall", expectedSlots: tr.expectedSlots, sttMetadata: fluencyMeta, sttLanguageCode: "ta-IN", apiKey, chatModel },
    expect: { passed: true, minTotal: 0.7, intentProduced: true, slots: { item: true, quantity: true } },
  },
  {
    name: "R2 wrong intent (LLM)",
    input: { transcript: "நன்றி சொன்னேன்", targetPhrase: tr.targetPhrase, languageCode: "ta-IN", round: "recall", expectedSlots: tr.expectedSlots, sttMetadata: fluencyMeta, sttLanguageCode: "ta-IN", apiKey, chatModel },
    expect: { intentProduced: true, maxTotal: 0.7 },
  },
];

let passCount = 0;
let failCount = 0;

function check(cond: boolean, label: string, detail: string): void {
  if (cond) {
    passCount++;
    console.log(`  ✓ ${label}`);
  } else {
    failCount++;
    console.log(`  ✗ ${label}  (${detail})`);
  }
}

async function runCase(c: TestCase): Promise<void> {
  console.log(`\n== ${c.name} ==`);
  let result;
  try {
    result = await runEvaluation(c.input);
  } catch (err) {
    failCount++;
    console.log(`  ✗ crashed: ${(err as Error).message}`);
    return;
  }

  console.log(`  total=${result.score.total} task=${result.score.taskScore} slots=${result.score.slotAccuracy ?? "n/a"} fluency=${result.score.fluencyScore ?? "n/a"} gated=${result.score.gated} passed=${result.score.passed}`);

  if (c.expect.gated !== undefined) check(result.score.gated === c.expect.gated, `gated=${c.expect.gated}`, `got gated=${result.score.gated}`);
  if (c.expect.passed !== undefined) check(result.score.passed === c.expect.passed, `passed=${c.expect.passed}`, `got passed=${result.score.passed}`);
  if (c.expect.minTotal !== undefined) check(result.score.total >= c.expect.minTotal, `total >= ${c.expect.minTotal}`, `got total=${result.score.total}`);
  if (c.expect.maxTotal !== undefined) check(result.score.total <= c.expect.maxTotal, `total <= ${c.expect.maxTotal}`, `got total=${result.score.total}`);
  if (c.expect.intentProduced !== undefined) check(Boolean(result.intent), "intent produced", `got ${result.intent ? "intent" : "no intent"}`);
  if (c.expect.slots) {
    for (const [key, want] of Object.entries(c.expect.slots)) {
      const match = result.slotMatches?.find((m) => m.key === key);
      check((match?.matched ?? false) === want, `slot ${key}=${want}`, `got ${match?.matched ?? false}`);
    }
  }
}

async function main(): Promise<void> {
  for (const c of cases) {
    if (c.input.round === "recall" && !apiKey) {
      console.log(`\n== ${c.name} == (skipped — no SARVAM_API_KEY)`);
      continue;
    }
    await runCase(c);
  }

  console.log(`\n========================================`);
  console.log(`RESULT: ${passCount} passed, ${failCount} failed`);
  if (failCount > 0) {
    process.exitCode = 1;
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
