
import type {
  CardEffectDefinition,
} from "../../../models/CardEffect";

import {
  CardEffectRegistry,
  cardEffectRegistry,
} from "../cardEffectRegistryService";

/**
 * YGOPRODeck / Konami card identifiers.
 */
export const CARD_IDS = {
  POT_OF_GREED: 55144522,
  FOOLISH_BURIAL: 81439173,
} as const;

/**
 * Pot of Greed
 *
 * Official effect:
 * Draw 2 cards.
 *
 * Limitations:
 * - Spell activation rules are not yet modeled.
 * - Spell resolution and movement to the GY
 *   are not yet implemented.
 * - Drawing is not yet executable through
 *   the structured-effect executor.
 */
export const potOfGreedEffect: CardEffectDefinition = {
  id: "pot-of-greed-draw",
  sourceCardId: CARD_IDS.POT_OF_GREED,
  label: "Draw 2 cards",
  activationZone: "hand",

  conditions: [],

  costs: [],

  steps: [
    {
      type: "draw",
      count: 2,
    },
  ],

  verification: "experimental",
};

/**
 * Foolish Burial
 *
 * Send 1 monster from your Deck to the GY.
 *
 * This factory requires the caller to provide
 * the monster selected for the effect.
 *
 * The current model does not validate monster
 * identity or complete Spell activation rules.
 */
export function createFoolishBurialEffect(
  selectedMonsterId: number
): CardEffectDefinition {
  if (
    !Number.isSafeInteger(selectedMonsterId) ||
    selectedMonsterId <= 0
  ) {
    throw new Error("Invalid selected monster ID.");
  }

  return {
    id: `foolish-burial-send-${selectedMonsterId}`,
    sourceCardId: CARD_IDS.FOOLISH_BURIAL,
    label: "Send 1 monster from Deck to GY",
    activationZone: "hand",

    conditions: [
      {
        type: "card-in-zone",
        cardId: selectedMonsterId,
        zone: "deck",
      },
    ],

    costs: [],

    steps: [
      {
        type: "move",
        cardId: selectedMonsterId,
        from: "deck",
        to: "graveyard",
      },
    ],

    verification: "experimental",
  };
}

/**
 * The initial fixed library.
 *
 * Target-dependent effects are generated
 * separately when the selected card is known.
 */
export const initialCardEffects: CardEffectDefinition[] = [
  potOfGreedEffect,
];

/**
 * Register initial definitions without
 * creating duplicates on repeated calls.
 *
 * Existing definitions are not overwritten.
 */
export function initializeCardEffectLibrary(
  registry: CardEffectRegistry = cardEffectRegistry
): void {
  for (const effect of initialCardEffects) {
    if (!registry.hasEffect(effect.id)) {
      registry.registerEffect(effect);
    }
  }
}

/**
 * Register a Foolish Burial candidate for
 * a particular selected monster.
 */
export function registerFoolishBurialCandidate(
  selectedMonsterId: number,
  registry: CardEffectRegistry = cardEffectRegistry
): CardEffectDefinition {
  const effect = createFoolishBurialEffect(
    selectedMonsterId
  );

  if (!registry.hasEffect(effect.id)) {
    registry.registerEffect(effect);
  }

  return effect;
}
