
import { describe, expect, it } from "vitest";

import type { Card } from "../../models/card/Card";
import type { Deck } from "../../models/deck/Deck";

import {
  createGameState,
  countCardInZone,
  executeGameAction,
  moveCard,
} from "../simulation/gameStateService";

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
  name: "Simulation Test",
  main: [
    { card: card(1), quantity: 3 },
    { card: card(2), quantity: 2 },
  ],
  extra: [{ card: card(3), quantity: 1 }],
  side: [],
};

describe("gameStateService", () => {
  it("creates a state from the deck", () => {
    const state = createGameState(deck);

    expect(state.zones.deck).toHaveLength(5);
    expect(state.zones.extra).toEqual([3]);
    expect(state.zones.hand).toEqual([]);
  });

  it("moves a card without mutating the original state", () => {
    const original = createGameState(deck);
    const moved = moveCard(original, 1, "deck", "hand");

    expect(moved).not.toBeNull();
    expect(original.zones.hand).toHaveLength(0);
    expect(moved!.zones.hand).toEqual([1]);
    expect(moved!.zones.deck).toHaveLength(4);
  });

  it("executes a Normal Summon", () => {
    const initial = moveCard(
      createGameState(deck),
      1,
      "deck",
      "hand"
    )!;

    const result = executeGameAction(initial, {
      id: "1",
      type: "normal-summon",
      cardId: 1,
    });

    expect(result.success).toBe(true);
    expect(result.state.normalSummonUsed).toBe(true);
    expect(result.state.zones.field).toEqual([1]);
  });

  it("prevents a second Normal Summon", () => {
    let state = createGameState(deck);
    state = moveCard(state, 1, "deck", "hand")!;
    state = moveCard(state, 2, "deck", "hand")!;

    const first = executeGameAction(state, {
      id: "1",
      type: "normal-summon",
      cardId: 1,
    });

    const second = executeGameAction(first.state, {
      id: "2",
      type: "normal-summon",
      cardId: 2,
    });

    expect(first.success).toBe(true);
    expect(second.success).toBe(false);
    expect(second.state.zones.hand).toContain(2);
  });

  it("searches a card from Deck to hand", () => {
    const result = executeGameAction(
      createGameState(deck),
      {
        id: "search",
        type: "search",
        cardId: 2,
      }
    );

    expect(result.success).toBe(true);
    expect(
      countCardInZone(result.state, "hand", 2)
    ).toBe(1);
  });

  it("rejects unavailable cards", () => {
    const result = executeGameAction(
      createGameState(deck),
      {
        id: "missing",
        type: "search",
        cardId: 999,
      }
    );

    expect(result.success).toBe(false);
  });

  it("enforces tracked once-per-turn effect usage", () => {
    let state = createGameState(deck);
    state = moveCard(state, 1, "deck", "field")!;

    const action = {
      id: "effect-1",
      type: "activate-effect" as const,
      cardId: 1,
      effectKey: "1:effect-A",
      oncePerTurn: true,
    };

    const first = executeGameAction(state, action);
    const second = executeGameAction(first.state, {
      ...action,
      id: "effect-2",
    });

    expect(first.success).toBe(true);
    expect(second.success).toBe(false);
    expect(first.state.usedEffects).toContain(
      "1:effect-A"
    );
  });

  it("does not consume a resource on a failed action", () => {
    const state = createGameState(deck);

    const result = executeGameAction(state, {
      id: "invalid",
      type: "normal-summon",
      cardId: 1,
    });

    expect(result.success).toBe(false);
    expect(result.state).toBe(state);
    expect(result.state.normalSummonUsed).toBe(false);
  });
  
  it("preserves state when an effect activation fails", () => {
    let state = createGameState(deck);

    state = moveCard(
      state,
      1,
      "deck",
      "field"
    )!;

    const first = executeGameAction(state, {
      id: "effect-1",
      type: "activate-effect",
      cardId: 1,
      effectKey: "card-1-effect",
      oncePerTurn: true,
    });

    expect(first.success).toBe(true);

    const beforeFailure = first.state;

    const second = executeGameAction(beforeFailure, {
      id: "effect-2",
      type: "activate-effect",
      cardId: 1,
      effectKey: "card-1-effect",
      oncePerTurn: true,
    });

    expect(second.success).toBe(false);

    expect(second.state).toBe(beforeFailure);

    expect(
      second.state.usedEffects
    ).toEqual(["card-1-effect"]);

    expect(
      second.state.actionHistory
    ).toHaveLength(1);
  });
});
