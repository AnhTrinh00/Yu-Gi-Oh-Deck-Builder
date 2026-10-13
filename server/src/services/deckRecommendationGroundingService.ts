
import type {
  DeckAnalysisRequest,
} from "../schemas/deckContext.js";

import type {
  DeckRecommendationResponse,
  DeckRecommendation,
} from "../schemas/deckRecommendation.js";

import type {
  DeckRecommendationGroundingResult,
  GroundedDeckRecommendation,
  RecommendationGroundingReason,
} from "../schemas/deckRecommendationGrounding.js";

type DeckCard =
  DeckAnalysisRequest["context"]["cards"][number];

type DeckSection = DeckCard["section"];

function makeKey(
  cardId: number,
  section: DeckSection
): string {
  return `${section}:${cardId}`;
}

export function groundDeckRecommendations(
  context: DeckAnalysisRequest["context"],
  response: DeckRecommendationResponse
): DeckRecommendationGroundingResult {
  const cardsById = new Map<number, DeckCard>();

  const sectionQuantities = new Map<string, number>();

  for (const card of context.cards) {
    cardsById.set(card.id, card);

    const key = makeKey(card.id, card.section);

    sectionQuantities.set(
      key,
      (sectionQuantities.get(key) ?? 0) +
        card.quantity
    );
  }

  function groundOne(
    recommendation: DeckRecommendation
  ): GroundedDeckRecommendation {
    const reasons: RecommendationGroundingReason[] = [];

    const sourceCard = cardsById.get(
      recommendation.cardId
    );

    if (!sourceCard) {
      reasons.push("UNKNOWN_CARD");
    }

    if (
      recommendation.action === "remove" ||
      recommendation.action === "replace"
    ) {
      const available = sectionQuantities.get(
        makeKey(
          recommendation.cardId,
          recommendation.section
        )
      ) ?? 0;

      if (available === 0 && sourceCard) {
        reasons.push("CARD_NOT_IN_SECTION");
      } else if (
        available > 0 &&
        available < recommendation.quantity
      ) {
        reasons.push("INSUFFICIENT_COPIES");
      }
    }

    if (recommendation.action === "replace") {
      const replacementId =
        recommendation.replacementCardId;

      if (replacementId === recommendation.cardId) {
        reasons.push("SAME_CARD");
      }

      if (
        replacementId === undefined ||
        !cardsById.has(replacementId)
      ) {
        reasons.push("UNKNOWN_REPLACEMENT");
      }
    }

    return {
      recommendation,
      status:
        reasons.length === 0
          ? "grounded"
          : "rejected",
      reasons,
    };
  }

  const recommendations =
    response.recommendations.map(groundOne);

  return {
    recommendations,
    groundedCount: recommendations.filter(
      item => item.status === "grounded"
    ).length,
    rejectedCount: recommendations.filter(
      item => item.status === "rejected"
    ).length,
  };
}
