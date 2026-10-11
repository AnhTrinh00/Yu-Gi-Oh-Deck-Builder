import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  CardEffectDefinition,
} from "../../models/CardEffect";

import type {
  GameState,
} from "../../models/GameState";

import {
  normalizeGameState,
} from "../extendedGameStateService";

import {
  initializeCardInstances,
  validateCardInstanceSync,
} from "../cardInstanceService";

import {
  createEffectChain,
  activateChainEffect,
  negateChainLink,
  resolveEffectChain,
} from "../effectChainService";

function createState(): GameState {
  const legacy: GameState = {
    zones: {
      hand: [100, 200],
      deck: [300, 400, 500],
      extra: [],
      field: [],
      graveyard: [],
      banished: [],
    },
    normalSummonUsed: false,
    usedEffects: [],
    actionHistory: [],
  };

  const initialized = initializeCardInstances(
    normalizeGameState(legacy)
  );

  if (!initialized.success) {
    throw new Error(initialized.error);
  }

  return initialized.state;
}

function makeEffect(
  overrides: Partial<CardEffectDefinition> = {}
): CardEffectDefinition {
  return {
    id: "test-effect",
    sourceCardId: 100,
    label: "Test effect",
    activationZone: "hand",
    conditions: [],
    costs: [],
    steps: [{ type: "draw", count: 1 }],
    verification: "experimental",
    ...overrides,
  };
}

describe("effectChainService", () => {
  it("creates an empty chain", () => {
    const chain = createEffectChain(createState());

    expect(chain.links).toHaveLength(0);
    expect(chain.nextLinkNumber).toBe(1);
  });

  it("pays costs during activation", () => {
    const chain = createEffectChain(createState());

    const activated = activateChainEffect(
      chain,
      makeEffect({
        costs: [{
          type: "move-card",
          cardId: 200,
          from: "hand",
          to: "graveyard",
        }],
      })
    );

    expect(activated.success).toBe(true);

    expect(
      activated.chain.gameState.zones.graveyard
    ).toEqual([200]);

    expect(
      activated.chain.gameState.zones.deck
    ).toEqual([300, 400, 500]);

    expect(activated.chain.links).toHaveLength(1);
  });

  it("resolves effects only after activation", () => {
    const chain = createEffectChain(createState());

    const activated = activateChainEffect(
      chain,
      makeEffect()
    );

    expect(activated.success).toBe(true);

    expect(
      activated.chain.gameState.zones.deck
    ).toHaveLength(3);

    const resolved = resolveEffectChain(
      activated.chain
    );

    expect(resolved.success).toBe(true);

    expect(
      resolved.chain.gameState.zones.deck
    ).toEqual([400, 500]);

    expect(
      resolved.chain.gameState.zones.hand
    ).toContain(300);
  });

  it("resolves chain links in reverse order", () => {
    const first = activateChainEffect(
      createEffectChain(createState()),
      makeEffect({
        id: "effect-a",
        steps: [{
          type: "search",
          cardId: 400,
        }],
      })
    );

    expect(first.success).toBe(true);

    const second = activateChainEffect(
      first.chain,
      makeEffect({
        id: "effect-b",
        steps: [{
          type: "search",
          cardId: 500,
        }],
      })
    );

    expect(second.success).toBe(true);

    const resolved = resolveEffectChain(
      second.chain
    );

    expect(
      resolved.entries.map(entry => entry.effectId)
    ).toEqual(["effect-b", "effect-a"]);

    expect(resolved.success).toBe(true);

    expect(
      resolved.chain.gameState.zones.hand
    ).toEqual([100, 200, 500, 400]);
  });

  it("retains costs when an effect is negated", () => {
    const activated = activateChainEffect(
      createEffectChain(createState()),
      makeEffect({
        costs: [{
          type: "move-card",
          cardId: 200,
          from: "hand",
          to: "graveyard",
        }],
      })
    );

    expect(activated.success).toBe(true);

    const negated = negateChainLink(
      activated.chain,
      "chain-link-1"
    );

    expect(negated.success).toBe(true);

    const resolved = resolveEffectChain(
      negated.chain
    );

    expect(resolved.success).toBe(true);
    expect(resolved.entries[0].status).toBe("negated");

    expect(
      resolved.chain.gameState.zones.graveyard
    ).toEqual([200]);

    expect(
      resolved.chain.gameState.zones.deck
    ).toEqual([300, 400, 500]);
  });

  it("records once-per-turn usage at activation", () => {
    const effect = makeEffect({
      oncePerTurnKey: "test-once",
    });

    const first = activateChainEffect(
      createEffectChain(createState()),
      effect
    );

    expect(first.success).toBe(true);

    expect(
      first.chain.gameState.usedEffects
    ).toContain("test-once");

    const second = activateChainEffect(
      first.chain,
      effect
    );

    expect(second.success).toBe(false);
    expect(second.chain).toBe(first.chain);
  });

  it("keeps once-per-turn usage after negation", () => {
    const effect = makeEffect({
      oncePerTurnKey: "test-once",
    });

    const activated = activateChainEffect(
      createEffectChain(createState()),
      effect
    );

    expect(activated.success).toBe(true);

    const negated = negateChainLink(
      activated.chain,
      "chain-link-1"
    );

    const resolved = resolveEffectChain(
      negated.chain
    );

    expect(
      resolved.chain.gameState.usedEffects
    ).toContain("test-once");
  });

  it("rejects activation with an unavailable cost", () => {
    const chain = createEffectChain(createState());

    const activated = activateChainEffect(
      chain,
      makeEffect({
        costs: [{
          type: "move-card",
          cardId: 999,
          from: "hand",
          to: "graveyard",
        }],
      })
    );

    expect(activated.success).toBe(false);
    expect(activated.chain).toBe(chain);
    expect(chain.links).toHaveLength(0);
  });

  it("retains paid costs when resolution fails", () => {
    const activated = activateChainEffect(
      createEffectChain(createState()),
      makeEffect({
        costs: [{
          type: "move-card",
          cardId: 200,
          from: "hand",
          to: "graveyard",
        }],
        steps: [{
          type: "search",
          cardId: 999,
        }],
      })
    );

    expect(activated.success).toBe(true);

    const resolved = resolveEffectChain(
      activated.chain
    );

    expect(resolved.success).toBe(false);
    expect(resolved.entries[0].status).toBe("failed");

    expect(
      resolved.chain.gameState.zones.graveyard
    ).toEqual([200]);

    expect(
      resolved.chain.gameState.zones.deck
    ).toEqual([300, 400, 500]);
  });

  it("preserves card-instance synchronization", () => {
    const activated = activateChainEffect(
      createEffectChain(createState()),
      makeEffect({
        costs: [{
          type: "move-card",
          cardId: 200,
          from: "hand",
          to: "graveyard",
        }],
      })
    );

    expect(activated.success).toBe(true);

    const resolved = resolveEffectChain(
      activated.chain
    );

    expect(
      validateCardInstanceSync(
        resolved.chain.gameState
      )
    ).toEqual([]);
  });

  it("does not mutate the original game state", () => {
    const state = createState();

    const chain = createEffectChain(state);

    const activated = activateChainEffect(
      chain,
      makeEffect()
    );

    const resolved = resolveEffectChain(
      activated.chain
    );

    expect(state.zones.deck).toEqual([
      300,
      400,
      500,
    ]);

    expect(chain.links).toHaveLength(0);

    expect(
      resolved.chain.gameState.zones.deck
    ).toEqual([400, 500]);
  });
});