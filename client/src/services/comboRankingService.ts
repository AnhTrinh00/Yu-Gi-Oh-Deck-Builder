
import type { GameState } from "../models/GameState";
import type { ComboSearchResult } from "../models/ComboSearch";
import type {
  ComboEvaluationConfig,
  ComboRankingResult,
  EvaluatedCombo,
  VerifiedInteraction,
} from "../models/ComboEvaluation";

import {
  DEFAULT_COMBO_EVALUATION_CONFIG,
} from "./comboEvaluationConfigService";

import {
  evaluateCombo,
} from "./comboScoringService";

export function rankDiscoveredCombos(
  initialState: GameState,
  searchResult: ComboSearchResult,
  interactions: VerifiedInteraction[] = [],
  config: ComboEvaluationConfig =
    DEFAULT_COMBO_EVALUATION_CONFIG
): ComboRankingResult {
  const ranked: EvaluatedCombo[] =
    searchResult.combos.map(
      combo => evaluateCombo(
        initialState,
        combo,
        interactions,
        config
      )
    );

  ranked.sort((a, b) => {
    if (a.score !== b.score) {
      return b.score - a.score;
    }

    if (a.interactions.total !== b.interactions.total) {
      return b.interactions.total -
        a.interactions.total;
    }

    if (a.resources.finalHand !== b.resources.finalHand) {
      return b.resources.finalHand -
        a.resources.finalHand;
    }

    if (a.resources.actionsUsed !== b.resources.actionsUsed) {
      return a.resources.actionsUsed -
        b.resources.actionsUsed;
    }

    return a.combo.id.localeCompare(b.combo.id);
  });

  const warnings = [...searchResult.warnings];

  if (searchResult.stats.truncated) {
    warnings.push(
      "Search was truncated; the highest-ranked discovered combo may not be the best possible combo."
    );
  }

  if (interactions.length === 0) {
    warnings.push(
      "No interaction metadata was supplied; interaction scores will be zero."
    );
  }

  warnings.push(
    "Scores are heuristic and do not establish official Yu-Gi-Oh! combo legality."
  );

  return {
    ranked,
    best: ranked[0],
    evaluatedCount: ranked.length,
    warnings,
  };
}
