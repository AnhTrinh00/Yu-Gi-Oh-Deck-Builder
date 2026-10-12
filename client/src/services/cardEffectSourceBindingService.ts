import type {
  CardEffectDefinition,
} from "../models/CardEffect";

import type {
  GameState,
} from "../models/GameState";

export interface SourceBindingResult {
  success: boolean;
  effect?: CardEffectDefinition;
  error?: string;
}

/**
 * Bind a reusable card effect to a specific
 * physical card instance for this activation.
 *
 * The original definition is not mutated.
 */
export function bindCardEffectSource(
  state: GameState,
  effect: CardEffectDefinition,
  sourceInstanceId: string
): SourceBindingResult {
  const source = state.cardInstances?.instances.find(
    instance =>
      instance.instanceId === sourceInstanceId
  );

  if (!source) {
    return {
      success: false,
      error: "Source card instance was not found.",
    };
  }

  if (source.cardId !== effect.sourceCardId) {
    return {
      success: false,
      error: "Source instance has the wrong card ID.",
    };
  }

  if (source.zone !== effect.activationZone) {
    return {
      success: false,
      error: "Source instance is not in its activation zone.",
    };
  }

  const boundEffect: CardEffectDefinition = {
    ...structuredClone(effect),

    costs: effect.costs.map(cost => {
      if (cost.type === "detach-xyz-material") {
        return {
          ...cost,
          xyzInstanceId: sourceInstanceId,
        };
      }

      return { ...cost };
    }),
  };

  return {
    success: true,
    effect: boundEffect,
  };
}