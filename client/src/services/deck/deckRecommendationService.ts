import type { Deck } from "../../models/deck/Deck";
import type { CollectionCard } from "../../models/card/CollectionCard";
import type { CardRelationship } from "../../models/effect/CardRelationship";
import type { Combo } from "../../models/combo/Combo";
import type {
  DeckRecommendation,
  RecommendationPriority,
} from "../../models/deck/DeckRecommendation";

import { getCardRoles } from "../card/cardRoleService";
import {
  getBanlistCopyLimit,
  type DeckFormat,
} from "./banlistService";

interface RecommendationInput {
  deck: Deck;
  collection: CollectionCard[];
  relationships: CardRelationship[];
  combos: Combo[];
  format: DeckFormat;
}

function priorityFromScore(
  score: number
): RecommendationPriority {
  if (score >= 80) return "high";
  if (score >= 50) return "medium";
  return "low";
}

export function generateDeckRecommendations({
  deck,
  collection,
  relationships,
  combos,
  format,
}: RecommendationInput): DeckRecommendation[] {
  const recommendations: DeckRecommendation[] = [];

  const mainCount = deck.main.reduce(
    (sum, entry) => sum + entry.quantity,
    0
  );

  const deckCards = [
    ...deck.main,
    ...deck.extra,
    ...deck.side,
  ];

  const deckIds = new Set(
    deckCards.map((entry) => entry.card.id)
  );

  const ownedCopies = new Map(
    collection.map((entry) => [
      entry.card.id,
      entry.quantity,
    ])
  );

  const deckCopies = new Map<number, number>();

  for (const entry of deckCards) {
    deckCopies.set(
      entry.card.id,
      (deckCopies.get(entry.card.id) ?? 0) +
        entry.quantity
    );
  }

  function addRecommendation(
    id: string,
    type: DeckRecommendation["type"],
    score: number,
    title: string,
    description: string,
    evidence: string[],
    relatedCardIds: number[]
  ) {
    recommendations.push({
      id,
      type,
      score,
      priority: priorityFromScore(score),
      title,
      description,
      evidence,
      relatedCardIds,
    });
  }

  // Rule 1: Main Deck size
  if (mainCount > 40) {
    addRecommendation(
      "deck-size",
      "deck-size",
      65,
      "Review Main Deck size",
      `Your Main Deck contains ${mainCount} cards. ` +
        "A smaller deck can improve access to specific cards.",
      [
        `Current Main Deck: ${mainCount}`,
        "Minimum standard Main Deck size: 40",
      ],
      []
    );
  }

  // Rule 2: Starter quantities
  for (const entry of deck.main) {
    const roles = getCardRoles(entry.card);

    if (!roles.includes("starter")) continue;

    const cardId = entry.card.id;
    const totalUsed = deckCopies.get(cardId) ?? 0;
    const owned = ownedCopies.get(cardId) ?? 0;

    const legalLimit = getBanlistCopyLimit(
      entry.card,
      format
    );

    const availableLimit = Math.min(
      legalLimit,
      owned
    );

    if (availableLimit <= totalUsed) continue;

    addRecommendation(
      `starter-${cardId}`,
      "starter-consistency",
      85,
      `Consider more copies of ${entry.card.name}`,
      "Increasing access to a useful starter may " +
        "improve opening-hand consistency.",
      [
        `Current copies across deck sections: ${totalUsed}`,
        `Owned copies: ${owned}`,
        `Format copy limit: ${legalLimit}`,
      ],
      [cardId]
    );
  }

  // Rule 3: Isolated cards
  const connectedIds = new Set<number>();

  for (const relationship of relationships) {
    if (
      deckIds.has(relationship.sourceCardId) &&
      deckIds.has(relationship.targetCardId)
    ) {
      connectedIds.add(relationship.sourceCardId);
      connectedIds.add(relationship.targetCardId);
    }
  }

  for (const entry of deck.main) {
    if (connectedIds.has(entry.card.id)) continue;

    addRecommendation(
      `isolated-${entry.card.id}`,
      "isolated-card",
      35,
      `Review ${entry.card.name}`,
      "This card has no recorded relationships with " +
        "other cards in the current deck.",
      [
        "No matching relationships in the recorded graph",
        "Missing graph data does not imply poor synergy",
      ],
      [entry.card.id]
    );
  }

  // Rule 4: Owned cards with recorded synergy
  for (const item of collection) {
    const candidate = item.card;

    if (deckIds.has(candidate.id)) continue;
    if (item.quantity < 1) continue;

    const legalLimit = getBanlistCopyLimit(
      candidate,
      format
    );

    if (legalLimit < 1) continue;

    const connections = relationships.filter(
      (relationship) =>
        (relationship.sourceCardId === candidate.id &&
          deckIds.has(relationship.targetCardId)) ||
        (relationship.targetCardId === candidate.id &&
          deckIds.has(relationship.sourceCardId))
    );

    if (connections.length === 0) continue;

    addRecommendation(
      `collection-${candidate.id}`,
      "collection-opportunity",
      Math.min(75, 45 + connections.length * 10),
      `Consider testing ${candidate.name}`,
      "You own this card, and it has recorded " +
        "relationships with cards in your deck.",
      [
        `Owned copies: ${item.quantity}`,
        `Recorded connections: ${connections.length}`,
        `Format copy limit: ${legalLimit}`,
      ],
      [candidate.id]
    );
  }

  // Rule 5: Saved combo starter accessibility
  for (const combo of combos) {
    const unavailable = combo.starters.filter(
      (starter) => {
        const copies = deck.main
          .filter(
            (entry) =>
              entry.card.id === starter.cardId
          )
          .reduce(
            (sum, entry) => sum + entry.quantity,
            0
          );

        return copies < starter.quantity;
      }
    );

    if (unavailable.length === 0) continue;

    addRecommendation(
      `combo-${combo.id}`,
      "combo-accessibility",
      80,
      `Review combo: ${combo.name}`,
      "The current Main Deck does not contain " +
        "enough copies of every recorded starting card.",
      unavailable.map(
        (starter) =>
          `Missing required starter copies: Card ${starter.cardId}`
      ),
      unavailable.map((starter) => starter.cardId)
    );
  }

  return recommendations.sort(
    (a, b) =>
      b.score - a.score ||
      a.id.localeCompare(b.id)
  );
}
