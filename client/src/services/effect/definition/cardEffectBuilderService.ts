import type {
  CardEffectDefinition,
  EffectCondition,
  EffectCost,
  EffectStep,
} from "../../../models/CardEffect";
import type { GameZone } from "../../../models/GameState";
import { cardEffectSchema } from "./cardEffectSchemaService";

export const GAME_ZONES: GameZone[] = [
  "hand",
  "deck",
  "extra",
  "field",
  "graveyard",
  "banished",
];

export const CONDITION_TYPES = [
  "source-in-zone",
  "card-in-zone",
  "normal-summon-available",
  "effect-unused",
] as const;

export const STEP_TYPES = [
  "draw",
  "search",
  "move",
  "special-summon",
  "destroy",
] as const;

export function newCondition(
  type: EffectCondition["type"]
): EffectCondition {
  switch (type) {
    case "source-in-zone":
      return { type, zone: "field" };

    case "card-in-zone":
      return {
        type,
        cardId: 1,
        zone: "hand",
        minimum: 1,
      };

    case "normal-summon-available":
      return { type };

    case "effect-unused":
      return {
        type,
        usageKey: "effect-once-per-turn",
      };
  }
}

export function newCost(): EffectCost {
  return {
    type: "move-card",
    cardId: 1,
    from: "hand",
    to: "graveyard",
  };
}

export function newStep(
  type: EffectStep["type"]
): EffectStep {
  switch (type) {
    case "draw":
      return { type, count: 1 };

    case "search":
      return { type, cardId: 1 };

    case "move":
      return {
        type,
        cardId: 1,
        from: "deck",
        to: "hand",
      };

    case "special-summon":
      return {
        type,
        cardId: 1,
        from: "hand",
      };

    case "destroy":
      return {
        type,
        cardId: 1,
        from: "field",
      };
  }
}

export function newEffect(
  sourceCardId: number
): CardEffectDefinition {
  return {
    id: `card-${sourceCardId}-effect-1`,
    sourceCardId,
    label: "New effect",
    activationZone: "field",
    conditions: [],
    costs: [],
    steps: [newStep("draw")],
    verification: "experimental",
  };
}

export function validateBuiltEffect(
  value: unknown
): CardEffectDefinition {
  return cardEffectSchema.parse(value);
}