import type {
  CardEffectDefinition,
} from "../../../models/effect/CardEffect";

import type {
  EffectActivationDefinition,
} from "../../../models/effect/EffectActivation";

import type {
  GameState,
} from "../../../models/simulation/GameState";

import type {
  DetectedDisruption,
  DisruptionAnalysis,
  DisruptionSpeed,
  DisruptionType,
} from "../../../models/analysis/DisruptionAnalysis";

import {
  CardEffectRegistry,
} from "../../effect/cardEffectRegistryService";

import {
  analyzeDisruptions,
} from "./disruptionAnalysisService";

import {
  validateCardEffect,
} from "../../effect/cardEffectValidationService";

import {
  validateEffectActivation,
} from "../../effect/effectActivationValidationService";

export interface DisruptionMetadata {
  effectId: string;
  type: DisruptionType;
  speed: DisruptionSpeed;
  description?: string;
}

export interface RegisteredDisruptionResult
  extends DisruptionAnalysis {
  skippedEffects: string[];
}

export interface RegisteredDisruptionOptions {
  activations?: EffectActivationDefinition[];
}

function getExpectedSpeed(
  speed: DisruptionSpeed
): 2 | 3 {
  return speed === "counter-trap" ? 3 : 2;
}

/**
 * Creates a temporary copy of an effect whose
 * instance-specific Xyz costs refer to the
 * candidate being evaluated.
 *
 * The registry is never modified.
 */
function bindEffectToInstance(
  effect: CardEffectDefinition,
  instanceId: string
): CardEffectDefinition {
  return {
    ...effect,

    conditions: effect.conditions.map(
      (condition) => ({ ...condition })
    ),

    costs: effect.costs.map((cost) => {
      if (cost.type === "detach-xyz-material") {
        return {
          ...cost,
          xyzInstanceId: instanceId,
        };
      }

      return { ...cost };
    }),

    steps: effect.steps.map(
      (step) => ({ ...step })
    ),
  };
}

function getReasons(
  state: GameState,
  effect: CardEffectDefinition,
  activation: EffectActivationDefinition,
  instanceId: string
): string[] {
  const boundEffect = bindEffectToInstance(
    effect,
    instanceId
  );

  const effectValidation = validateCardEffect(
    state,
    boundEffect
  );

  const activationValidation =
    validateEffectActivation(
      state,
      boundEffect,
      activation
    );

  return [
    ...effectValidation.errors,
    ...activationValidation.errors,
  ];
}

function evaluateCandidate(
  state: GameState,
  candidate: DetectedDisruption,
  effect: CardEffectDefinition,
  activation: EffectActivationDefinition | undefined
): DetectedDisruption {
  if (candidate.availability === "unavailable") {
    return candidate;
  }

  if (!activation) {
    return {
      ...candidate,
      availability: "unknown",
      reasons: [
        "Activation metadata is not registered.",
      ],
    };
  }

  if (activation.effectId !== effect.id) {
    return {
      ...candidate,
      availability: "unavailable",
      reasons: [
        "Activation definition does not match the effect.",
      ],
    };
  }

  const expectedSpeed = getExpectedSpeed(
    candidate.speed
  );

  if (activation.speed !== expectedSpeed) {
    return {
      ...candidate,
      availability: "unavailable",
      reasons: [
        "Activation speed does not match disruption metadata.",
      ],
    };
  }

  const reasons = getReasons(
    state,
    effect,
    activation,
    candidate.instanceId
  );

  return {
    ...candidate,

    availability:
      reasons.length === 0
        ? "conditionally-available"
        : "unavailable",

    reasons,
  };
}

export function analyzeRegisteredDisruptions(
  state: GameState,
  registry: CardEffectRegistry,
  metadata: DisruptionMetadata[],
  options: RegisteredDisruptionOptions = {}
): RegisteredDisruptionResult {
  const skippedEffects: string[] = [];

  const effects = new Map<
    string,
    CardEffectDefinition
  >();

  const definitions = [];
  const seen = new Set<string>();

  for (const item of metadata) {
    if (seen.has(item.effectId)) {
      skippedEffects.push(
        `${item.effectId}: duplicate disruption metadata`
      );
      continue;
    }

    seen.add(item.effectId);

    const effect = registry.getEffect(
      item.effectId
    );

    if (!effect) {
      skippedEffects.push(
        `${item.effectId}: effect is not registered`
      );
      continue;
    }

    if (
      effect.verification !== "manually-verified"
    ) {
      skippedEffects.push(
        `${item.effectId}: effect is experimental`
      );
      continue;
    }

    effects.set(effect.id, effect);

    definitions.push({
      id: `registered-${effect.id}`,
      cardId: effect.sourceCardId,
      effectKey: effect.id,
      type: item.type,
      speed: item.speed,
      allowedZones: [effect.activationZone],
      usageKey: effect.oncePerTurnKey,
      description:
        item.description ?? effect.label,
    });
  }

  const initial = analyzeDisruptions(
    state,
    definitions
  );

  if (!initial.complete) {
    return {
      ...initial,
      skippedEffects,
    };
  }

  const activations = new Map(
    (options.activations ?? []).map(
      (activation) => [
        activation.effectId,
        activation,
      ]
    )
  );

  const disruptions = initial.disruptions.map(
    (candidate) => {
      const effect = effects.get(
        candidate.effectKey
      );

      if (!effect) {
        return {
          ...candidate,
          availability: "unknown" as const,
          reasons: [
            "Registered effect definition is missing.",
          ],
        };
      }

      return evaluateCandidate(
        state,
        candidate,
        effect,
        activations.get(effect.id)
      );
    }
  );

  return {
    disruptions,

    potentialCount: disruptions.filter(
      (item) =>
        item.availability === "potential"
    ).length,

    conditionallyAvailableCount:
      disruptions.filter(
        (item) =>
          item.availability ===
          "conditionally-available"
      ).length,

    unavailableCount: disruptions.filter(
      (item) =>
        item.availability === "unavailable"
    ).length,

    unknownCount: disruptions.filter(
      (item) =>
        item.availability === "unknown"
    ).length,

    complete: true,
    warnings: [],
    skippedEffects,
  };
}