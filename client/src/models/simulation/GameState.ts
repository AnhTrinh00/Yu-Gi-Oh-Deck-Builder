export type GameZone =
  | "hand"
  | "deck"
  | "extra"
  | "field"
  | "graveyard"
  | "banished";

export type CardInstanceZone = GameZone | "overlay";

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
  from?: GameZone;
  to?: GameZone;
  effectKey?: string;
  oncePerTurn?: boolean;
  description?: string;
}

/**
 * Phase 4 game-state extensions.
 */

export type DuelPhase =
  | "draw"
  | "standby"
  | "main1"
  | "battle"
  | "main2"
  | "end";

export type PlayerId = "player" | "opponent";

export type MonsterPosition =
  | "face-up-attack"
  | "face-up-defense"
  | "face-down-defense";

export type SpellTrapPosition =
  | "face-up"
  | "face-down";

export interface MonsterZoneSlot {
  cardId: number;
  instanceId: string;
  position: MonsterPosition;
}

export interface SpellTrapZoneSlot {
  cardId: number;
  instanceId: string;
  position: SpellTrapPosition;
}

export interface FieldState {
  monsterZones: Array<MonsterZoneSlot | null>;
  spellTrapZones: Array<SpellTrapZoneSlot | null>;
  fieldSpellZone: SpellTrapZoneSlot | null;
}

export interface TurnState {
  turnNumber: number;
  activePlayer: PlayerId;
  phase: DuelPhase;
}

export interface EffectUsageRecord {
  usageKey: string;
  turnNumber: number;
  cardInstanceId?: string;
}

export interface GameRestriction {
  id: string;
  description: string;
  expiresAtTurnEnd: boolean;
}

/**
 * Represents one physical copy of a card.
 *
 * cardId identifies the card definition.
 * instanceId identifies this particular copy.
 */
export interface CardInstance {
  instanceId: string;
  cardId: number;
  zone: CardInstanceZone;
}

/**
 * Tracks individual card instances and
 * the next available generated ID.
 */
export interface CardInstanceState {
  instances: CardInstance[];
  nextInstanceNumber: number;
}

/**
 * Legacy state remains compatible with Phase 3.
 *
 * Extended properties are optional during
 * the Phase 4 migration.
 */
export interface GameState {
  zones: Record<GameZone, number[]>;
  normalSummonUsed: boolean;
  usedEffects: string[];
  actionHistory: GameAction[];

  fieldState?: FieldState;
  turnState?: TurnState;
  effectUsage?: EffectUsageRecord[];
  restrictions?: GameRestriction[];

  cardInstances?: CardInstanceState;

  xyzMaterials?: XyzMaterialAttachment[];
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

export interface XyzMaterialAttachment {
  xyzInstanceId: string;
  materialInstanceIds: string[];
}