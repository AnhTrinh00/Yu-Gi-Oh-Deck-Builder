
import type { GameState } from "../models/GameState";
import type {
  ComboResourceMetrics,
} from "../models/ComboEvaluation";

export function analyzeComboResources(
  initialState: GameState,
  finalState: GameState,
  actionsUsed: number
): ComboResourceMetrics {
  if (
    !Number.isSafeInteger(actionsUsed) ||
    actionsUsed < 0
  ) {
    throw new Error(
      "actionsUsed must be a nonnegative integer."
    );
  }

  const initialHand = initialState.zones.hand.length;
  const finalHand = finalState.zones.hand.length;

  const initialField = initialState.zones.field.length;
  const finalField = finalState.zones.field.length;

  return {
    initialHand,
    finalHand,
    handDelta: finalHand - initialHand,

    initialField,
    finalField,
    fieldDelta: finalField - initialField,

    initialGraveyard:
      initialState.zones.graveyard.length,
    finalGraveyard:
      finalState.zones.graveyard.length,

    initialBanished:
      initialState.zones.banished.length,
    finalBanished:
      finalState.zones.banished.length,

    initialDeck: initialState.zones.deck.length,
    finalDeck: finalState.zones.deck.length,

    initialExtra: initialState.zones.extra.length,
    finalExtra: finalState.zones.extra.length,

    actionsUsed,
  };
}
