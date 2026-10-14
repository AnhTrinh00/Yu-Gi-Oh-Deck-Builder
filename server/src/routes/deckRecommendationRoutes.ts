
import { Router } from "express";
import rateLimit from "express-rate-limit";

import {
  deckAnalysisRequestSchema,
} from "../schemas/deckContext.js";

import {
  generateDeckRecommendations,
  type DeckRecommendationProvider,
} from "../services/deckRecommendationService.js";

export function createDeckRecommendationRouter(
  provider: DeckRecommendationProvider
) {
  const router = Router();

  const limiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 10,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  });

  router.post("/", limiter, async (req, res) => {
    const parsed = deckAnalysisRequestSchema.safeParse(
      req.body
    );

    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid deck recommendation request.",
      });
      return;
    }

    try {
      const result = await generateDeckRecommendations(
        parsed.data,
        provider
      );

      res.status(200).json(result);
    } catch {
      res.status(502).json({
        error: "Unable to generate deck recommendations.",
      });
    }
  });

  return router;
}
