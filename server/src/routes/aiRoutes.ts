
import { Router } from "express";
import rateLimit from "express-rate-limit";

import {
  analysisRequestSchema,
  analysisResponseSchema,
} from "../schemas/analysis.js";

import {
  validateGroundedAnalysis,
} from "../services/analysisValidationService.js";

import type {
  LLMProvider,
} from "../services/llmService.js";
import { error } from "node:console";

export function createAIRouter(
  provider: LLMProvider
) {
  const router = Router();

  const limiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 10,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  });

  router.post(
    "/analyze-combos",
    limiter,
    async (req, res) => {
      const parsed =
        analysisRequestSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          error: "Invalid analysis request.",
        });
        return;
      }

      const analysisRequest = parsed.data;

      const ids = analysisRequest.combos.map(
        combo => combo.id
      );

      if (new Set(ids).size !== ids.length) {
        res.status(400).json({
          error: "Duplicate combo IDs.",
        });
        return;
      }

      try {
        const rawAnalysis = await provider.analyze(
          analysisRequest
        );

        const validated =
          analysisResponseSchema.safeParse(
            rawAnalysis
          );

        if (!validated.success) {
          res.status(502).json({
            error: "Invalid AI analysis response.",
          });
          return;
        }

        const analysis = validated.data;

        const groundingErrors =
          validateGroundedAnalysis(
            analysisRequest,
            analysis
          );

        if (groundingErrors.length > 0) {
          res.status(502).json({
            error:
              "AI analysis failed grounding checks.",
          });
          return;
        }

        res.status(200).json({
          analysis,
          source:
            "client-supplied-combo-evidence",
          rulesVerified: false,
        });
      } catch (error: unknown) {
        console.error(
          "[Gemini Combo Analysis Error]",
          error
        );

        if (error instanceof Error) {
          console.error("Error name:", error.name);
          console.error("Error message:", error.message);
        }

        return res.status(502).json({
          error: "AI analysis failed. Check server logs.",
        });
      }
    }
  );

  return router;
}
