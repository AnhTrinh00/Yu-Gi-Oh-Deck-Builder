export interface ResourceCount {
  total: number;
  unique: number;
}

export interface EndBoardResourceSnapshot {
  hand: ResourceCount;
  deck: ResourceCount;
  extraDeck: ResourceCount;
  graveyard: ResourceCount;
  banished: ResourceCount;

  fieldMonsters: number;
  fieldSpellTraps: number;
  xyzMaterials: number;

  normalSummonAvailable: boolean;

  usedEffectCount: number;
  activeRestrictionCount: number;

  totalAccessibleResources: number;
}

export interface ResourceComparison {
  before: EndBoardResourceSnapshot;
  after: EndBoardResourceSnapshot;

  handChange: number;
  deckChange: number;
  extraDeckChange: number;
  graveyardChange: number;
  banishedChange: number;

  fieldMonsterChange: number;
  xyzMaterialChange: number;

  netHandAdvantage: number;
}