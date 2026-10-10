
import { describe, expect, it } from "vitest";

import type { Card } from "../../models/Card";
import type { Deck } from "../../models/Deck";

import {
  createGameState,
} from "../gameStateService";

import {
  createEmptyFieldState,
  createExtendedGameState,
  createInitialTurnState,
  normalizeGameState,
  hasExtendedGameState,
} from "../extendedGameStateService";

function card(id: number): Card {
  return {
    id,
    name: `Card ${id}`,
    type: "Effect Monster",
    frameType: "effect",
    description: "",
    race: "Warrior",
    imageUrl: "",
    imageUrlSmall: "",
  };
}

const deck: Deck = {
  name: "Phase 4 Test",
  main: [
    { card: card(100), quantity: 3 },
  ],
  extra: [],
  side: [],
};

describe("extendedGameStateService", () => {
  it("creates an empty field with five zones each", () => {
    const field = createEmptyFieldState();

    expect(field.monsterZones).toHaveLength(5);
    expect(field.spellTrapZones).toHaveLength(5);
    expect(field.fieldSpellZone).toBeNull();
  });

  it("initializes turn information", () => {
    const turn = createInitialTurnState();

    expect(turn.turnNumber).toBe(1);
    expect(turn.activePlayer).toBe("player");
    expect(turn.phase).toBe("main1");
  });

  it("creates an extended state from a deck", () => {
    const state = createExtendedGameState(deck);

    expect(state.zones.deck).toHaveLength(3);
    expect(state.fieldState).toBeDefined();
    expect(state.turnState).toBeDefined();
    expect(state.effectUsage).toEqual([]);
    expect(state.restrictions).toEqual([]);
  });

  it("normalizes a legacy game state", () => {
    const legacy = createGameState(deck);

    expect(hasExtendedGameState(legacy)).toBe(false);

    const normalized = normalizeGameState(legacy);

    expect(hasExtendedGameState(normalized)).toBe(true);
    expect(normalized.zones.deck).toEqual(
      legacy.zones.deck
    );
  });

  it("does not mutate the original state", () => {
    const original = createExtendedGameState(deck);
    const normalized = normalizeGameState(original);

    normalized.fieldState!.monsterZones[0] = {
      cardId: 100,
      instanceId: "monster-1",
      position: "face-up-attack",
    };

    expect(
      original.fieldState!.monsterZones[0]
    ).toBeNull();
  });

  it("clones effect usage and restrictions", () => {
    const original = createExtendedGameState(deck);

    original.effectUsage!.push({
      usageKey: "test-effect",
      turnNumber: 1,
    });

    original.restrictions!.push({
      id: "restriction-1",
      description: "Example restriction",
      expiresAtTurnEnd: true,
    });

    const normalized = normalizeGameState(original);

    normalized.effectUsage![0].usageKey = "changed";
    normalized.restrictions![0].description = "Changed";

    expect(original.effectUsage![0].usageKey).toBe(
      "test-effect"
    );

    expect(original.restrictions![0].description).toBe(
      "Example restriction"
    );
  });
});
