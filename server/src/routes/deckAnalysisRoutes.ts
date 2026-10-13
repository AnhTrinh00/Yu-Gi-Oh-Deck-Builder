
import { Router } from "express";
import rateLimit from "express-rate-limit";

import {
  deckAnalysisRequestSchema,
} from "../schemas/deckContext.js";

export function createDeckAnalysisRouter() {
  const router = Router();

  const limiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 10,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  });

  router.post("/", limiter, (req, res) => {
    const parsed = deckAnalysisRequestSchema.safeParse(
      req.body
    );

    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid deck analysis request.",
      });
      return;
    }

    const { context } = parsed.data;

    // Phase 5.2: validation only.
    // No provider request is made here yet.
    res.status(200).json({
      status: "accepted",
      contextVersion: context.version,
      deckName: context.deckName,
      cardEntries: context.cards.length,
      evidenceIncluded: context.evidence !== undefined,
      aiAnalysisPerformed: false,
    });
  });

  return router;
}
