import type {
  DeckAnalysisRequest,
} from "../schemas/deckContext.js";

import type {
  DeckRecommendationGroundingResult,
} from "../schemas/deckRecommendationGrounding.js";

import type {
  DeckRecommendationValidationResult,
  RecommendationValidationReason,
} from "../schemas/deckRecommendationValidation.js";

import {
  canPlaceCardInSection,
} from "./deckCardPlacementService.js";

import {
  validateCardCopyLimit,
} from "./deckRecommendationCopyLimitService.js";

export function validateDeckRecommendations(
  context: DeckAnalysisRequest["context"],
  grounding: DeckRecommendationGroundingResult
): DeckRecommendationValidationResult {
  // 1. Identify known cards
  const deckCardIds = new Set(
    context.cards.map(card => card.id)
  );

  const collectionCardIds = new Set(
    (context.availableCollectionCards ?? []).map(
      card => card.id
    )
  );

  const knownCardIds = new Set([
    ...deckCardIds,
    ...collectionCardIds,
  ]);

  // 2. Build card type lookup
  const cardTypes = new Map<number, string>();

  for (const card of context.cards) {
    cardTypes.set(card.id, card.type);
  }

  for (const card of context.availableCollectionCards ?? []) {
    cardTypes.set(card.id, card.type);
  }

  // 3. Build available ownership lookup
  const availableCopies = new Map<number, number>();

  for (const card of context.availableCollectionCards ?? []) {
    availableCopies.set(
      card.id,
      card.availableQuantity
    );
  }

  // 4. Build deck quantity lookup
  const deckQuantities = new Map<string, number>();

  for (const card of context.cards) {
    const key = `${card.section}:${card.id}`;

    deckQuantities.set(
      key,
      (deckQuantities.get(key) ?? 0) +
        card.quantity
    );
  }

  const totalDeckCopies = new Map<number, number>();

  const allowedCopies = new Map<number, number>();

  for (const card of context.cards) {
    totalDeckCopies.set(
      card.id,
      (totalDeckCopies.get(card.id) ?? 0) +
        card.quantity
    );

    const existingLimit = allowedCopies.get(card.id);

    allowedCopies.set(
      card.id,
      existingLimit === undefined
        ? card.allowedCopies
        : Math.min(existingLimit, card.allowedCopies)
    );
  }
  
  for (const card of context.availableCollectionCards ?? []) {
    if (card.allowedCopies === undefined) {
      continue;
    }

    const existingLimit = allowedCopies.get(card.id);

    allowedCopies.set(
      card.id,
      existingLimit === undefined
        ? card.allowedCopies
        : Math.min(existingLimit, card.allowedCopies)
    );
  }

  // 5. Validate recommendations independently
  const recommendations =
    grounding.recommendations.map(item => {
      const recommendation = item.recommendation;

      const reasons: RecommendationValidationReason[] =
        [];

      // A. Grounding verification
      if (item.status !== "grounded") {
        reasons.push("NOT_GROUNDED");
      }

      // B. Known source card
      if (!knownCardIds.has(recommendation.cardId)) {
        reasons.push("UNKNOWN_CARD");
      }

      // C. Known replacement target
      if (recommendation.action === "replace") {
        const replacementId =
          recommendation.replacementCardId;

        if (
          replacementId === undefined ||
          !knownCardIds.has(replacementId)
        ) {
          reasons.push("UNKNOWN_REPLACEMENT");
        }
      }

      // D. Removal quantity verification
      if (
        recommendation.action === "remove" ||
        recommendation.action === "replace"
      ) {
        const key =
          `${recommendation.section}:${recommendation.cardId}`;

        const deckQuantity =
          deckQuantities.get(key) ?? 0;

        if (deckQuantity === 0) {
          reasons.push("CARD_NOT_IN_SECTION");
        } else if (
          deckQuantity < recommendation.quantity
        ) {
          reasons.push("INSUFFICIENT_DECK_COPIES");
        }
      }

      // E. Ownership validation for additions
      if (recommendation.action === "add") {
        const available =
          availableCopies.get(recommendation.cardId) ?? 0;

        if (available < recommendation.quantity) {
          reasons.push("INSUFFICIENT_OWNED_COPIES");
        }
      }

      // F. Ownership validation for replacements
      if (recommendation.action === "replace") {
        const replacementId =
          recommendation.replacementCardId;

        if (replacementId !== undefined) {
          const available =
            availableCopies.get(replacementId) ?? 0;

          if (available < recommendation.quantity) {
            reasons.push("INSUFFICIENT_OWNED_COPIES");
          }
        }
      }

      // G. Placement validation for additions
      if (recommendation.action === "add") {
        const cardType =
          cardTypes.get(recommendation.cardId);

        if (
          cardType === undefined ||
          !canPlaceCardInSection(
            cardType,
            recommendation.section
          )
        ) {
          reasons.push("INVALID_SECTION");
        }
      }

      // H. Placement validation for replacements
      if (recommendation.action === "replace") {
        const replacementId =
          recommendation.replacementCardId;

        const replacementType =
          replacementId === undefined
            ? undefined
            : cardTypes.get(replacementId);

        if (
          replacementType === undefined ||
          !canPlaceCardInSection(
            replacementType,
            recommendation.section
          )
        ) {
          reasons.push("INVALID_SECTION");
        }
      }

      if (recommendation.action === "add") {
        const currentCopies =
          totalDeckCopies.get(recommendation.cardId) ?? 0;

        const limit =
          allowedCopies.get(recommendation.cardId);

        const copyValidation = validateCardCopyLimit(
          currentCopies,
          recommendation.quantity,
          limit
        );

        reasons.push(...copyValidation.reasons);
      }
            
      if (recommendation.action === "replace") {
        const replacementId =
          recommendation.replacementCardId;

        if (replacementId !== undefined) {
          const currentCopies =
            totalDeckCopies.get(replacementId) ?? 0;

          const limit =
            allowedCopies.get(replacementId);

          const copyValidation = validateCardCopyLimit(
            currentCopies,
            recommendation.quantity,
            limit
          );

          reasons.push(...copyValidation.reasons);
        }
      }

      return {
        recommendation,
        status:
          reasons.length === 0
            ? ("valid" as const)
            : ("invalid" as const),
        reasons,
      };
    });

  return {
    recommendations,
    validCount: recommendations.filter(
      item => item.status === "valid"
    ).length,
    invalidCount: recommendations.filter(
      item => item.status === "invalid"
    ).length,
  };
}