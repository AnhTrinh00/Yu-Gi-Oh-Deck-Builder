
import { describe, expect, it } from "vitest";

import type {
  CardEffectDefinition,
} from "../../models/CardEffect";

import type { GameState } from "../../models/GameState";

import { validateCardEffect } from "../cardEffectValidationService";

const state = (): GameState => ({
  zones: {
    hand: [10, 20],
    deck: [30],
    extra: [],
    field: [],
    graveyard: [],
    banished: [],
  },
  normalSummonUsed: false,
  usedEffects: [],
  actionHistory: [],
});

const effect = (): CardEffectDefinition => ({
  id: "10-search",
  sourceCardId: 10,
  label: "Search",
  activationZone: "hand",

  conditions: [
    {
      type: "card-in-zone",
      cardId: 30,
      zone: "deck",
    },
  ],

  costs: [
    {
      type: "move-card",
      cardId: 20,
      from: "hand",
      to: "graveyard",
    },
  ],

  steps: [
    {
      type: "search",
      cardId: 30,
    },
  ],

  oncePerTurnKey: "10-search",
  verification: "manually-verified",
});

describe("validateCardEffect", () => {
  it("accepts declared prerequisites without mutating the state", () => {
    const original = state();

    expect(
      validateCardEffect(original, effect()).valid
    ).toBe(true);

    expect(original.zones.hand).toEqual([10, 20]);
  });

  it("rejects missing source cards", () => {
    const s = state();
    s.zones.hand = [20];

    expect(
      validateCardEffect(s, effect()).valid
    ).toBe(false);
  });

  it("rejects used once-per-turn keys", () => {
    const s = state();
    s.usedEffects.push("10-search");

    expect(
      validateCardEffect(s, effect()).valid
    ).toBe(false);
  });

  it("rejects insufficient costs, including duplicate costs", () => {
    const e = effect();

    e.costs.push({
      type: "move-card",
      cardId: 20,
      from: "hand",
      to: "graveyard",
    });

    expect(
      validateCardEffect(state(), e).valid
    ).toBe(false);
  });

  it("rejects unmet conditions", () => {
    const s = state();
    s.zones.deck = [];

    expect(
      validateCardEffect(s, effect()).valid
    ).toBe(false);
  });

  it("warns when definitions are experimental", () => {
    const e = effect();
    e.verification = "experimental";

    expect(
      validateCardEffect(state(), e).warnings
    ).toContain(
      "Effect definition has not been manually verified."
    );
  });
});
