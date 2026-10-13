import type { CardEffectDefinition } from "./CardEffect";
import type { EffectExecutionSelections } from "./EffectExecutionSelection";
import type { GameState } from "../simulation/GameState";

export interface PendingEffectLink {
  chainLinkId: string;
  effect: CardEffectDefinition;
  selections: EffectExecutionSelections;
  negated: boolean;
}

export interface EffectChainState {
  gameState: GameState;
  links: PendingEffectLink[];
  nextLinkNumber: number;
}

export interface EffectChainResult {
  success: boolean;
  chain: EffectChainState;
  errors: string[];
  warnings: string[];
}

export interface ChainResolutionEntry {
  chainLinkId: string;
  effectId: string;
  status: "resolved" | "negated" | "failed";
  completedSteps: number;
  error?: string;
  skippedSteps?: number[];
}

export interface ChainResolutionResult {
  success: boolean;
  chain: EffectChainState;
  entries: ChainResolutionEntry[];
  errors: string[];
}