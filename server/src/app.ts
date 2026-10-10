
import express from "express";
import cors from "cors";

import type { LLMProvider } from "./services/llmService.js";
import { createAIRouter } from "./routes/aiRoutes.js";

export function createApp(provider: LLMProvider) {
  const app = express();

  app.disable("x-powered-by");

  app.use(
    cors({
      origin:
        process.env.CLIENT_ORIGIN ??
        "http://localhost:5173",
    })
  );

  app.use(express.json({ limit: "32kb" }));

  // Preserve the existing health endpoint.
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      message:
        "Yu-Gi-Oh Deck Builder backend is running",
    });
  });

  // New Phase 4.7 routes.
  app.use(
    "/api/ai",
    createAIRouter(provider)
  );

  return app;
}
