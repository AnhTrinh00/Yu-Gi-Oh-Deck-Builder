import type {
  AIDeckRecommendation,
  AIRecommendationGroundingReason,
} from "../../models/ai/AIDeckRecommendation";

import type {
  RecommendationValidationReason,
  ValidatedDeckRecommendationApiResponse,
} from "../../models/ai/AIDeckRecommendationValidation";

import {
  getRecommendationReasonMessage,
} from "./aiRecommendationReasonService";

export type AIRecommendationDisplayStatus =
  | "accepted"
  | "rejected";

export interface NormalizedAIRecommendation {
  index: number;
  recommendation: AIDeckRecommendation;

  status: AIRecommendationDisplayStatus;

  groundingStatus: "grounded" | "rejected";
  validationStatus: "valid" | "invalid";
  simulationStatus: "applied" | "rejected";

  groundingReasons: AIRecommendationGroundingReason[];
  validationReasons: RecommendationValidationReason[];
  simulationReasons: RecommendationValidationReason[];

  reasonMessages: string[];
}

export interface NormalizedAIRecommendationResult {
  summary: string;
  recommendations: NormalizedAIRecommendation[];

  acceptedCount: number;
  rejectedCount: number;
}

function sameRecommendation(
  first: AIDeckRecommendation,
  second: AIDeckRecommendation
): boolean {
  return (
    first.action === second.action &&
    first.cardId === second.cardId &&
    first.section === second.section &&
    first.quantity === second.quantity &&
    first.replacementCardId ===
      second.replacementCardId &&
    first.reason === second.reason &&
    first.confidence === second.confidence
  );
}

function getGroundingReasonMessage(
  reason: AIRecommendationGroundingReason
): string {
  switch (reason) {
    case "UNKNOWN_CARD":
      return "The card could not be verified.";

    case "CARD_NOT_IN_SECTION":
      return "The card is not in the selected deck section.";

    case "INSUFFICIENT_COPIES":
      return "There are not enough copies in the deck.";

    case "UNKNOWN_REPLACEMENT":
      return "The replacement card could not be verified.";

    case "SAME_CARD":
      return "A card cannot replace itself.";

    case "SECTION_MISMATCH":
      return "The card does not belong in this deck section.";
  }
}

export function normalizeAIRecommendations(
  response: ValidatedDeckRecommendationApiResponse
): NormalizedAIRecommendationResult {
  const {
    analysis,
    grounding,
    validation,
    simulation,
  } = response;

  const total = analysis.recommendations.length;

  if (
    grounding.recommendations.length !== total ||
    validation.recommendations.length !== total ||
    simulation.recommendations.length !== total
  ) {
    throw new Error(
      "AI recommendation results are not aligned."
    );
  }

  const recommendations =
    analysis.recommendations.map(
      (recommendation, index) => {
        const grounded =
          grounding.recommendations[index];

        const validated =
          validation.recommendations[index];

        const simulated =
          simulation.recommendations[index];

        // Verify positional alignment instead of
        // assuming that matching card IDs are enough.
        if (
          !sameRecommendation(
            recommendation,
            grounded.recommendation
          ) ||
          !sameRecommendation(
            recommendation,
            validated.recommendation
          ) ||
          !sameRecommendation(
            recommendation,
            simulated.recommendation
          )
        ) {
          throw new Error(
            `AI recommendation mismatch at index ${index}.`
          );
        }

        const accepted =
          grounded.status === "grounded" &&
          validated.status === "valid" &&
          simulated.status === "applied";

        const reasonMessages = [
          ...grounded.reasons.map(
            getGroundingReasonMessage
          ),
          ...validated.reasons.map(
            getRecommendationReasonMessage
          ),
          ...simulated.reasons.map(
            getRecommendationReasonMessage
          ),
        ];

        return {
          index,
          recommendation,

          status: accepted
            ? ("accepted" as const)
            : ("rejected" as const),

          groundingStatus: grounded.status,
          validationStatus: validated.status,
          simulationStatus: simulated.status,

          groundingReasons: grounded.reasons,
          validationReasons: validated.reasons,
          simulationReasons: simulated.reasons,

          reasonMessages: [
            ...new Set(reasonMessages),
          ],
        };
      }
    );

  return {
    summary: analysis.summary,
    recommendations,

    acceptedCount: recommendations.filter(
      item => item.status === "accepted"
    ).length,

    rejectedCount: recommendations.filter(
      item => item.status === "rejected"
    ).length,
  };
}