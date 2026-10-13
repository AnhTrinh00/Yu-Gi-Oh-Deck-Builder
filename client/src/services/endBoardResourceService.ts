import type {
  GameState,
  GameZone,
} from "../models/GameState";

import type {
  ResourceCount,
  EndBoardResourceSnapshot,
  ResourceComparison,
} from "../models/EndBoardResources";

import {
  analyzeEndBoard,
} from "./endBoardAnalysisService";

function countResources(
  state: GameState,
  zone: GameZone
): ResourceCount {
  const cards = state.zones[zone];

  return {
    total: cards.length,
    unique: new Set(cards).size,
  };
}

export function evaluateEndBoardResources(
  state: GameState
): EndBoardResourceSnapshot {
  const board = analyzeEndBoard(state);

  const hand = countResources(state, "hand");
  const deck = countResources(state, "deck");
  const extraDeck = countResources(state, "extra");
  const graveyard = countResources(state, "graveyard");
  const banished = countResources(state, "banished");

  return {
    hand,
    deck,
    extraDeck,
    graveyard,
    banished,

    fieldMonsters: board.monsterCount,
    fieldSpellTraps: board.spellTrapCount,
    xyzMaterials: board.xyzMaterialCount,

    normalSummonAvailable:
      !state.normalSummonUsed,

    usedEffectCount:
      new Set([
        ...state.usedEffects,
        ...(state.effectUsage ?? [])
          .filter(
            (usage) =>
              state.turnState === undefined ||
              usage.turnNumber ===
                state.turnState.turnNumber
          )
          .map((usage) => usage.usageKey),
      ]).size,

    activeRestrictionCount:
      state.restrictions?.length ?? 0,

    totalAccessibleResources:
      hand.total +
      graveyard.total +
      board.monsterCount +
      board.spellTrapCount +
      board.xyzMaterialCount,
  };
}

export function compareEndBoardResources(
  beforeState: GameState,
  afterState: GameState
): ResourceComparison {
  const before =
    evaluateEndBoardResources(beforeState);

  const after =
    evaluateEndBoardResources(afterState);

  return {
    before,
    after,

    handChange:
      after.hand.total - before.hand.total,

    deckChange:
      after.deck.total - before.deck.total,

    extraDeckChange:
      after.extraDeck.total -
      before.extraDeck.total,

    graveyardChange:
      after.graveyard.total -
      before.graveyard.total,

    banishedChange:
      after.banished.total -
      before.banished.total,

    fieldMonsterChange:
      after.fieldMonsters -
      before.fieldMonsters,

    xyzMaterialChange:
      after.xyzMaterials -
      before.xyzMaterials,

    netHandAdvantage:
      after.hand.total - before.hand.total,
  };
}