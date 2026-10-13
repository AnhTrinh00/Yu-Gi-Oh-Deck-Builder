import type { Deck, DeckSection } from "../../models/deck/Deck";
import type { CollectionCard } from "../../models/card/CollectionCard";
import type {
  AIDeckCard,
  AIDeckContext,
} from "../../models/ai/AIDeckContext";

import {
  getBanlistCopyLimit,
  getBanlistStatus,
} from "../deck/banlistService";

import {
  getDeckCardCount,
  validateDeck,
} from "../deck/deckService";

import type {
  AIDeckEvidenceInput,
} from "./aiDeckEvidenceService";

import {
  buildAIDeckEvidence,
} from "./aiDeckEvidenceService";

const MAX_CONTEXT_CARDS = 100;
const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_NAME_LENGTH = 150;
const MAX_VALIDATION_ERRORS = 20;

const SECTIONS: DeckSection[] = [
  "main",
  "extra",
  "side",
];

function limitText(
  value: string,
  maxLength: number
): string {
  return value.slice(0, maxLength);
}

export function buildAIDeckContext(
  deck: Deck,
  collection: CollectionCard[],
  evidenceInput?: AIDeckEvidenceInput
): AIDeckContext {
  const collectionQuantities = new Map<number, number>();

  for (const item of collection) {
    collectionQuantities.set(
      item.card.id,
      (collectionQuantities.get(item.card.id) ?? 0) +
        item.quantity
    );
  }

  const totalDeckQuantities = new Map<number, number>();

  for (const section of SECTIONS) {
    for (const entry of deck[section]) {
      totalDeckQuantities.set(
        entry.card.id,
        (totalDeckQuantities.get(entry.card.id) ?? 0) +
          entry.quantity
      );
    }
  }

  const cards: AIDeckCard[] = [];

  for (const section of SECTIONS) {
    for (const entry of deck[section]) {
      const card = entry.card;

      cards.push({
        id: card.id,
        name: limitText(card.name, MAX_NAME_LENGTH),
        section,
        quantity: entry.quantity,

        type: card.type,
        race: card.race,
        ...(card.attribute !== undefined && {
          attribute: card.attribute,
        }),
        ...(card.level !== undefined && {
          level: card.level,
        }),
        ...(card.atk !== undefined && {
          atk: card.atk,
        }),
        ...(card.def !== undefined && {
          def: card.def,
        }),
        ...(card.archetype !== undefined && {
          archetype: card.archetype,
        }),

        description: limitText(
          card.description,
          MAX_DESCRIPTION_LENGTH
        ),

        ownedQuantity:
          collectionQuantities.get(card.id) ?? 0,

        // Assigned below across all deck sections.
        missingQuantity: 0,

        banlistStatus: getBanlistStatus(
          card,
          "advanced"
        ),
        allowedCopies: getBanlistCopyLimit(
          card,
          "advanced"
        ),
      });
    }
  }

  if (cards.length > MAX_CONTEXT_CARDS) {
    throw new Error(
      `AI context supports at most ${MAX_CONTEXT_CARDS} card entries.`
    );
  }

  // Calculate shortages across the entire deck, rather
  // than independently for each section.
  const remainingOwned = new Map(collectionQuantities);

  for (const card of cards) {
    const available = Math.max(
      0,
      remainingOwned.get(card.id) ?? 0
    );

    const used = Math.min(
      available,
      card.quantity
    );

    card.missingQuantity = card.quantity - used;

    remainingOwned.set(
      card.id,
      available - used
    );
  }

  const validation = validateDeck(deck);

  const mainCount = getDeckCardCount(deck, "main");
  const extraCount = getDeckCardCount(deck, "extra");
  const sideCount = getDeckCardCount(deck, "side");

  const missingCopies = cards.reduce(
    (total, card) => total + card.missingQuantity,
    0
  );

  return {
    version: 1,
    deckName: limitText(deck.name, MAX_NAME_LENGTH),
    format: "advanced",
    cards,

    statistics: {
      mainCount,
      extraCount,
      sideCount,
      totalCount: mainCount + extraCount + sideCount,
      uniqueCards: totalDeckQuantities.size,
      missingCopies,
      isDeckValid: validation.isDeckValid,
      validationErrors: validation.errors
        .slice(0, MAX_VALIDATION_ERRORS)
        .map(error => limitText(error, 300)),
    },

    limitations: [
      "Card descriptions are reference text, not verified executable effects.",
      "Card ownership is calculated across all deck sections.",
      "No combo or end-board simulation evidence is included.",
      "AI suggestions must be independently validated before applying deck changes.",
      "Banlist information uses the available local card metadata and may not reflect the latest official restrictions.",
    ],

    ...(evidenceInput === undefined
      ? ["No registered relationship, combo, or simulation evidence was supplied."]
      : []),

    ...(evidenceInput !== undefined && {
      evidence: buildAIDeckEvidence(evidenceInput),
    }),
  };
}
