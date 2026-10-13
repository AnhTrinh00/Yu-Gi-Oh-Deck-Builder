
import type {
  DuelRulesState,
  RuleCheck,
} from "../../../models/DuelRules";

import {
  validateActivation,
  type ActivationRule,
} from "./duelActivationRulesService";

import {
  validateSummon,
  type SummonRequest,
} from "../duel/duelSummoningRulesService";

import {
  validateTargets,
  type TargetRule,
} from "../duel/duelTargetingRulesService";

export interface EffectLegalityRequest {
  activation: ActivationRule;
  targets?: {
    instanceIds: string[];
    rule: TargetRule;
  };
}

export function validateEffectLegality(
  state: DuelRulesState,
  request: EffectLegalityRequest
): RuleCheck {
  const activation = validateActivation(
    state,
    request.activation
  );

  const targetCheck = request.targets
    ? validateTargets(
        state,
        request.targets.instanceIds,
        request.targets.rule
      )
    : {
        legal: true,
        errors: [],
        warnings: [],
      };

  return {
    legal: activation.legal && targetCheck.legal,
    errors: [
      ...activation.errors,
      ...targetCheck.errors,
    ],
    warnings: [
      ...activation.warnings,
      ...targetCheck.warnings,
    ],
  };
}

export function validateSummonLegality(
  state: DuelRulesState,
  request: SummonRequest
): RuleCheck {
  return validateSummon(state, request);
}
