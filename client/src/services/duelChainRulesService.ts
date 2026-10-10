
import type {
  ChainLink,
  DuelRulesState,
  PlayerId,
  RuleResult,
} from "../models/DuelRules";

import {
  validateActivation,
  type ActivationRule,
} from "./duelActivationRulesService";

export interface ChainResolution {
  resolved: ChainLink[];
  skipped: ChainLink[];
  state: DuelRulesState;
}

function otherPlayer(
  player: PlayerId
): PlayerId {
  return player === "player"
    ? "opponent"
    : "player";
}

export function addChainLink(
  state: DuelRulesState,
  rule: ActivationRule,
  targetInstanceIds: string[] = []
): RuleResult {
  const check = validateActivation(state, rule);

  if (!check.legal) {
    return { ...check, state };
  }

  if (state.priorityPlayer !== rule.player) {
    return {
      legal: false,
      errors: ["Player does not have response priority."],
      warnings: [],
      state,
    };
  }

  if (state.chain.some(
    link => link.id === `${rule.effectId}:${state.chain.length + 1}`
  )) {
    return {
      legal: false,
      errors: ["Duplicate chain link identifier."],
      warnings: [],
      state,
    };
  }

  const next = structuredClone(state);

  const link: ChainLink = {
    id: `${rule.effectId}:${next.chain.length + 1}`,
    effectId: rule.effectId,
    player: rule.player,
    speed: rule.speed,
    sourceInstanceId: rule.sourceInstanceId,
    targetInstanceIds: [...targetInstanceIds],
    negated: false,
  };

  next.chain.push(link);
  next.priorityPlayer = otherPlayer(rule.player);
  next.consecutivePasses = 0;

  return {
    legal: true,
    errors: [],
    warnings: check.warnings,
    state: next,
  };
}

export function passChainPriority(
  state: DuelRulesState,
  player: PlayerId
): RuleResult {
  if (state.priorityPlayer !== player) {
    return {
      legal: false,
      errors: ["It is not this player's priority."],
      warnings: [],
      state,
    };
  }

  const next = structuredClone(state);

  next.consecutivePasses++;
  next.priorityPlayer = otherPlayer(player);

  return {
    legal: true,
    errors: [],
    warnings: [],
    state: next,
  };
}

export function negateChainLink(
  state: DuelRulesState,
  linkId: string
): RuleResult {
  const next = structuredClone(state);

  const link = next.chain.find(
    item => item.id === linkId
  );

  if (!link) {
    return {
      legal: false,
      errors: ["Chain link does not exist."],
      warnings: [],
      state,
    };
  }

  link.negated = true;

  return {
    legal: true,
    errors: [],
    warnings: [
      "Negation authorization must be validated by the negating effect.",
    ],
    state: next,
  };
}

/**
 * Returns chain links in resolution order.
 *
 * This does not execute their card effects.
 * An external resolver must apply each
 * supported effect and handle resolution
 * failures appropriately.
 */
export function resolveChainOrder(
  state: DuelRulesState
): ChainResolution {
  if (state.consecutivePasses < 2) {
    throw new Error(
      "Both players must pass before chain resolution."
    );
  }

  const next = structuredClone(state);

  const reversed = [...next.chain].reverse();

  const resolved = reversed.filter(
    link => !link.negated
  );

  const skipped = reversed.filter(
    link => link.negated
  );

  next.chain = [];
  next.consecutivePasses = 0;
  next.priorityPlayer = next.turnPlayer;

  return {
    resolved,
    skipped,
    state: next,
  };
}
