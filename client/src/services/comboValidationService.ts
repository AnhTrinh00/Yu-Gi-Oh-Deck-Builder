
import type { Combo } from "../models/Combo";
import type { Deck } from "../models/Deck";

export interface ComboValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function getDeckCardCopies(
  deck: Deck,
  cardId: number
): number {
  return [...deck.main, ...deck.extra].reduce(
    (total, entry) =>
      total +
      (entry.card.id === cardId ? entry.quantity : 0),
    0
  );
}

export function validateCombo(
  combo: Combo,
  deck: Deck
): ComboValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!combo.name.trim()) {
    errors.push("Combo name is required.");
  }

  if (combo.starters.length === 0) {
    errors.push("At least one starting card is required.");
  }

  if (combo.steps.length === 0) {
    errors.push("At least one combo step is required.");
  }

  if (combo.endBoardCardIds.length === 0) {
    warnings.push("No end-board cards have been recorded.");
  }

  const requirements = [
    ...combo.starters,
    ...combo.requirements,
  ];

  const requiredCopies = new Map<number, number>();

  for (const requirement of requirements) {
    if (
      !Number.isSafeInteger(requirement.cardId) ||
      requirement.cardId <= 0 ||
      !Number.isSafeInteger(requirement.quantity) ||
      requirement.quantity < 1
    ) {
      errors.push("Invalid card requirement.");
      continue;
    }

    // Cards needed in different zones may require
    // separate physical copies.
    requiredCopies.set(
      requirement.cardId,
      (requiredCopies.get(requirement.cardId) ?? 0) +
        requirement.quantity
    );
  }

  for (const [cardId, quantity] of requiredCopies) {
    const available = getDeckCardCopies(deck, cardId);

    if (available < quantity) {
      errors.push(
        `Card ${cardId}: requires ${quantity} copies, ` +
        `but the deck contains ${available}.`
      );
    }
  }

  const stepIds = new Set<string>();
  const stepOrders = new Set<number>();

  for (const step of combo.steps) {
    if (!step.id || stepIds.has(step.id)) {
      errors.push("Combo step IDs must be unique and nonempty.");
    }

    if (
      !Number.isSafeInteger(step.order) ||
      step.order < 1 ||
      stepOrders.has(step.order)
    ) {
      errors.push("Combo step order values must be unique positive integers.");
    }

    if (!step.description.trim()) {
      errors.push("Every combo step needs a description.");
    }

    if (!Number.isSafeInteger(step.cardId) || step.cardId <= 0) {
      errors.push("Every combo step needs a valid card ID.");
    }

    stepIds.add(step.id);
    stepOrders.add(step.order);
  }

  for (const cardId of combo.endBoardCardIds) {
    if (getDeckCardCopies(deck, cardId) === 0) {
      warnings.push(
        `End-board card ${cardId} is not in the Main or Extra Deck.`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
