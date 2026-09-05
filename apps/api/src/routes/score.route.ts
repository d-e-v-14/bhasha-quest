import { Router } from "express";
import type { IntentVerdict, ScoreResult } from "@learn-live/types";
import { env } from "../config/env.js";
import { asyncRoute } from "../middleware/asyncRoute.js";
import { scoreTranscript } from "../scoring/wordScorer.js";
import { judgeIntent } from "../scoring/intentScorer.js";
import { computeTurnScore } from "../scoring/roundWeighting.js";

interface ScoreBody {
  transcript?: string;
  targetPhrase?: string;
  language?: string;
  round?: "guided" | "recall";
}

export const scoreRouter = Router();

scoreRouter.post("/", asyncRoute(async (req, res) => {
  const body = (req.body ?? {}) as ScoreBody;
  const transcript = (body.transcript ?? "").trim();
  const targetPhrase = (body.targetPhrase ?? "").trim();
  const language = body.language ?? env.targetLanguage;
  const round = body.round === "recall" ? "recall" : "guided";

  if (!transcript || !targetPhrase) {
    res.status(400).json({ error: "transcript and targetPhrase are required" });
    return;
  }

  const score: ScoreResult = scoreTranscript(transcript, targetPhrase);
  const verdict: IntentVerdict = await judgeIntent({
    apiKey: env.sarvaApiKey,
    model: env.chatModel,
    transcript,
    targetPhrase,
    languageCode: language,
    round,
  });

  res.json(computeTurnScore(score, verdict, language, round));
}));