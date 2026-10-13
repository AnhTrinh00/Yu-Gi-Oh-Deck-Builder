
import type { GameState } from "../../../models/GameState";

function sorted<T>(
  items: T[],
  key: (item: T) => string
): T[] {
  return [...items].sort((a, b) =>
    key(a).localeCompare(key(b))
  );
}

export function getComboStateFingerprint(
  state: GameState
): string {
  return JSON.stringify({
    zones: state.zones,

    normalSummonUsed: state.normalSummonUsed,

    usedEffects: [...state.usedEffects].sort(),

    turnState: state.turnState ?? null,

    effectUsage: sorted(
      state.effectUsage ?? [],
      item => JSON.stringify(item)
    ),

    restrictions: sorted(
      state.restrictions ?? [],
      item => JSON.stringify(item)
    ),

    fieldState: state.fieldState ?? null,

    cardInstances: state.cardInstances
      ? {
          nextInstanceNumber:
            state.cardInstances.nextInstanceNumber,
          instances: sorted(
            state.cardInstances.instances,
            item => item.instanceId
          ),
        }
      : null,

    // Retained conservatively because existing
    // condition evaluators may inspect history.
    actionHistory: state.actionHistory,
  });
}
