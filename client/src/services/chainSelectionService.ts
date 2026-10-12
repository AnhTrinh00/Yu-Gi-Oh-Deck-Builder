import type {
  CardEffectDefinition,
  EffectStep,
} from "../models/CardEffect";

import type {
  CardInstanceSelection,
  CardSelectionKind,
} from "../models/CardSelection";

import type {
  EffectExecutionSelections,
} from "../models/EffectExecutionSelection";

import type {
  CardInstance,
  GameState,
  GameZone,
} from "../models/GameState";

export interface ChainSelectionOption {
  instanceId: string;
  cardId: number;
  zone: GameZone | "overlay";
}

export interface ChainSelectionRequirement {
  category: "cost" | "resolution";
  stepIndex: number;
  label: string;
  cardId: number;
  zone: GameZone | "overlay";
  kind: CardSelectionKind;
  options: ChainSelectionOption[];
}

/**
 * Exclude attached Xyz Materials from ordinary
 * effect selection.
 *
 * The type predicate ensures that TypeScript
 * recognizes the remaining zones as GameZone.
 */
function isSelectableInstance(
  instance: CardInstance
): instance is CardInstance & { zone: GameZone } {
  return instance.zone !== "overlay";
}

/**
 * Determine which zone supplies cards
 * for each effect operation.
 */
function sourceZone(step: EffectStep): GameZone | null {
  switch (step.type) {
    case "draw":
      return null;

    case "search":
      return "deck";

    case "destroy":
      return "field";

    case "move":
    case "special-summon":
      return step.from;
  }
}

/**
 * Build selectable card instances for a
 * specific card ID and source zone.
 */
function getMatchingOptions(
  instances: CardInstance[],
  cardId: number,
  zone: GameZone
): ChainSelectionOption[] {
  return instances
    .filter(isSelectableInstance)
    .filter(
      instance =>
        instance.cardId === cardId &&
        instance.zone === zone
    )
    .map(instance => ({
      instanceId: instance.instanceId,
      cardId: instance.cardId,
      zone: instance.zone,
    }));
}

/**
 * Determine which physical card instances
 * can be selected for effect costs and
 * resolution steps.
 */
export function getChainSelectionRequirements(
  state: GameState,
  effect: CardEffectDefinition
): ChainSelectionRequirement[] {
  const instances =
    state.cardInstances?.instances ?? [];

  const requirements: ChainSelectionRequirement[] = [];

  // ------------------------------------------
  // Activation costs
  // ------------------------------------------

  effect.costs.forEach((cost, stepIndex) => {
    if (cost.type === "detach-xyz-material") {
      const host = instances.find(
        instance => instance.instanceId === cost.xyzInstanceId
      );

      const attachment =
        host?.zone === "field"
          ? state.xyzMaterials?.find(
              entry => entry.xyzInstanceId === cost.xyzInstanceId
            )
          : undefined;

      const options: ChainSelectionOption[] =
        (attachment?.materialInstanceIds ?? [])
          .map(id =>
            instances.find(
              instance => instance.instanceId === id
            )
          )
          .filter(
            (instance): instance is CardInstance =>
              instance !== undefined &&
              instance.zone === "overlay"
          )
          .map(instance => ({
            instanceId: instance.instanceId,
            cardId: instance.cardId,
            zone: "overlay" as const,
          }));

      requirements.push({
        category: "cost",
        stepIndex,
        label: `Cost ${stepIndex + 1}: detach 1 Xyz Material`,
        cardId: options[0]?.cardId ?? 0,
        zone: "overlay",
        kind: "cost",
        options,
      });

      return;
    }

    requirements.push({
      category: "cost",
      stepIndex,
      label: `Cost ${stepIndex + 1}: move card ${cost.cardId}`,
      cardId: cost.cardId,
      zone: cost.from,
      kind: "cost",
      options: getMatchingOptions(
        instances,
        cost.cardId,
        cost.from
      ),
    });
  });

  // ------------------------------------------
  // Effect resolution
  // ------------------------------------------

  effect.steps.forEach((step, stepIndex) => {
    // Drawing cards does not require selecting
    // a specific physical card instance.
    if (step.type === "draw") {
      return;
    }

    const zone = sourceZone(step);

    if (zone === null) {
      return;
    }

    const isTarget =
      effect.targetStepIndexes?.includes(stepIndex) ??
      false;

    requirements.push({
      category: "resolution",
      stepIndex,
      label: `Operation ${stepIndex + 1}: ${step.type}`,
      cardId: step.cardId,
      zone,
      kind: isTarget ? "target" : "choose",
      options: getMatchingOptions(
        instances,
        step.cardId,
        zone
      ),
    });
  });

  return requirements;
}

/**
 * Convert user-selected instance IDs into
 * the selections consumed by effect execution.
 */
export function createChainSelections(
  requirements: ChainSelectionRequirement[],
  selected: Record<string, string>
): EffectExecutionSelections {
  const costSelections: CardInstanceSelection[] = [];
  const resolutionSelections: CardInstanceSelection[] = [];
  const selectedCostInstances = new Set<string>();

  for (const requirement of requirements) {
    const key =
      `${requirement.category}-${requirement.stepIndex}`;

    const instanceId = selected[key];

    if (!instanceId) {
      continue;
    }

    const valid = requirement.options.some(
      option => option.instanceId === instanceId
    );

    if (!valid) {
      throw new Error(
        `Invalid selection for ${requirement.label}.`
      );
    }

    const selection: CardInstanceSelection = {
      stepIndex: requirement.stepIndex,
      instanceId,
      kind: requirement.kind,
      expectedZone: requirement.zone,
    };

    if (requirement.category === "cost") {
      if (selectedCostInstances.has(instanceId)) {
        throw new Error(
          `Card instance ${instanceId} was selected for multiple costs.`
        );
      }

      selectedCostInstances.add(instanceId);
      costSelections.push(selection);
    } else {
      resolutionSelections.push(selection);
    }
  }

  return {
    costSelections,
    resolutionSelections,
  };
}