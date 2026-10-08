
import type { Deck } from "../models/Deck";
import type {
  GameAction,
  GameActionResult,
  GameState,
  GameZone,
} from "../models/GameState";

const zones: GameZone[] = [
  "hand",
  "deck",
  "extra",
  "field",
  "graveyard",
  "banished",
];

export function createGameState(deck: Deck): GameState {
  const main = deck.main.flatMap((entry) =>
    Array(entry.quantity).fill(entry.card.id) as number[]
  );

  const extra = deck.extra.flatMap((entry) =>
    Array(entry.quantity).fill(entry.card.id) as number[]
  );

  return {
    zones: {
      hand: [],
      deck: main,
      extra,
      field: [],
      graveyard: [],
      banished: [],
    },
    normalSummonUsed: false,
    usedEffects: [],
    actionHistory: [],
  };
}

export function cloneGameState(
  state: GameState
): GameState {
  return {
    zones: Object.fromEntries(
      zones.map((zone) => [
        zone,
        [...state.zones[zone]],
      ])
    ) as GameState["zones"],
    normalSummonUsed: state.normalSummonUsed,
    usedEffects: [...state.usedEffects],
    actionHistory: [...state.actionHistory],
  };
}

export function countCardInZone(
  state: GameState,
  zone: GameZone,
  cardId: number
): number {
  return state.zones[zone].filter(
    (id) => id === cardId
  ).length;
}

export function moveCard(
  state: GameState,
  cardId: number,
  from: GameZone,
  to: GameZone
): GameState | null {
  if (from === to) return null;

  const index = state.zones[from].indexOf(cardId);

  if (index === -1) return null;

  const next = cloneGameState(state);

  next.zones[from].splice(index, 1);
  next.zones[to].push(cardId);

  return next;
}

export function executeGameAction(
  state: GameState,
  action: GameAction
): GameActionResult {
  function failure(error: string): GameActionResult {
    return {
      success: false,
      state,
      error,
    };
  }

  let next: GameState | null = null;

  switch (action.type) {
    case "normal-summon": {
      if (state.normalSummonUsed) {
        return failure(
          "The normal summon has already been used."
        );
      }

      next = moveCard(
        state,
        action.cardId,
        "hand",
        "field"
      );

      if (!next) {
        return failure(
          `Card ${action.cardId} is not in the hand.`
        );
      }

      next.normalSummonUsed = true;
      break;
    }

    case "special-summon": {
      const from = action.from ?? "hand";

      if (
        from !== "hand" &&
        from !== "graveyard" &&
        from !== "extra" &&
        from !== "banished"
      ) {
        return failure(
          "Unsupported Special Summon source."
        );
      }

      next = moveCard(
        state,
        action.cardId,
        from,
        "field"
      );

      if (!next) {
        return failure(
          `Card ${action.cardId} is not in ${from}.`
        );
      }

      break;
    }

    case "search": {
      next = moveCard(
        state,
        action.cardId,
        "deck",
        "hand"
      );

      if (!next) {
        return failure(
          `Card ${action.cardId} is not in the Deck.`
        );
      }

      break;
    }

    case "move": {
      if (!action.from || !action.to) {
        return failure(
          "Move actions require source and destination zones."
        );
      }

      next = moveCard(
        state,
        action.cardId,
        action.from,
        action.to
      );

      if (!next) {
        return failure(
          `Cannot move Card ${action.cardId} ` +
          `from ${action.from} to ${action.to}.`
        );
      }

      break;
    }

    case "activate-effect": {
      if (
        countCardInZone(
          state,
          "field",
          action.cardId
        ) === 0
      ) {
        return failure(
          `Card ${action.cardId} is not on the field.`
        );
      }

      if (!action.effectKey?.trim()) {
        return failure(
          "An effect identifier is required."
        );
      }

      if (
        action.oncePerTurn &&
        state.usedEffects.includes(action.effectKey)
      ) {
        return failure(
          `Effect ${action.effectKey} has already been used.`
        );
      }

      next = cloneGameState(state);

      if (action.oncePerTurn) {
        next.usedEffects.push(action.effectKey);
      }

      break;
    }

    default:
      return failure("Unsupported action type.");
  }

  next.actionHistory.push({ ...action });

  return {
    success: true,
    state: next,
  };
}
