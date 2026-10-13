
import type { GameState } from "../simulation/GameState";
import type { ComboCandidate } from "./ComboDiscovery";
import type { EffectExecutionSelections } from "../effect/EffectExecutionSelection";

export interface ComboSearchAction extends ComboCandidate {
  selections: EffectExecutionSelections;
}

export interface DiscoveredCombo {
  id: string;
  actions: ComboSearchAction[];
  finalState: GameState;
  depth: number;
  stateKey: string;
}

export interface ComboSearchOptions {
  maxDepth?: number;
  maxNodes?: number;
  maxResults?: number;
  maxCandidatesPerNode?: number;
  maxSelectionBranches?: number;
  includeExperimental?: boolean;
}

export interface ComboSearchStats {
  exploredNodes: number;
  generatedTransitions: number;
  successfulTransitions: number;
  rejectedTransitions: number;
  duplicateStates: number;
  truncated: boolean;
}

export interface ComboSearchResult {
  initialState: GameState;
  combos: DiscoveredCombo[];
  stats: ComboSearchStats;
  warnings: string[];
}
