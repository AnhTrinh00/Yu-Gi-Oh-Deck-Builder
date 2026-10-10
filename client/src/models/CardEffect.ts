import type { GameZone } from "./GameState";

export type EffectOperation =
    | "draw"
    | "search" 
    | "move"
    | "special-summon"
    | "destroy";

export type EffectCondition =
    | { type: "source-in-zone"; zone: GameZone }
    | { type: "card-in-zone"; cardId: number; zone: GameZone; minimum?: number }
    | { type: "normal-summon-available" }
    | { type: "effect-unused"; usageKey: string };

export type EffectCost = {
    type: "move-card";
    cardId: number;
    from: GameZone;
    to: GameZone;
};

export type EffectStep =
  | { type: "draw"; count: number }
  | { type: "search"; cardId: number }
  | { type: "move"; cardId: number; from: GameZone; to: GameZone }
  | { type: "special-summon"; cardId: number; from: GameZone }
  | { type: "destroy"; cardId: number; from: "field" };

export interface CardEffectDefinition {
    id: string;
    sourceCardId: number;
    label: string;
    activationZone: GameZone;
    conditions: EffectCondition[];
    costs: EffectCost[];
    steps: EffectStep[];

    oncePerTurnKey?: string;

    verification: "manually-verified" | "experimental";
}