
export type GameZone =
  | "hand"
  | "deck"
  | "extra"
  | "field"
  | "graveyard"
  | "banished";

export type GameActionType =
  | "normal-summon"
  | "special-summon"
  | "search"
  | "move"
  | "activate-effect";

export interface GameAction {
  id: string;
  type: GameActionType;
  cardId: number;

  // Required for move; optional for special-summon.
  from?: GameZone;

  // Required for move.
  to?: GameZone;

  // Used only by activate-effect.
  effectKey?: string;
  oncePerTurn?: boolean;

  description?: string;
}

export interface GameState {
  zones: Record<GameZone, number[]>;
  normalSummonUsed: boolean;
  usedEffects: string[];
  actionHistory: GameAction[];
}

export interface GameActionResult {
  success: boolean;
  state: GameState;
  error?: string;
}

export interface ComboSimulationResult {
  success: boolean;
  initialState: GameState;
  finalState: GameState;
  completedSteps: number;
  totalSteps: number;
  errors: string[];
  warnings: string[];
}
