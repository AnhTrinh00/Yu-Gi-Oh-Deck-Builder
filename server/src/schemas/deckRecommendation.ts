
import { z } from "zod";

const cardIdSchema = z.number().int().positive();

const deckSectionSchema = z.enum([
  "main",
  "extra",
  "side",
]);

const recommendationSchema = z
  .object({
    action: z.enum([
      "add",
      "remove",
      "replace",
    ]),

    cardId: cardIdSchema,

    section: deckSectionSchema,

    quantity: z.number().int().min(1).max(3),

    replacementCardId: cardIdSchema.optional(),

    reason: z.string().trim().min(1).max(600),

    confidence: z.enum([
      "low",
      "medium",
      "high",
    ]),
  })
  .strict()
  .superRefine((recommendation, ctx) => {
    const isReplacement =
      recommendation.action === "replace";

    if (
      isReplacement &&
      recommendation.replacementCardId === undefined
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          "Replacement recommendations require a replacementCardId.",
        path: ["replacementCardId"],
      });
    }

    if (
      !isReplacement &&
      recommendation.replacementCardId !== undefined
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          "Only replacement recommendations may specify replacementCardId.",
        path: ["replacementCardId"],
      });
    }

    if (
      isReplacement &&
      recommendation.cardId ===
        recommendation.replacementCardId
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          "A card cannot replace itself.",
        path: ["replacementCardId"],
      });
    }
  });

export const deckRecommendationResponseSchema =
  z.object({
    version: z.literal(1),

    summary: z.string().trim().min(1).max(2000),

    recommendations: z
      .array(recommendationSchema)
      .max(20),

    strengths: z.array(
      z.string().trim().min(1).max(300)
    ).max(10),

    weaknesses: z.array(
      z.string().trim().min(1).max(300)
    ).max(10),

    warnings: z.array(
      z.string().trim().min(1).max(300)
    ).max(10),
  }).strict();

export type DeckRecommendationResponse =
  z.infer<typeof deckRecommendationResponseSchema>;

export type DeckRecommendation =
  DeckRecommendationResponse["recommendations"][number];

export function parseDeckRecommendationResponse(
  value: unknown
): DeckRecommendationResponse {
  return deckRecommendationResponseSchema.parse(value);
}
