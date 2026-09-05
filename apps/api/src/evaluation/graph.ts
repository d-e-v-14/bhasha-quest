import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import type {
  CombinedScore,
  ExpectedSlot,
  EvaluationResult,
  FluencyResult,
  IntentVerdict,
  LanguageCheckResult,
  Round,
  ScoreResult,
  SlotMatch,
  SttMetadata,
} from "@learn-live/types";
import { computeCombinedScore, DEFAULT_WEIGHTS, type EvalWeights } from "../scoring/combine.js";
import { computeFluency } from "../scoring/fluency.js";
import { judgeIntent } from "../scoring/intentScorer.js";
import { evaluateLanguageGate } from "../scoring/languageGate.js";
import { matchSlots } from "../scoring/slots.js";
import { scoreTranscript } from "../scoring/wordScorer.js";

const EvalState = Annotation.Root({
  transcript: Annotation<string>,
  targetPhrase: Annotation<string>,
  languageCode: Annotation<string>,
  round: Annotation<Round>,
  expectedSlots: Annotation<ExpectedSlot[]>,
  sttMetadata: Annotation<SttMetadata | undefined>,
  sttLanguageCode: Annotation<string | undefined>,
  apiKey: Annotation<string | undefined>,
  chatModel: Annotation<string | undefined>,
  threshold: Annotation<number>,
  weights: Annotation<EvalWeights>,

  languageCheck: Annotation<LanguageCheckResult | undefined>,
  intent: Annotation<IntentVerdict | undefined>,
  slotMatches: Annotation<SlotMatch[] | undefined>,
  wordScore: Annotation<ScoreResult | undefined>,
  fluency: Annotation<FluencyResult | undefined>,
  score: Annotation<CombinedScore | undefined>,
});

type EvalStateT = typeof EvalState.State;

function routeAfterLanguage(state: EvalStateT): "wrong_language_end" | "fuzzy_match" | "llm_intent_judge" {
  if (!state.languageCheck?.inTargetLanguage) return "wrong_language_end";
  return state.round === "recall" ? "llm_intent_judge" : "fuzzy_match";
}

function routePassed(state: EvalStateT): "pass" | "fail" {
  return state.score?.passed ? "pass" : "fail";
}

function buildGraph() {
  return new StateGraph(EvalState)
    .addNode("language_check", async (state) => {
      const languageCheck = await evaluateLanguageGate({
        transcript: state.transcript,
        targetLanguage: state.languageCode,
        sttLanguageCode: state.sttLanguageCode,
        apiKey: state.apiKey,
        chatModel: state.chatModel,
      });
      return { languageCheck };
    })

    .addNode("wrong_language_end", async (state) => {
      const score: CombinedScore = {
        total: 0,
        taskScore: 0,
        slotAccuracy: null,
        fluencyScore: null,
        passed: false,
        threshold: state.threshold,
        gated: true,
        breakdown: { task: 0, fluency: null, slots: null },
      };
      return { score };
    })

    .addNode("fuzzy_match", async (state) => {
      const wordScore = scoreTranscript(state.transcript, state.targetPhrase);
      const slotMatches = matchSlots(state.transcript, state.expectedSlots);
      return { wordScore, slotMatches };
    })

    .addNode("llm_intent_judge", async (state) => {
      if (!state.apiKey || !state.chatModel) {
        throw new Error("Round 2 (recall) requires apiKey and chatModel for the intent judge");
      }
      const intent = await judgeIntent({
        apiKey: state.apiKey,
        model: state.chatModel,
        transcript: state.transcript,
        targetPhrase: state.targetPhrase,
        languageCode: state.languageCode,
        round: state.round,
        expectedSlots: state.expectedSlots,
      });

      const slotMatches: SlotMatch[] = [];
      for (const s of state.expectedSlots) {
        const truth = intent.slots?.[s.key];
        slotMatches.push({
          key: s.key,
          expected: s.value,
          matched: truth?.matched ?? false,
          spoken: null,
          confidence: truth?.confidence ?? 0,
        });
      }
      if (intent.slots) {
        for (const [key, truth] of Object.entries(intent.slots)) {
          if (!slotMatches.some((m) => m.key === key)) {
            slotMatches.push({ key, expected: key, matched: truth.matched, spoken: null, confidence: truth.confidence });
          }
        }
      }

      return { intent, slotMatches };
    })

    .addNode("score_combine", async (state) => {
      const fluency = computeFluency(state.sttMetadata);
      const score = computeCombinedScore({
        round: state.round,
        wordScore: state.wordScore,
        intent: state.intent,
        slotMatches: state.slotMatches,
        fluency,
        threshold: state.threshold,
        weights: state.weights,
      });
      return { score, fluency };
    })

    .addEdge(START, "language_check")
    .addConditionalEdges("language_check", routeAfterLanguage, {
      wrong_language_end: "wrong_language_end",
      fuzzy_match: "fuzzy_match",
      llm_intent_judge: "llm_intent_judge",
    })
    .addEdge("fuzzy_match", "score_combine")
    .addEdge("llm_intent_judge", "score_combine")
    .addEdge("wrong_language_end", END)
    .addConditionalEdges("score_combine", routePassed, { pass: END, fail: END })
    .compile();
}

let compiledGraph: ReturnType<typeof buildGraph> | undefined;

function getGraph(): ReturnType<typeof buildGraph> {
  if (!compiledGraph) compiledGraph = buildGraph();
  return compiledGraph;
}

export interface EvaluationInput {
  transcript: string;
  targetPhrase: string;
  languageCode: string;
  round: Round;
  expectedSlots?: ExpectedSlot[];
  sttMetadata?: SttMetadata;
  sttLanguageCode?: string;
  apiKey?: string;
  chatModel?: string;
  threshold?: number;
  weights?: EvalWeights;
}

export async function runEvaluation(input: EvaluationInput): Promise<EvaluationResult> {
  const graph = getGraph();
  const state = (await graph.invoke({
    transcript: input.transcript,
    targetPhrase: input.targetPhrase,
    languageCode: input.languageCode,
    round: input.round,
    expectedSlots: input.expectedSlots ?? [],
    sttMetadata: input.sttMetadata,
    sttLanguageCode: input.sttLanguageCode,
    apiKey: input.apiKey,
    chatModel: input.chatModel,
    threshold: input.threshold ?? 0.7,
    weights: input.weights ?? DEFAULT_WEIGHTS,
  })) as EvalStateT;

  return {
    transcript: state.transcript,
    targetPhrase: state.targetPhrase,
    languageCode: state.languageCode,
    round: state.round,
    languageCheck: state.languageCheck!,
    intent: state.intent,
    slotMatches: state.slotMatches,
    wordScore: state.wordScore,
    fluency: state.fluency,
    score: state.score!,
  };
}
