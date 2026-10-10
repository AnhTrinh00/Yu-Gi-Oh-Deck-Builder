
import type {
  EffectExecutionSelections,
} from "./EffectExecutionSelection";

export interface ComboCandidate {
  id: string;
  effectId: string;
  sourceCardId: number;
  description: string;
  selections?: EffectExecutionSelections;
}

export interface CandidateGenerationOptions {
  maxCandidates?: number;
  includeExperimental?: boolean;
}

export interface CandidateGenerationResult {
  candidates: ComboCandidate[];
  rejected: Array<{
    effectId: string;
    reason: string;
  }>;
  truncated: boolean;
}
