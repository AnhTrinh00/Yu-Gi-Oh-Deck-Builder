
import express from "express";
import cors from "cors";

import type { LLMProvider } from "./services/llmService.js";
import { createAIRouter } from "./routes/aiRoutes.js";

import {
  errorHandler,
  notFoundHandler,
} from "./middleware/errorHandler.js";

import {
  createDeckAnalysisRouter,
} from "./routes/deckAnalysisRoutes.js";

import type {
  DeckRecommendationProvider,
} from "./services/deckRecommendationService.js";

import {
  createDeckRecommendationRouter,
} from "./routes/deckRecommendationRoutes.js";

export function createApp(
  provider: LLMProvider,
  recommendationProvider?: DeckRecommendationProvider
) {
  const app = express();

  app.disable("x-powered-by");

  app.use(
    cors({
      origin:
        process.env.CLIENT_ORIGIN ??
        "http://localhost:5173",
    })
  );

  app.use(express.json({ limit: "128kb" }));

  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      message:
        "Yu-Gi-Oh Deck Builder backend is running",
    });
  });

  app.use(
    "/api/ai",
    createAIRouter(provider)
  );

  app.use(
    "/api/ai/analyze-deck",
    createDeckAnalysisRouter()
  );

  if (recommendationProvider) {
    app.use(
      "/api/ai/recommend-deck",
      createDeckRecommendationRouter(
        recommendationProvider
      )
    );
  }

  // Must come after all registered routes.
  app.use(notFoundHandler);

  // Express error middleware must be last.
  app.use(errorHandler);

  return app;
}
