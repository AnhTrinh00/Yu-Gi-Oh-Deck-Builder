import { describe, expect, it } from "vitest";

import {
  newCondition,
  newCost,
  newEffect,
  newStep,
  validateBuiltEffect,
} from "../effect/definition/cardEffectBuilderService";

describe("cardEffectBuilderService", () => {
  it("creates a valid experimental effect", () => {
    const effect = newEffect(100);

    const validated = validateBuiltEffect(effect);

    expect(validated.sourceCardId).toBe(100);
    expect(validated.verification).toBe("experimental");
  });

  it("creates schema-compatible conditions", () => {
    const types = [
      "source-in-zone",
      "card-in-zone",
      "normal-summon-available",
      "effect-unused",
    ] as const;

    for (const type of types) {
      const effect = {
        ...newEffect(100),
        conditions: [newCondition(type)],
      };

      expect(() =>
        validateBuiltEffect(effect)
      ).not.toThrow();
    }
  });

  it("creates schema-compatible operations", () => {
    const types = [
      "draw",
      "search",
      "move",
      "special-summon",
      "destroy",
    ] as const;

    for (const type of types) {
      const effect = {
        ...newEffect(100),
        steps: [newStep(type)],
      };

      expect(() =>
        validateBuiltEffect(effect)
      ).not.toThrow();
    }
  });

  it("creates a valid move cost", () => {
    const effect = {
      ...newEffect(100),
      costs: [newCost()],
    };

    expect(() =>
      validateBuiltEffect(effect)
    ).not.toThrow();
  });

  it("rejects an effect without operations", () => {
    const effect = {
      ...newEffect(100),
      steps: [],
    };

    expect(() =>
      validateBuiltEffect(effect)
    ).toThrow();
  });

  it("rejects invalid card IDs", () => {
    expect(() =>
      validateBuiltEffect(newEffect(-1))
    ).toThrow();
  });
});