import { Router } from "express";
import { env } from "../config/env.js";
import { uploadAudio } from "../middleware/uploadMulter.js";
import { asyncRoute } from "../middleware/asyncRoute.js";
import { transcribeViaRest } from "../sarvam/stt.js";
import { scoreTranscript } from "../scoring/wordScorer.js";
import { checkLanguage } from "../scoring/languageMatchChecker.js";

export const sttRouter = Router();

sttRouter.post("/", uploadAudio.single("audio"), asyncRoute(async (req, res) => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: "Missing audio file (field name: audio)" });
    return;
  }

  const language = (req.body.language as string) ?? env.targetLanguage;
  const targetPhrase = (req.body.targetPhrase as string) ?? "";

  const result = await transcribeViaRest({
    apiKey: env.sarvaApiKey,
    model: env.sttRestModel,
    languageCode: language,
    audio: file.buffer,
  });

  const response: Record<string, unknown> = {
    transcript: result.transcript,
    languageCode: result.languageCode,
    source: result.source,
  };

  if (targetPhrase) {
    response.score = scoreTranscript(result.transcript, targetPhrase);
    response.languageMatch = checkLanguage(result.transcript, language);
  }

  res.json(response);
}));