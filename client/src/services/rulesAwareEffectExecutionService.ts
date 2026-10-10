
import type {
  GameState,
} from "../models/GameState";

import type {
  DuelRulesState,
} from "../models/DuelRules";

import type {
  EffectExecutionSelections,
} from "../models/EffectExecutionSelection";

import {
  executeRegisteredEffectWithSelections,
} from "./registeredEffectSelectionService";

import type {
  EffectRegistryReader,
  RegisteredEffectExecutionResult,
} from "./registeredEffectExecutionService";

import {
  validateEffectLegality,
  type EffectLegalityRequest,
} from "./duelRulesEngineService";

export interface RulesAwareExecutionResult {
  success: boolean;
  gameState: GameState;
  rulesState: DuelRulesState;
  execution?: RegisteredEffectExecutionResult;
  errors: string[];
  warnings: string[];
}

export function executeRulesAwareEffect(
  gameState: GameState,
  rulesState: DuelRulesState,
  registry: EffectRegistryReader,
  effectId: string,
  selections: EffectExecutionSelections,
  legalityRequest: EffectLegalityRequest
): RulesAwareExecutionResult {
  if (legalityRequest.activation.effectId !== effectId) {
    return {
      success: false,
      gameState,
      rulesState,
      errors: [
        "Legality request does not match the registered effect.",
      ],
      warnings: [],
    };
  }

  const check = validateEffectLegality(
    rulesState,
    legalityRequest
  );

  if (!check.legal) {
    return {
      success: false,
      gameState,
      rulesState,
      errors: check.errors,
      warnings: check.warnings,
    };
  }

  const execution =
    executeRegisteredEffectWithSelections(
      gameState,
      registry,
      effectId,
      selections
    );

  if (!execution.success) {
    return {
      success: false,
      gameState,
      rulesState,
      execution,
      errors: execution.errors,
      warnings: [
        ...check.warnings,
        ...execution.warnings,
      ],
    };
  }

  // We deliberately do not claim that the
  // rules context has been synchronized.
  //
  // A future adapter must apply the
  // resulting instance movements to both
  // representations atomically.
  return {
    success: true,
    gameState: execution.state,
    rulesState,
    execution,
    errors: [],
    warnings: [
      ...check.warnings,
      ...execution.warnings,
      "Rules context requires synchronization before another rules-aware action.",
    ],
  };
}
