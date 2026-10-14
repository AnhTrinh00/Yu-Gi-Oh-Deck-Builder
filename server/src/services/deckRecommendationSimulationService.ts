import type {
  DeckAnalysisRequest,
} from "../schemas/deckContext.js";

import type {
  DeckRecommendationValidationResult,
  RecommendationValidationReason,
} from "../schemas/deckRecommendationValidation.js";

import type {
  DeckRecommendationSimulationResult,
  DeckSimulationCounts,
} from "../schemas/deckRecommendationSimulation.js";

type Section = keyof DeckSimulationCounts;

type Recommendation =
  DeckRecommendationValidationResult["recommendations"][number]["recommendation"];

const SECTION_LIMITS: Record<Section, number> = {
  main: 60,
  extra: 15,
  side: 15,
};

function key(id: number, section: Section): string {
  return `${section}:${id}`;
}

export function simulateDeckRecommendations(
  request: DeckAnalysisRequest,
  validation: DeckRecommendationValidationResult
): DeckRecommendationSimulationResult {
  const { context } = request;

  const counts: DeckSimulationCounts = {
    main: 0,
    extra: 0,
    side: 0,
  };

  const deckCopies = new Map<string, number>();
  const totalCopies = new Map<number, number>();
  const ownedCopies = new Map<number, number>();
  const allowedCopies = new Map<number, number>();

  for (const card of context.cards) {
    const section = card.section;

    counts[section] += card.quantity;

    const cardKey = key(card.id, section);

    deckCopies.set(
      cardKey,
      (deckCopies.get(cardKey) ?? 0) + card.quantity
    );

    totalCopies.set(
      card.id,
      (totalCopies.get(card.id) ?? 0) + card.quantity
    );

    ownedCopies.set(
      card.id,
      Math.max(
        ownedCopies.get(card.id) ?? 0,
        card.ownedQuantity
      )
    );

    const existing = allowedCopies.get(card.id);

    allowedCopies.set(
      card.id,
      existing === undefined
        ? card.allowedCopies
        : Math.min(existing, card.allowedCopies)
    );
  }

  for (const card of context.availableCollectionCards ?? []) {
    ownedCopies.set(
      card.id,
      Math.max(
        ownedCopies.get(card.id) ?? 0,
        card.ownedQuantity
      )
    );

    if (card.allowedCopies !== undefined) {
      const existing = allowedCopies.get(card.id);

      allowedCopies.set(
        card.id,
        existing === undefined
          ? card.allowedCopies
          : Math.min(existing, card.allowedCopies)
      );
    }
  }

  const initialCounts = { ...counts };

  function getSectionCopies(
    id: number,
    section: Section
  ): number {
    return deckCopies.get(key(id, section)) ?? 0;
  }

  function removeCopies(
    id: number,
    section: Section,
    quantity: number
  ): void {
    deckCopies.set(
      key(id, section),
      getSectionCopies(id, section) - quantity
    );

    totalCopies.set(
      id,
      (totalCopies.get(id) ?? 0) - quantity
    );

    counts[section] -= quantity;
  }

  function addCopies(
    id: number,
    section: Section,
    quantity: number
  ): void {
    deckCopies.set(
      key(id, section),
      getSectionCopies(id, section) + quantity
    );

    totalCopies.set(
      id,
      (totalCopies.get(id) ?? 0) + quantity
    );

    counts[section] += quantity;
  }

  function checkAddition(
    id: number,
    section: Section,
    quantity: number
  ): RecommendationValidationReason[] {
    const reasons: RecommendationValidationReason[] = [];

    const nextSectionCount =
      counts[section] + quantity;

    if (nextSectionCount > SECTION_LIMITS[section]) {
      reasons.push("DECK_SIZE_LIMIT");
    }

    const nextTotalCopies =
      (totalCopies.get(id) ?? 0) + quantity;

    if (nextTotalCopies > 3) {
      reasons.push("COPY_LIMIT");
    }

    const allowed = allowedCopies.get(id);

    if (
      allowed === undefined ||
      nextTotalCopies > allowed
    ) {
      reasons.push("BANLIST_LIMIT");
    }

    const owned = ownedCopies.get(id) ?? 0;

    if (nextTotalCopies > owned) {
      reasons.push("INSUFFICIENT_OWNED_COPIES");
    }

    return reasons;
  }

  const results = validation.recommendations.map(
    item => {
      const recommendation: Recommendation =
        item.recommendation;

      const reasons: RecommendationValidationReason[] =
        [...item.reasons];

      if (item.status !== "valid") {
        return {
          recommendation,
          status: "rejected" as const,
          reasons: [...new Set(reasons)],
        };
      }

      const {
        action,
        cardId,
        section,
        quantity,
        replacementCardId,
      } = recommendation;

      if (action === "remove") {
        if (getSectionCopies(cardId, section) < quantity) {
          reasons.push("INSUFFICIENT_DECK_COPIES");
        }

        if (reasons.length === 0) {
          removeCopies(cardId, section, quantity);
        }
      }

      if (action === "add") {
        reasons.push(
          ...checkAddition(cardId, section, quantity)
        );

        if (reasons.length === 0) {
          addCopies(cardId, section, quantity);
        }
      }

      if (action === "replace") {
        if (
          replacementCardId === undefined ||
          getSectionCopies(cardId, section) < quantity
        ) {
          reasons.push("INSUFFICIENT_DECK_COPIES");
        } else {
          // Evaluate the replacement against the state
          // after removing its source card.
          removeCopies(cardId, section, quantity);

          const additionReasons = checkAddition(
            replacementCardId,
            section,
            quantity
          );

          reasons.push(...additionReasons);

          if (reasons.length === 0) {
            addCopies(
              replacementCardId,
              section,
              quantity
            );
          } else {
            // Roll back the tentative removal.
            addCopies(cardId, section, quantity);
          }
        }
      }

      return {
        recommendation,
        status:
          reasons.length === 0
            ? ("applied" as const)
            : ("rejected" as const),
        reasons: [...new Set(reasons)],
      };
    }
  );

  return {
    recommendations: results,
    appliedCount: results.filter(
      item => item.status === "applied"
    ).length,
    rejectedCount: results.filter(
      item => item.status === "rejected"
    ).length,
    initialCounts,
    finalCounts: { ...counts },
  };
}