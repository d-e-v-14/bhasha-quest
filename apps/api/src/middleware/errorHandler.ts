import type { NextFunction, Request, Response } from "express";
import { logger } from "../utils/logger.js";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  const error = err instanceof Error ? err : new Error(String(err));
  void error;
  const message = err instanceof Error ? err.message : String(err);
  logger.error(message, { stack: err instanceof Error ? err.stack : undefined });
  res.status(400).json({ error: message });
}