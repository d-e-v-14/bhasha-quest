import cors from "cors";

export const corsMiddleware = cors({
  origin: true,
  methods: ["GET", "POST", "OPTIONS"],
});