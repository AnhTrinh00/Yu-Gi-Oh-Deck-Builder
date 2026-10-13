
export type PlayerId = "player" | "opponent";

export type DuelPhase =
  | "draw"
  | "standby"
  | "main1"
  | "battle"
  | "main2"
  | "end";

export type SpellSpeed = 1 | 2 | 3;

export type RuleZone =
  | "hand"
  | "deck"
  | "extra"
  | "monster"
  | "spell-trap"
  | "field-spell"
  | "graveyard"
  | "banished";

export type MonsterPosition =
  | "face-up-attack"
  | "face-up-defense"
  | "face-down-defense";

export interface RuleCard {
  instanceId: string;
  cardId: number;
  owner: PlayerId;
  controller: PlayerId;
  zone: RuleZone;
  faceUp: boolean;
  monsterPosition?: MonsterPosition;
  level?: number;
  monsterTypes?: Array<
    "fusion" | "synchro" | "xyz" | "link" | "ritual"
  >;
  canBeTargeted: boolean;
  unaffectedByEffects: boolean;
}

export interface RuleRestriction {
  id: string;
  player: PlayerId;
  kind:
    | "no-activation"
    | "no-special-summon"
    | "no-normal-summon"
    | "no-targeting";
  expiresAtTurnEnd: boolean;
}

export interface ChainLink {
  id: string;
  effectId: string;
  player: PlayerId;
  speed: SpellSpeed;
  sourceInstanceId: string;
  targetInstanceIds: string[];
  negated: boolean;
}

export interface DuelRulesState {
  turnNumber: number;
  turnPlayer: PlayerId;
  phase: DuelPhase;

  cards: RuleCard[];

  normalSummonsUsed: Record<PlayerId, number>;
  normalSummonLimits: Record<PlayerId, number>;

  restrictions: RuleRestriction[];
  usedEffectKeys: string[];

  chain: ChainLink[];
  priorityPlayer: PlayerId;
  consecutivePasses: number;
}

export interface RuleCheck {
  legal: boolean;
  errors: string[];
  warnings: string[];
}

export interface RuleResult<T = DuelRulesState>
  extends RuleCheck {
  state: T;
}

export function createDuelRulesState(
  cards: RuleCard[] = []
): DuelRulesState {
  return {
    turnNumber: 1,
    turnPlayer: "player",
    phase: "main1",
    cards: structuredClone(cards),
    normalSummonsUsed: {
      player: 0,
      opponent: 0,
    },
    normalSummonLimits: {
      player: 1,
      opponent: 1,
    },
    restrictions: [],
    usedEffectKeys: [],
    chain: [],
    priorityPlayer: "player",
    consecutivePasses: 0,
  };
}
