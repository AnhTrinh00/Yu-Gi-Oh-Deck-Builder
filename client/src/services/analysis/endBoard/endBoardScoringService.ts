import type { GameState } from "../../../models/simulation/GameState";

import type {
  DisruptionAnalysis,
} from "../../../models/analysis/DisruptionAnalysis";

import type {
  EndBoardScore,
  EndBoardScoreWeights,
  EndBoardScoreComparison,
} from "../../../models/analysis/EndBoardScore";

import {
  analyzeEndBoard,
} from "./endBoardAnalysisService";

import {
  evaluateEndBoardResources,
} from "./endBoardResourceService";

export const DEFAULT_SCORE_WEIGHTS:
  EndBoardScoreWeights = {
    disruptions: 40,
    boardPresence: 25,
    resources: 25,
    flexibility: 10,
  };

function clamp(
  value: number,
  min: number,
  max: number
): number {
  return Math.min(max, Math.max(min, value));
}

function normalize(
  value: number,
  maximum: number
): number {
  return clamp(value / maximum, 0, 1);
}

function validateWeights(
  weights: EndBoardScoreWeights
): void {
  const values = Object.values(weights);

  if (
    values.some(
      (value) =>
        !Number.isFinite(value) || value < 0
    )
  ) {
    throw new Error(
      "Scoring weights must be finite, non-negative numbers."
    );
  }

  const total = values.reduce(
    (sum, value) => sum + value,
    0
  );

  if (Math.abs(total - 100) > 0.000001) {
    throw new Error(
      "Scoring weights must total 100."
    );
  }
}

export function scoreEndBoard(
  state: GameState,
  disruptions: DisruptionAnalysis,
  weights: EndBoardScoreWeights =
    DEFAULT_SCORE_WEIGHTS
): EndBoardScore {
  validateWeights(weights);

  const board = analyzeEndBoard(state);

  const resources =
    evaluateEndBoardResources(state);

  const warnings = [
    ...board.warnings,
    ...disruptions.warnings,
  ];

  if (!board.complete) {
    warnings.push(
      "End-board state is incomplete."
    );
  }

  if (!disruptions.complete) {
    warnings.push(
      "Disruption analysis is incomplete."
    );
  }

  // Only count candidates that passed the
  // implemented activation checks.
  const disruptionFactor = normalize(
    disruptions.conditionallyAvailableCount,
    4
  );

  // Monsters and back-row are presence
  // indicators, not proof of protection.
  const boardPresenceFactor =
    normalize(board.monsterCount, 5) * 0.7 +
    normalize(board.spellTrapCount, 5) * 0.3;

  // Hand cards are weighted more heavily than
  // graveyard inventory, which may be unusable.
  const resourceFactor =
    normalize(resources.hand.total, 5) * 0.6 +
    normalize(resources.graveyard.total, 8) * 0.2 +
    normalize(resources.xyzMaterials, 4) * 0.2;

  // Normal Summon availability is a proxy for
  // flexibility, not a guarantee of another play.
  const flexibilityFactor =
    (resources.normalSummonAvailable ? 0.6 : 0) +
    normalize(resources.extraDeck.total, 15) * 0.4;

  const breakdown = {
    disruptions:
      disruptionFactor * weights.disruptions,

    boardPresence:
      boardPresenceFactor *
      weights.boardPresence,

    resources:
      resourceFactor * weights.resources,

    flexibility:
      flexibilityFactor * weights.flexibility,
  };

  const total = Object.values(
    breakdown
  ).reduce(
    (sum, value) => sum + value,
    0
  );

  const confidence =
    board.complete &&
    disruptions.complete &&
    disruptions.unknownCount === 0 &&
    disruptions.potentialCount === 0
      ? "evaluated"
      : "partial";

  if (disruptions.unknownCount > 0) {
    warnings.push(
      `${disruptions.unknownCount} disruption(s) have unknown activation availability.`
    );
  }

  if (disruptions.potentialCount > 0) {
    warnings.push(
      `${disruptions.potentialCount} disruption(s) have not completed activation validation.`
    );
  }

  warnings.push(
    "This is a heuristic board score, not a verified measure of competitive strength."
  );

  return {
    total: Math.round(total * 100) / 100,
    breakdown,
    weights: { ...weights },
    confidence,
    warnings,
  };
}

export function compareEndBoardScores(
  firstState: GameState,
  firstDisruptions: DisruptionAnalysis,
  secondState: GameState,
  secondDisruptions: DisruptionAnalysis,
  weights: EndBoardScoreWeights =
    DEFAULT_SCORE_WEIGHTS
): EndBoardScoreComparison {
  const first = scoreEndBoard(
    firstState,
    firstDisruptions,
    weights
  );

  const second = scoreEndBoard(
    secondState,
    secondDisruptions,
    weights
  );

  const scoreDifference =
    Math.round(
      (first.total - second.total) * 100
    ) / 100;

  return {
    first,
    second,
    scoreDifference,

    winner:
      scoreDifference > 0
        ? "first"
        : scoreDifference < 0
          ? "second"
          : "tie",
  };
}