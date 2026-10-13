import type { DiscoveredCombo } from "./ComboSearch";

export type ComboScoreCategory =
  | "board"
  | "interactions"
  | "hand"
  | "resources"
  | "efficiency";

export type InteractionKind =
  | "negation"
  | "removal"
  | "disruption"
  | "protection";

export interface VerifiedInteraction {
  cardId: number;
  kind: InteractionKind;
  label: string;

  // Maximum uses available per fielded copy.
  // This is an explicit metadata declaration,
  // not an inferred card effect.
  usesPerCopy: number;

  verification: "manually-verified" | "experimental";
}

export interface ComboEvaluationWeights {
  board: number;
  interactions: number;
  hand: number;
  resources: number;
  efficiency: number;
}

export interface ComboEvaluationConfig {
  weights: ComboEvaluationWeights;

  // Reference values at which a category
  // reaches its maximum score.
  targets: {
    fieldCards: number;
    interactions: number;
    handCards: number;
    remainingResources: number;
    efficientActions: number;
  };

  // Whether experimental interaction metadata
  // is permitted in scoring.
  includeExperimentalInteractions: boolean;
}

export interface ComboResourceMetrics {
  initialHand: number;
  finalHand: number;
  handDelta: number;

  initialField: number;
  finalField: number;
  fieldDelta: number;

  initialGraveyard: number;
  finalGraveyard: number;

  initialBanished: number;
  finalBanished: number;

  initialDeck: number;
  finalDeck: number;

  initialExtra: number;
  finalExtra: number;

  actionsUsed: number;
}

export interface ComboInteractionMetrics {
  total: number;
  negations: number;
  removals: number;
  disruptions: number;
  protections: number;
  details: Array<{
    cardId: number;
    label: string;
    kind: InteractionKind;
    count: number;
  }>;
}

export type ComboCategoryScores = Record<ComboScoreCategory, number>;

export interface EvaluatedCombo {
  combo: DiscoveredCombo;
  score: number;
  categoryScores: ComboCategoryScores;
  resources: ComboResourceMetrics;
  interactions: ComboInteractionMetrics;
  strengths: string[];
  weaknesses: string[];
}

export interface ComboRankingResult {
  ranked: EvaluatedCombo[];
  best?: EvaluatedCombo;
  evaluatedCount: number;
  warnings: string[];
}

export interface ComboComparison {
  first: EvaluatedCombo;
  second: EvaluatedCombo;
  scoreDifference: number;
  winner: "first" | "second" | "tie";
  differences: Array<{
    category: ComboScoreCategory;
    firstScore: number;
    secondScore: number;
    difference: number;
  }>;
}
