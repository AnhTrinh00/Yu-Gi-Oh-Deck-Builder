import type {
  EffectExecutionSelections,
} from "../effect/EffectExecutionSelection";

export interface RegisteredComboAction {
  type: "registered-effect";
  id: string;
  effectId: string;
  selections?: EffectExecutionSelections;
  description?: string;
}

export type StructuredComboAction =
  RegisteredComboAction;

export type ComboFailureMode =
  | "stop-on-failure"
  | "atomic";

export interface StructuredComboOptions {
  failureMode?: ComboFailureMode;
}

export interface StructuredComboStepResult {
  actionId: string;
  effectId: string;
  success: boolean;
  error?: string;
}

export interface StructuredComboResult {
  success: boolean;
  completedActions: number;
  totalActions: number;
  failedActionIndex?: number;
  errors: string[];
  steps: StructuredComboStepResult[];
}
