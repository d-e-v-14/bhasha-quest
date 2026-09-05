import http from "node:http";
import express, { type Express } from "express";
import { WebSocketServer } from "ws";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { corsMiddleware } from "./middleware/cors.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { sttRouter } from "./routes/stt.route.js";
import { scoreRouter } from "./routes/score.route.js";
import { attachRealtimeRelay } from "./realtime/relay.js";

export function createServer(): { app: Express; server: http.Server; wss: WebSocketServer } {
  const app = express();
  app.disable("x-powered-by");
  app.use(corsMiddleware);
  app.use(express.json({ limit: "1mb" }));

  app.get("/healthz", (_req, res) => {
    res.json({ ok: true, model: env.sttRealtimeModel });
  });

  app.use("/api/stt", sttRouter);
  app.use("/api/score", scoreRouter);

  app.use(errorHandler);

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: "/ws/stt" });
  attachRealtimeRelay(wss);

  return { app, server, wss };
}

const isEntry = Boolean(process.argv[1]) && /server\.(ts|js)$/.test(process.argv[1] ?? "");
if (isEntry) {
  const { server } = createServer();
  server.listen(env.port, () => {
    logger.info(`Learn Live API listening on :${env.port}`);
    logger.info(`Realtime STT relay on /ws/stt (${env.sttRealtimeModel}, stream_type=${env.streamType})`);
  });
}