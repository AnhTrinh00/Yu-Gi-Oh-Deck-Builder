
import type {
  CardEffectDefinition,
} from "../../models/effect/CardEffect";

import type { GameState } from "../../models/simulation/GameState";

import {
  validateCardEffect,
  type EffectValidationResult,
} from "../effect/cardEffectValidationService";

import { cardEffectSchema } from "./definition/cardEffectSchemaService";

export interface RegisteredEffectValidation {
  found: boolean;
  result: EffectValidationResult | null;
}

export class CardEffectRegistry {
  private effects = new Map<string, CardEffectDefinition>();
  private cardIndex = new Map<number, Set<string>>();

  private cloneEffect(
    effect: CardEffectDefinition
  ): CardEffectDefinition {
    return {
      ...effect,
      conditions: effect.conditions.map((condition) => ({
        ...condition,
      })),
      costs: effect.costs.map((cost) => ({ ...cost })),
      steps: effect.steps.map((step) => ({ ...step })),
    };
  }

  private validateDefinition(
    effect: CardEffectDefinition
  ): void {
    cardEffectSchema.parse(effect);
    if (!effect.id.trim()) {
      throw new Error("Effect ID cannot be empty.");
    }

    if (
      !Number.isSafeInteger(effect.sourceCardId) ||
      effect.sourceCardId <= 0
    ) {
      throw new Error("Invalid source card ID.");
    }

    if (!effect.label.trim()) {
      throw new Error("Effect label cannot be empty.");
    }

    if (
      !Array.isArray(effect.conditions) ||
      !Array.isArray(effect.costs) ||
      !Array.isArray(effect.steps)
    ) {
      throw new Error("Invalid effect definition.");
    }

    if (
      effect.verification !== "manually-verified" &&
      effect.verification !== "experimental"
    ) {
      throw new Error("Invalid verification status.");
    }
  }

  registerEffect(effect: CardEffectDefinition): void {
    this.validateDefinition(effect);

    if (this.effects.has(effect.id)) {
      throw new Error(
        `Effect "${effect.id}" is already registered.`
      );
    }

    const stored = this.cloneEffect(effect);

    this.effects.set(stored.id, stored);

    const cardEffects =
      this.cardIndex.get(stored.sourceCardId) ??
      new Set<string>();

    cardEffects.add(stored.id);

    this.cardIndex.set(
      stored.sourceCardId,
      cardEffects
    );
  }

  registerEffects(
    effects: CardEffectDefinition[]
  ): void {
    // Preflight the entire batch to avoid partial registration.
    const batchIds = new Set<string>();

    for (const effect of effects) {
      this.validateDefinition(effect);

      if (
        batchIds.has(effect.id) ||
        this.effects.has(effect.id)
      ) {
        throw new Error(
          `Effect "${effect.id}" is already registered.`
        );
      }

      batchIds.add(effect.id);
    }

    for (const effect of effects) {
      this.registerEffect(effect);
    }
  }

  getEffect(
    effectId: string
  ): CardEffectDefinition | null {
    const effect = this.effects.get(effectId);

    return effect ? this.cloneEffect(effect) : null;
  }

  getEffectsForCard(
    cardId: number
  ): CardEffectDefinition[] {
    const ids = this.cardIndex.get(cardId);

    if (!ids) {
      return [];
    }

    return Array.from(ids)
      .map((id) => this.getEffect(id))
      .filter(
        (effect): effect is CardEffectDefinition =>
          effect !== null
      );
  }

  getAllEffects(): CardEffectDefinition[] {
    return Array.from(this.effects.values()).map(
      (effect) => this.cloneEffect(effect)
    );
  }

  hasEffect(effectId: string): boolean {
    return this.effects.has(effectId);
  }

  replaceEffect(effect: CardEffectDefinition): void {
    this.validateDefinition(effect);

    const existing = this.effects.get(effect.id);

    if (!existing) {
      throw new Error(
        `Effect "${effect.id}" does not exist.`
      );
    }

    const replacement = this.cloneEffect(effect);

    this.removeEffect(effect.id);

    try {
      this.registerEffect(replacement);
    } catch (error) {
      this.registerEffect(existing);
      throw error;
    }
  }
  
  removeEffect(effectId: string): boolean {
    const existing = this.effects.get(effectId);

    if (!existing) {
      return false;
    }

    this.effects.delete(effectId);

    const cardEffects = this.cardIndex.get(
      existing.sourceCardId
    );

    if (cardEffects) {
      cardEffects.delete(effectId);

      if (cardEffects.size === 0) {
        this.cardIndex.delete(existing.sourceCardId);
      }
    }

    return true;
  }

  clear(): void {
    this.effects.clear();
    this.cardIndex.clear();
  }

  getEffectCount(): number {
    return this.effects.size;
  }

  getRegisteredCardCount(): number {
    return this.cardIndex.size;
  }

  validateRegisteredEffect(
    state: GameState,
    effectId: string
  ): RegisteredEffectValidation {
    const effect = this.getEffect(effectId);

    if (!effect) {
      return {
        found: false,
        result: null,
      };
    }

    return {
      found: true,
      result: validateCardEffect(state, effect),
    };
  }
}

/**
 * Shared in-memory registry.
 *
 * No effects are registered automatically.
 * Definitions must be loaded explicitly.
 */
export const cardEffectRegistry =
  new CardEffectRegistry();
