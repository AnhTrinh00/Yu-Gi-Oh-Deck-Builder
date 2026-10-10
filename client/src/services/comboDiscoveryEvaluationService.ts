
import type { GameState } from "../models/GameState";
import type {
  ComboSearchOptions,
  ComboSearchResult,
} from "../models/ComboSearch";
import type {
  ComboEvaluationConfig,
  ComboRankingResult,
  VerifiedInteraction,
} from "../models/ComboEvaluation";

import {
  discoverCombos,
  type SearchEffectRegistry,
} from "./automatedComboSearchService";

import {
  rankDiscoveredCombos,
} from "./comboRankingService";

import {
  DEFAULT_COMBO_EVALUATION_CONFIG,
} from "./comboEvaluationConfigService";

export interface ComboDiscoveryEvaluationResult {
  search: ComboSearchResult;
  ranking: ComboRankingResult;
}

export function discoverAndRankCombos(
  initialState: GameState,
  registry: SearchEffectRegistry,
  interactions: VerifiedInteraction[] = [],
  searchOptions: ComboSearchOptions = {},
  evaluationConfig: ComboEvaluationConfig =
    DEFAULT_COMBO_EVALUATION_CONFIG
): ComboDiscoveryEvaluationResult {
  const search = discoverCombos(
    initialState,
    registry,
    searchOptions
  );

  const ranking = rankDiscoveredCombos(
    initialState,
    search,
    interactions,
    evaluationConfig
  );

  return {
    search,
    ranking,
  };
}
