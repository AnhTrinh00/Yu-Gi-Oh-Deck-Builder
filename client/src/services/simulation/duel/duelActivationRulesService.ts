
import type {
  DuelPhase,
  DuelRulesState,
  PlayerId,
  RuleCheck,
  RuleZone,
  SpellSpeed,
} from "../../../models/simulation/DuelRules";

export interface ActivationRule {
  effectId: string;
  sourceInstanceId: string;
  player: PlayerId;
  speed: SpellSpeed;
  allowedPhases: DuelPhase[];
  allowedSourceZones: RuleZone[];
  usageKey?: string;
  requiresOwnTurn?: boolean;
  requiresOpenGameState?: boolean;
}

export function validateActivation(
  state: DuelRulesState,
  rule: ActivationRule
): RuleCheck {
  const errors: string[] = [];

  const source = state.cards.find(
    card => card.instanceId === rule.sourceInstanceId
  );

  if (!source) {
    errors.push("Effect source does not exist.");
  } else {
    if (source.controller !== rule.player) {
      errors.push("Player does not control the source.");
    }

    if (!rule.allowedSourceZones.includes(source.zone)) {
      errors.push("Source is in an invalid activation zone.");
    }
  }

  if (!rule.allowedPhases.includes(state.phase)) {
    errors.push("Effect cannot activate in this phase.");
  }

  if (rule.requiresOwnTurn &&
      state.turnPlayer !== rule.player) {
    errors.push("Effect requires the player's own turn.");
  }

  if (rule.usageKey &&
      state.usedEffectKeys.includes(rule.usageKey)) {
    errors.push("Effect usage limit has been reached.");
  }

  if (state.restrictions.some(
    restriction =>
      restriction.player === rule.player &&
      restriction.kind === "no-activation"
  )) {
    errors.push("A restriction prevents activation.");
  }

  if (state.chain.length > 0) {
    const last = state.chain[state.chain.length - 1];

    if (rule.speed === 1) {
      errors.push(
        "Spell Speed 1 cannot respond to an existing chain."
      );
    } else if (rule.speed < last.speed) {
      errors.push(
        "Response Spell Speed is too low."
      );
    }
  } else if (
    rule.requiresOpenGameState &&
    state.priorityPlayer !== rule.player
  ) {
    errors.push("Player does not have priority.");
  }

  if (rule.speed < 1 || rule.speed > 3) {
    errors.push("Invalid Spell Speed.");
  }

  return {
    legal: errors.length === 0,
    errors,
    warnings: [
      "This checks declared requirements, not all official activation windows.",
    ],
  };
}
