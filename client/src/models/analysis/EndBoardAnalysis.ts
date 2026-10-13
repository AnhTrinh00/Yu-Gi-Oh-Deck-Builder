import type {
  EffectUsageRecord,
  GameRestriction,
  GameZone,
  MonsterPosition,
  SpellTrapPosition,
  TurnState,
} from "../simulation/GameState";

export interface EndBoardCard {
  cardId: number;
  instanceId: string;
  zoneIndex: number;
}

export interface EndBoardMonster extends EndBoardCard {
  position: MonsterPosition;
  xyzMaterials: Array<{
    cardId: number;
    instanceId: string;
  }>;
}

export interface EndBoardSpellTrap extends EndBoardCard {
  position: SpellTrapPosition;
}

export interface EndBoardResource {
  cardIds: number[];
  count: number;
}

export type EndBoardResources = Record<
  Exclude<GameZone, "field">,
  EndBoardResource
>;

export interface EndBoardAnalysis {
  complete: boolean;
  warnings: string[];

  monsters: EndBoardMonster[];
  spellTraps: EndBoardSpellTrap[];
  fieldSpell: EndBoardSpellTrap | null;

  monsterCount: number;
  spellTrapCount: number;
  xyzMaterialCount: number;

  resources: EndBoardResources;

  normalSummonUsed: boolean;
  usedEffects: string[];
  effectUsage: EffectUsageRecord[];
  restrictions: GameRestriction[];
  turnState: TurnState | null;
}