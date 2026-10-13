
import type {
  DuelRulesState,
  PlayerId,
  RuleCheck,
  RuleZone,
} from "../../../models/simulation/DuelRules";

export interface TargetRule {
  player: PlayerId;
  minimum: number;
  maximum: number;
  allowedZones: RuleZone[];
  allowedControllers?: PlayerId[];
  requireFaceUp?: boolean;
  requireAffectable?: boolean;
}

export function validateTargets(
  state: DuelRulesState,
  instanceIds: string[],
  rule: TargetRule
): RuleCheck {
  const errors: string[] = [];

  if (new Set(instanceIds).size !== instanceIds.length) {
    errors.push("Duplicate targets are not allowed.");
  }

  if (
    instanceIds.length < rule.minimum ||
    instanceIds.length > rule.maximum
  ) {
    errors.push("Incorrect number of targets.");
  }

  if (state.restrictions.some(
    restriction =>
      restriction.player === rule.player &&
      restriction.kind === "no-targeting"
  )) {
    errors.push("Targeting is restricted.");
  }

  for (const id of instanceIds) {
    const card = state.cards.find(
      item => item.instanceId === id
    );

    if (!card) {
      errors.push(`Target ${id} does not exist.`);
      continue;
    }

    if (!rule.allowedZones.includes(card.zone)) {
      errors.push(`Target ${id} is in an invalid zone.`);
    }

    if (
      rule.allowedControllers &&
      !rule.allowedControllers.includes(card.controller)
    ) {
      errors.push(`Target ${id} has an invalid controller.`);
    }

    if (rule.requireFaceUp && !card.faceUp) {
      errors.push(`Target ${id} must be face-up.`);
    }

    if (!card.canBeTargeted) {
      errors.push(`Target ${id} cannot be targeted.`);
    }

    if (rule.requireAffectable &&
        card.unaffectedByEffects) {
      errors.push(
        `Target ${id} is unaffected by this simplified effect.`
      );
    }
  }

  return {
    legal: errors.length === 0,
    errors,
    warnings: [],
  };
}

export function revalidateTargetsAtResolution(
  state: DuelRulesState,
  instanceIds: string[],
  rule: TargetRule
): RuleCheck {
  return validateTargets(
    state,
    instanceIds,
    rule
  );
}
