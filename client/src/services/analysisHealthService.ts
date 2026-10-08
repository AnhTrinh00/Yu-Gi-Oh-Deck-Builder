
import type { Deck } from "../models/Deck";
import type { CollectionCard } from "../models/CollectionCard";
import type { CardRelationship } from "../models/CardRelationship";
import type { Combo } from "../models/Combo";

import type {
  AnalysisHealthReport,
  AnalysisIssue,
} from "../models/AnalysisHealth";

interface HealthInput {
  deck: Deck;
  collection: CollectionCard[];
  relationships: CardRelationship[];
  combos: Combo[];
}

export function analyzeDataHealth({
  deck,
  collection,
  relationships,
  combos,
}: HealthInput): AnalysisHealthReport {
  const issues: AnalysisIssue[] = [];

  const sections = [
    { name: "Main", entries: deck.main, max: 60 },
    { name: "Extra", entries: deck.extra, max: 15 },
    { name: "Side", entries: deck.side, max: 15 },
  ];

  const deckCopies = new Map<number, number>();
  const cardNames = new Map<number, string>();

  for (const section of sections) {
    let count = 0;

    for (const entry of section.entries) {
      const id = entry.card.id;
      const quantity = entry.quantity;

      cardNames.set(id, entry.card.name);

      if (
        !Number.isSafeInteger(quantity) ||
        quantity <= 0
      ) {
        issues.push({
          id: `quantity-${section.name}-${id}`,
          type: "invalid-quantity",
          severity: "error",
          message:
            `${entry.card.name} has an invalid quantity ` +
            `in the ${section.name} Deck.`,
          relatedCardIds: [id],
        });

        continue;
      }

      count += quantity;

      deckCopies.set(
        id,
        (deckCopies.get(id) ?? 0) + quantity
      );
    }

    if (count > section.max) {
      issues.push({
        id: `size-${section.name}`,
        type: "deck-size",
        severity: "error",
        message:
          `${section.name} Deck contains ${count} cards; ` +
          `maximum is ${section.max}.`,
        relatedCardIds: [],
      });
    }
  }

  const mainCount = deck.main.reduce(
    (sum, entry) =>
      sum +
      (Number.isSafeInteger(entry.quantity) &&
      entry.quantity > 0
        ? entry.quantity
        : 0),
    0
  );

  if (mainCount < 40) {
    issues.push({
      id: "size-main-minimum",
      type: "deck-size",
      severity: "warning",
      message:
        `Main Deck has ${mainCount} cards. ` +
        "A standard completed deck requires at least 40.",
      relatedCardIds: [],
    });
  }

  const ownedCopies = new Map<number, number>();

  for (const item of collection) {
    cardNames.set(item.card.id, item.card.name);

    if (
      !Number.isSafeInteger(item.quantity) ||
      item.quantity < 0
    ) {
      issues.push({
        id: `collection-quantity-${item.card.id}`,
        type: "invalid-quantity",
        severity: "error",
        message:
          `Invalid collection quantity for ${item.card.name}.`,
        relatedCardIds: [item.card.id],
      });

      continue;
    }

    ownedCopies.set(
      item.card.id,
      (ownedCopies.get(item.card.id) ?? 0) +
        item.quantity
    );
  }

  for (const [id, quantity] of deckCopies) {
    const owned = ownedCopies.get(id) ?? 0;

    if (quantity > owned) {
      issues.push({
        id: `collection-shortage-${id}`,
        type: "collection-shortage",
        severity: "warning",
        message:
          `${cardNames.get(id) ?? `Card ${id}`}: ` +
          `${quantity} used, ${owned} owned.`,
        relatedCardIds: [id],
      });
    }
  }

  const deckIds = new Set(deckCopies.keys());

  for (const combo of combos) {
    const requiredIds = new Set([
      ...combo.starters.map((item) => item.cardId),
      ...combo.requirements.map((item) => item.cardId),
      ...combo.steps.map((step) => step.cardId),
      ...combo.endBoardCardIds,
    ]);

    for (const id of requiredIds) {
      if (!deckIds.has(id)) {
        issues.push({
          id: `combo-${combo.id}-${id}`,
          type: "missing-combo-card",
          severity: "warning",
          message:
            `Combo "${combo.name}" references ` +
            `Card ${id}, which is not in the current deck.`,
          relatedCardIds: [id],
        });
      }
    }
  }

  const knownIds = new Set([
    ...deckIds,
    ...ownedCopies.keys(),
  ]);

  for (const relationship of relationships) {
    const missing = [
      relationship.sourceCardId,
      relationship.targetCardId,
    ].filter((id) => !knownIds.has(id));

    if (missing.length > 0) {
      issues.push({
        id:
          `relationship-${relationship.sourceCardId}-` +
          `${relationship.targetCardId}-${relationship.type}`,
        type: "external-relationship",
        severity: "info",
        message:
          "A recorded relationship references cards " +
          "outside the current deck and collection.",
        relatedCardIds: [
          relationship.sourceCardId,
          relationship.targetCardId,
        ],
      });
    }
  }

  const errorCount = issues.filter(
    (issue) => issue.severity === "error"
  ).length;

  const warningCount = issues.filter(
    (issue) => issue.severity === "warning"
  ).length;

  const infoCount = issues.filter(
    (issue) => issue.severity === "info"
  ).length;

  return {
    healthy: errorCount === 0,
    errorCount,
    warningCount,
    infoCount,
    issues,
  };
}
