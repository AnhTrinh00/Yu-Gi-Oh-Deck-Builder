import type { CardRelationshipType } from "./CardRelationship";

export interface ComboCandidateStep {
  sourceCardId: number;
  targetCardId: number;
  relationshipTypes: CardRelationshipType[];
}

export interface ComboCandidate {
  id: string;
  starterCardId: number;
  targetCardId: number;
  cardIds: number[];
  steps: ComboCandidateStep[];
  score: number;
  reasons: string[];
}

export interface ComboDiscoveryOptions {
  maxDepth: number;
  maxCandidates: number;
  minDepth: number;
  maxExploredStates: number;
}

export interface ComboDiscoveryDiagnostics {
  exploredStates: number;
  generatedCandidates: number;
  returnedCandidates: number;
  prunedBranches: number;
  budgetExhausted: boolean;
  complete: boolean;
  invalidOptions: boolean;
}

export interface ComboDiscoveryResult {
  candidates: ComboCandidate[];
  diagnostics: ComboDiscoveryDiagnostics;
}

export const DEFAULT_DISCOVERY_OPTIONS: ComboDiscoveryOptions = {
  maxDepth: 4,
  maxCandidates: 30,
  minDepth: 1,
  maxExploredStates: 10000,
};