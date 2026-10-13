
import type { Deck } from "../../../models/Deck";
import type { GameState } from "../../../models/GameState";

import {
  createExtendedGameState,
} from "../../simulation/extendedGameStateService";

import {
  initializeCardInstances,
} from "../../simulation/cardInstanceService";

export function createComboExplorerState(
  deck: Deck,
  handCardIds: number[]
): GameState {
  if (handCardIds.length > 6) {
    throw new Error(
      "Select at most six cards for the starting hand."
    );
  }

  const state = createExtendedGameState(deck);

  for (const cardId of handCardIds) {
    const index = state.zones.deck.indexOf(cardId);

    if (index === -1) {
      throw new Error(
        `Card ${cardId} has no remaining Main Deck copies.`
      );
    }

    state.zones.deck.splice(index, 1);
    state.zones.hand.push(cardId);
  }

  const initialized = initializeCardInstances(state);

  if (!initialized.success) {
    throw new Error(
      initialized.error ??
        "Failed to initialize card instances."
    );
  }

  return initialized.state;
}
