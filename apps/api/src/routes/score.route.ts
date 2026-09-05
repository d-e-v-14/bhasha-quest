import { Router } from "express";
import type { ExpectedSlot, Round } from "@learn-live/types";
import { env } from "../config/env.js";
import { asyncRoute } from "../middleware/asyncRoute.js";
import { runEvaluation } from "../evaluation/graph.js";

interface ScoreBody {
  transcript?: string;
  targetPhrase?: string;
  language?: string;
  round?: Round;
  expectedSlots?: ExpectedSlot[];
  sttMetadata?: import("@learn-live/types").SttMetadata;
  sttLanguageCode?: string;
  threshold?: number;
}

export const scoreRouter = Router();

scoreRouter.post("/", asyncRoute(async (req, res) => {
  const body = (req.body ?? {}) as ScoreBody;
  const transcript = (body.transcript ?? "").trim();
  const targetPhrase = (body.targetPhrase ?? "").trim();
  const round: Round = body.round === "recall" ? "recall" : "guided";

  if (!transcript || !targetPhrase) {
    res.status(400).json({ error: "transcript and targetPhrase are required" });
    return;
  }

  const result = await runEvaluation({
    transcript,
    targetPhrase,
    languageCode: body.language ?? env.targetLanguage,
    round,
    expectedSlots: body.expectedSlots,
    sttMetadata: body.sttMetadata,
    sttLanguageCode: body.sttLanguageCode,
    apiKey: env.sarvaApiKey,
    chatModel: env.chatModel,
    threshold: body.threshold,
  });

  res.json(result);
}));
