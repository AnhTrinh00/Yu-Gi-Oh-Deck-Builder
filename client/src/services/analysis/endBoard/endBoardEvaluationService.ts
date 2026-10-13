
import type { GameState } from "../../../models/simulation/GameState";
import type { EndBoardAnalysis } from "../../../models/analysis/EndBoardAnalysis";
import type { EndBoardResourceSnapshot } from "../../../models/analysis/EndBoardResources";
import type { DisruptionAnalysis } from "../../../models/analysis/DisruptionAnalysis";
import type {
  EndBoardScore,
  EndBoardScoreWeights,
} from "../../../models/analysis/EndBoardScore";

import type {
  EffectActivationDefinition,
} from "../../../models/effect/EffectActivation";

import {
  analyzeEndBoard,
} from "./endBoardAnalysisService";

import {
  evaluateEndBoardResources,
} from "./endBoardResourceService";

import {
  scoreEndBoard,
  DEFAULT_SCORE_WEIGHTS,
} from "./endBoardScoringService";

import {
  CardEffectRegistry,
} from "../../effect/cardEffectRegistryService";

import {
  analyzeRegisteredDisruptions,
  type DisruptionMetadata,
} from "../disruption/registeredDisruptionService";

export interface EndBoardEvaluationOptions {
  registry?: CardEffectRegistry;
  metadata?: DisruptionMetadata[];
  activations?: EffectActivationDefinition[];
}

export interface EndBoardEvaluation {
  board: EndBoardAnalysis;
  resources: EndBoardResourceSnapshot;
  disruptions: DisruptionAnalysis;
  score: EndBoardScore;
}

/**
 * Evaluates a synchronized end-board snapshot.
 *
 * Disruption analysis requires registered effect metadata.
 * Missing definitions must not be interpreted as
 * proof that a board has no interruptions.
 */
export function evaluateEndBoard(
  state: GameState,
  weights: EndBoardScoreWeights = DEFAULT_SCORE_WEIGHTS,
  options: EndBoardEvaluationOptions = {}
): EndBoardEvaluation {
  const board = analyzeEndBoard(state);

  const resources = evaluateEndBoardResources(state);

  const unavailable: DisruptionAnalysis = {
    disruptions: [],
    potentialCount: 0,
    conditionallyAvailableCount: 0,
    unavailableCount: 0,
    unknownCount: 0,
    complete: false,
    warnings: [
      "Registered disruption definitions have not been supplied.",
    ],
  };

  const disruptions =
    options.registry && options.metadata
      ? analyzeRegisteredDisruptions(
          state,
          options.registry,
          options.metadata,
          {
            activations: options.activations,
          }
        )
      : unavailable;

  const score = scoreEndBoard(
    state,
    disruptions,
    weights
  );

  return {
    board,
    resources,
    disruptions,
    score,
  };
}
