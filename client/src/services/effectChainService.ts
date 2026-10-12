import type {
  EffectChainResult,
  EffectChainState,
  ChainResolutionEntry,
  ChainResolutionResult,
} from "../models/EffectChain";

import type {
  CardEffectDefinition,
  EffectStep,
} from "../models/CardEffect";

import type {
  EffectExecutionSelections,
} from "../models/EffectExecutionSelection";

import type {
  GameState,
} from "../models/GameState";

import {
  normalizeGameState,
} from "./extendedGameStateService";

import {
  validateCardEffect,
} from "./cardEffectValidationService";

import {
  validateCardInstanceSync,
} from "./cardInstanceService";

import {
  isFieldSynchronized,
} from "./fieldZoneService";

import {
  validateSelectionContext,
  getSelectionForStep,
} from "./cardSelectionService";

import {
  executeSelectedEffectStep,
} from "./selectedEffectStepService";

import type {
  GameZone,
} from "../models/GameState";

import {
  getAttachedXyzMaterials,
} from "./xyzMaterialService";

import {
  payXyzDetachCost,
} from "./xyzDetachCostService";

import {
  bindCardEffectSource,
} from "./cardEffectSourceBindingService";

function copyState(state: GameState): GameState {
  return normalizeGameState(state);
}

function copyChain(
  chain: EffectChainState
): EffectChainState {
  return structuredClone(chain);
}

function fail(
  chain: EffectChainState,
  error: string
): EffectChainResult {
  return {
    success: false,
    chain,
    errors: [error],
    warnings: [],
  };
}

function validateState(
  state: GameState
): string[] {
  const errors: string[] = [];

  if (!state.cardInstances || !state.fieldState) {
    errors.push(
      "Extended card-instance and field tracking are required."
    );

    return errors;
  }

  errors.push(...validateCardInstanceSync(state));

  if (!isFieldSynchronized(state)) {
    errors.push("Field state is not synchronized.");
  }

  return errors;
}

function validateSelections(
  effect: CardEffectDefinition,
  selections: EffectExecutionSelections
): string[] {
  const errors = [
    ...validateSelectionContext(
      { selections: selections.costSelections },
      effect.costs.length
    ),
    ...validateSelectionContext(
      { selections: selections.resolutionSelections },
      effect.steps.length
    ),
  ];

  for (const selection of selections.costSelections) {
    if (selection.kind !== "cost") {
      errors.push(
        "Cost selections must have kind 'cost'."
      );
    }
  }

  for (const selection of selections.resolutionSelections) {
    if (selection.kind === "cost") {
      errors.push(
        "Resolution selections cannot have kind 'cost'."
      );
    }
  }

  return errors;
}

function costAsStep(
  cost: CardEffectDefinition["costs"][number]
): EffectStep | null {
  if (cost.type !== "move-card") {
    return null;
  }

  if (cost.to === "field") {
    return null;
  }

  return {
    type: "move",
    cardId: cost.cardId,
    from: cost.from,
    to: cost.to,
  };
}

function recordActivationUsage(
  state: GameState,
  effect: CardEffectDefinition
): GameState {
  if (!effect.oncePerTurnKey) {
    return state;
  }

  const next = copyState(state);
  const key = effect.oncePerTurnKey;

  if (!next.usedEffects.includes(key)) {
    next.usedEffects.push(key);
  }

  next.effectUsage ??= [];

  next.effectUsage.push({
    usageKey: key,
    turnNumber: next.turnState?.turnNumber ?? 1,
  });

  return next;
}

function validateResolutionSelections(
  state: GameState,
  effect: CardEffectDefinition,
  selections: EffectExecutionSelections
): string[] {
  const errors: string[] = [];

  for (const selection of selections.resolutionSelections) {
    const step = effect.steps[selection.stepIndex];

    if (!step) {
      errors.push("Resolution step does not exist.");
      continue;
    }

    if (step.type === "draw") {
      errors.push(
        "Draw operations cannot have explicit selections."
      );
      continue;
    }

    const zone: GameZone =
      step.type === "search"
        ? "deck"
        : step.type === "destroy"
          ? "field"
          : step.from;

    const instance = state.cardInstances?.instances.find(
      item => item.instanceId === selection.instanceId
    );

    if (!instance) {
      errors.push(
        `Selected instance ${selection.instanceId} does not exist.`
      );
      continue;
    }

    if (instance.cardId !== step.cardId) {
      errors.push(
        `Selected instance has the wrong card ID for step ${selection.stepIndex}.`
      );
      continue;
    }

    if (
      selection.expectedZone !== undefined &&
      selection.expectedZone !== zone
    ) {
      errors.push(
        `Expected zone does not match step ${selection.stepIndex}.`
      );
    }

    // We deliberately do not require the card to
    // occupy its resolution zone at activation.
    // An earlier chain link may move it there.
  }

  return errors;
}

function validateActivationTargets(
  state: GameState,
  effect: CardEffectDefinition,
  selections: EffectExecutionSelections
): string[] {
  const errors: string[] = [];
  const targetIndexes = effect.targetStepIndexes ?? [];
  const seen = new Set<number>();

  for (const index of targetIndexes) {
    if (!Number.isSafeInteger(index) || index < 0) {
      errors.push(`Invalid target step index ${index}.`);
      continue;
    }

    if (seen.has(index)) {
      errors.push(`Duplicate target step index ${index}.`);
      continue;
    }

    seen.add(index);

    const step = effect.steps[index];

    if (!step || step.type === "draw") {
      errors.push(
        `Step ${index} cannot declare a target.`
      );
      continue;
    }

    const selection = getSelectionForStep(
      {
        selections: selections.resolutionSelections,
      },
      index
    );

    if (!selection || selection.kind !== "target") {
      errors.push(
        `Step ${index} requires a locked target.`
      );
      continue;
    }

    const zone: GameZone =
      step.type === "search"
        ? "deck"
        : step.type === "destroy"
          ? "field"
          : step.from;

    const instance = state.cardInstances?.instances.find(
      item => item.instanceId === selection.instanceId
    );

    if (
      !instance ||
      instance.cardId !== step.cardId ||
      instance.zone !== zone
    ) {
      errors.push(
        `Invalid activation target for step ${index}.`
      );
    }

    if (
      selection.expectedZone !== undefined &&
      selection.expectedZone !== zone
    ) {
      errors.push(
        `Target zone mismatch for step ${index}.`
      );
    }
  }

  for (const selection of selections.resolutionSelections) {
    const declared = seen.has(selection.stepIndex);

    if (selection.kind === "target" && !declared) {
      errors.push(
        `Step ${selection.stepIndex} does not declare targeting.`
      );
    }

    if (selection.kind === "choose" && declared) {
      errors.push(
        `Step ${selection.stepIndex} requires a target, not a choice.`
      );
    }
  }

  return errors;
}

export function createEffectChain(
  gameState: GameState
): EffectChainState {
  return {
    gameState: copyState(gameState),
    links: [],
    nextLinkNumber: 1,
  };
}

/**
 * Activates an effect and pays its declared costs.
 *
 * Resolution steps are NOT executed here.
 *
 * Failure is atomic: the original chain is returned.
 */
export function activateChainEffect(
  chain: EffectChainState,
  effect: CardEffectDefinition,
  selections: EffectExecutionSelections = {
    costSelections: [],
    resolutionSelections: [],
  }
): EffectChainResult {
  const stateErrors = validateState(chain.gameState);

  if (stateErrors.length > 0) {
    return fail(chain, stateErrors.join(" "));
  }

  const validation = validateCardEffect(
    chain.gameState,
    effect
  );

  if (!validation.valid) {
    return {
      success: false,
      chain,
      errors: validation.errors,
      warnings: validation.warnings,
    };
  }

  const selectionErrors = validateSelections(
    effect,
    selections
  );

  selectionErrors.push(
    ...validateResolutionSelections(
        chain.gameState,
        effect,
        selections
    )
  );

  selectionErrors.push(
    ...validateActivationTargets(
      chain.gameState,
      effect,
      selections
    )
  );

  if (selectionErrors.length > 0) {
    return fail(chain, selectionErrors.join(" "));
  }

  let current = copyState(chain.gameState);

  for (
    let index = 0;
    index < effect.costs.length;
    index++
  ) {
    const cost = effect.costs[index];

    const selected = getSelectionForStep(
      { selections: selections.costSelections },
      index
    );

    if (cost.type === "detach-xyz-material") {
      if (cost.count !== 1) {
        return fail(
          chain,
          "Only one material per detachment cost is supported."
        );
      }

      const attached = getAttachedXyzMaterials(
        current,
        cost.xyzInstanceId
      );

      // Explicit selections take priority. Without
      // a selection, use the first attached material.
      const materialInstanceId =
        selected?.instanceId ?? attached[0];

      if (!materialInstanceId) {
        return fail(
          chain,
          "No Xyz Material is available to detach."
        );
      }

      if (
        selected &&
        (
          selected.kind !== "cost" ||
          (
            selected.expectedZone !== undefined &&
            selected.expectedZone !== "overlay"
          )
        )
      ) {
        return fail(
          chain,
          "Invalid Xyz Material cost selection."
        );
      }

      const result = payXyzDetachCost(current, {
        xyzInstanceId: cost.xyzInstanceId,
        materialInstanceId,
      });

      if (!result.success) {
        return fail(
          chain,
          result.error ?? "Xyz detachment cost failed."
        );
      }

      current = result.state;
      continue;
    }

    const step = costAsStep(cost);

    if (!step) {
      return fail(
        chain,
        "Unsupported effect activation cost."
      );
    }

    const movementSelection = selected
      ? { ...selected, kind: "choose" as const }
      : undefined;

    const result = executeSelectedEffectStep(
      current,
      step,
      movementSelection
    );

    if (!result.success) {
      return fail(
        chain,
        result.error ?? "Cost payment failed."
      );
    }

    current = result.state;
  }

  // Targets must still be valid after costs are paid.
  // This prevents a cost from consuming the same
  // instance that the effect is attempting to target.
  const targetErrors = validateActivationTargets(
    current,
    effect,
    selections
  );

  if (targetErrors.length > 0) {
    return fail(
      chain,
      targetErrors.join(" ")
    );
  }

  const finalErrors = validateState(current);

  if (finalErrors.length > 0) {
    return fail(chain, finalErrors.join(" "));
  }

  current = recordActivationUsage(current, effect);

  const linkId = `chain-link-${chain.nextLinkNumber}`;

  return {
    success: true,
    chain: {
      gameState: current,
      links: [
        ...structuredClone(chain.links),
        {
          chainLinkId: linkId,
          effect: structuredClone(effect),
          selections: structuredClone(selections),
          negated: false,
        },
      ],
      nextLinkNumber: chain.nextLinkNumber + 1,
    },
    errors: [],
    warnings: validation.warnings,
  };
}

/**
 * Activate a card effect using a specific
 * physical source instance.
 *
 * Xyz detachment costs are bound to this
 * instance before activation validation
 * and cost payment.
 */
export function activateChainEffectForInstance(
  chain: EffectChainState,
  effect: CardEffectDefinition,
  sourceInstanceId: string,
  selections: EffectExecutionSelections = {
    costSelections: [],
    resolutionSelections: [],
  }
): EffectChainResult {
  const binding = bindCardEffectSource(
    chain.gameState,
    effect,
    sourceInstanceId
  );

  if (!binding.success || !binding.effect) {
    return fail(
      chain,
      binding.error ?? "Source binding failed."
    );
  }

  return activateChainEffect(
    chain,
    binding.effect,
    selections
  );
}

/**
 * Marks a pending effect as negated.
 *
 * This represents a pre-established negation outcome,
 * not the activation of a negating card.
 */
export function negateChainLink(
  chain: EffectChainState,
  chainLinkId: string
): EffectChainResult {
  const index = chain.links.findIndex(
    link => link.chainLinkId === chainLinkId
  );

  if (index === -1) {
    return fail(chain, "Chain link was not found.");
  }

  const next = copyChain(chain);

  next.links[index].negated = true;

  return {
    success: true,
    chain: next,
    errors: [],
    warnings: [],
  };
}

/**
 * Resolves a chain from last link to first link.
 *
 * Paid costs and once-per-turn usage remain recorded
 * even if a link is negated or fails to resolve.
 *
 * Failed links do not undo previously completed links.
 */
export function resolveEffectChain(
  chain: EffectChainState
): ChainResolutionResult {
  const stateErrors = validateState(chain.gameState);

  if (stateErrors.length > 0) {
    return {
      success: false,
      chain,
      entries: [],
      errors: stateErrors,
    };
  }

  let current = copyState(chain.gameState);

  const entries: ChainResolutionEntry[] = [];
  const errors: string[] = [];

  for (
    let index = chain.links.length - 1;
    index >= 0;
    index--
  ) {
    const link = chain.links[index];

    if (link.negated) {
      entries.push({
        chainLinkId: link.chainLinkId,
        effectId: link.effect.id,
        status: "negated",
        completedSteps: 0,
      });

      continue;
    }

    let completedSteps = 0;
    let failure: string | null = null;

    const skippedSteps: number[] = [];
    const targetIndexes = new Set(
      link.effect.targetStepIndexes ?? []
    );

    for (
      let stepIndex = 0;
      stepIndex < link.effect.steps.length;
      stepIndex++
    ) {
      const step = link.effect.steps[stepIndex];

      const selection = getSelectionForStep(
        {
          selections:
            link.selections.resolutionSelections,
        },
        stepIndex
      );

      if (targetIndexes.has(stepIndex)) {
        if (!selection || selection.kind !== "target") {
          failure = `Missing locked target for step ${stepIndex}.`;
          break;
        }

        if (step.type === "draw") {
          failure = `Draw step ${stepIndex} cannot target.`;
          break;
        }

        const requiredZone: GameZone = 
          step.type === "search"
            ? "deck"
            : step.type === "destroy"
              ? "field"
              : step.from;
        
        const targetInstance =
          current.cardInstances?.instances.find(
            instance =>
              instance.instanceId === selection.instanceId
          );
        
        if (
          !targetInstance ||
          targetInstance.cardId !== step.cardId ||
          targetInstance.zone !== requiredZone
        ) {
          skippedSteps.push(stepIndex);
          continue;
        }
      }

      const result = executeSelectedEffectStep(
        current,
        step,
        selection
      );

      if (!result.success) {
        failure =
          result.error ?? "Effect resolution failed.";

        break;
      }

      current = result.state;
      completedSteps++;
    }

    if (!failure) {
      const synchronizationErrors =
        validateState(current);

      if (synchronizationErrors.length > 0) {
        failure = synchronizationErrors.join(" ");
      }
    }

    if (failure) {
      const description =
        `${link.chainLinkId}: ${failure}`;

      errors.push(description);

      entries.push({
        chainLinkId: link.chainLinkId,
        effectId: link.effect.id,
        status: "failed",
        completedSteps,
        error: failure,
        skippedSteps,
      });
    } else {
      entries.push({
        chainLinkId: link.chainLinkId,
        effectId: link.effect.id,
        status: "resolved",
        completedSteps,
        skippedSteps,
      });
    }
  }

  return {
    success: errors.length === 0,
    chain: {
      gameState: current,
      links: [],
      nextLinkNumber: chain.nextLinkNumber,
    },
    entries,
    errors,
  };
}