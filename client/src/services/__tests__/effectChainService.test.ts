import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  CardEffectDefinition,
} from "../../models/effect/CardEffect";

import type {
  GameState,
} from "../../models/simulation/GameState";

import {
  normalizeGameState,
} from "../simulation/extendedGameStateService";

import {
  initializeCardInstances,
  validateCardInstanceSync,
} from "../simulation/cardInstanceService";

import {
  createEffectChain,
  activateChainEffect,
  negateChainLink,
  resolveEffectChain,
  activateChainEffectForInstance
} from "../effect/effectChainService";

import {
  placeCardInstanceOnField,
} from "../simulation/field/fieldInstanceService";

import {
  attachXyzMaterials,
  getAttachedXyzMaterials,
} from "../simulation/summon/xyzMaterialService";

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

function createXyzChainFixture() {
  const initial: GameState = {
    zones: {
      hand: [100, 200],
      deck: [300, 400, 500],
      extra: [900],
      field: [],
      graveyard: [],
      banished: [],
    },
    normalSummonUsed: false,
    usedEffects: [],
    actionHistory: [],
  };

  const initialized = initializeCardInstances(
    normalizeGameState(initial)
  );

  if (!initialized.success) {
    throw new Error(
      initialized.error ?? "Initialization failed."
    );
  }

  let state = initialized.state;

  function findId(cardId: number): string {
    const instance = state.cardInstances?.instances.find(
      item => item.cardId === cardId
    );

    if (!instance) {
      throw new Error(`Missing card ${cardId}.`);
    }

    return instance.instanceId;
  }

  const hostId = findId(900);
  const materialIds = [findId(100), findId(200)];

  for (const [index, id] of [
    hostId,
    ...materialIds,
  ].entries()) {
    const placed = placeCardInstanceOnField(state, {
      instanceId: id,
      zoneType: "monster",
      zoneIndex: index,
      position: "face-up-attack",
    });

    if (!placed.success) {
      throw new Error(
        placed.error ?? "Monster placement failed."
      );
    }

    state = placed.state;
  }

  const attached = attachXyzMaterials(
    state,
    hostId,
    materialIds
  );

  if (!attached.success) {
    throw new Error(
      attached.error ?? "Xyz attachment failed."
    );
  }

  state = attached.state;

  const effect = makeEffect({
    id: "xyz-detach-effect",
    sourceCardId: 900,
    activationZone: "field",
    costs: [
      {
        type: "detach-xyz-material",
        xyzInstanceId: hostId,
        count: 1,
      },
    ],
    steps: [{ type: "draw", count: 1 }],
  });

  return {
    state,
    hostId,
    materialIds,
    effect,
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

  it("pays an Xyz detachment cost during activation", () => {
    const {
      state,
      hostId,
      materialIds,
      effect,
    } = createXyzChainFixture();

    const chain = createEffectChain(state);

    const activated = activateChainEffect(
      chain,
      effect,
      {
        costSelections: [
          {
            stepIndex: 0,
            instanceId: materialIds[1],
            kind: "cost",
            expectedZone: "overlay",
          },
        ],
        resolutionSelections: [],
      }
    );

    expect(
      activated.success,
      activated.errors.join(" ")
    ).toBe(true);

    expect(activated.chain.links).toHaveLength(1);

    expect(
      getAttachedXyzMaterials(
        activated.chain.gameState,
        hostId
      )
    ).toEqual([materialIds[0]]);

    expect(
      activated.chain.gameState.cardInstances?.instances.find(
        instance =>
          instance.instanceId === materialIds[1]
      )?.zone
    ).toBe("graveyard");

    expect(
      activated.chain.gameState.zones.deck
    ).toEqual([300, 400, 500]);

    expect(
      validateCardInstanceSync(
        activated.chain.gameState
      )
    ).toEqual([]);
  });

  it("does not refund Xyz Materials after negation", () => {
    const {
      state,
      hostId,
      materialIds,
      effect,
    } = createXyzChainFixture();

    const activated = activateChainEffect(
      createEffectChain(state),
      effect
    );

    expect(
      activated.success,
      activated.errors.join(" ")
    ).toBe(true);

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
      getAttachedXyzMaterials(
        resolved.chain.gameState,
        hostId
      )
    ).toEqual([materialIds[1]]);

    expect(
      resolved.chain.gameState.cardInstances?.instances.find(
        instance =>
          instance.instanceId === materialIds[0]
      )?.zone
    ).toBe("graveyard");

    // Negation prevents the draw effect.
    expect(
      resolved.chain.gameState.zones.deck
    ).toEqual([300, 400, 500]);

    expect(
      validateCardInstanceSync(
        resolved.chain.gameState
      )
    ).toEqual([]);
  });

  it("rejects invalid Xyz cost selections atomically", () => {
    const {
      state,
      hostId,
      effect,
    } = createXyzChainFixture();

    const chain = createEffectChain(state);
    const original = structuredClone(chain);

    const activated = activateChainEffect(
      chain,
      effect,
      {
        costSelections: [
          {
            stepIndex: 0,
            instanceId: "invalid-material",
            kind: "cost",
            expectedZone: "overlay",
          },
        ],
        resolutionSelections: [],
      }
    );

    expect(activated.success).toBe(false);
    expect(activated.chain).toBe(chain);
    expect(chain).toEqual(original);
    expect(chain.links).toHaveLength(0);

    expect(
      getAttachedXyzMaterials(
        chain.gameState,
        hostId
      )
    ).toHaveLength(2);
  });

  it("cannot detach the same material twice", () => {
    const {
      state,
      hostId,
      materialIds,
      effect,
    } = createXyzChainFixture();

    const first = activateChainEffect(
      createEffectChain(state),
      effect,
      {
        costSelections: [
          {
            stepIndex: 0,
            instanceId: materialIds[0],
            kind: "cost",
            expectedZone: "overlay",
          },
        ],
        resolutionSelections: [],
      }
    );

    expect(
      first.success,
      first.errors.join(" ")
    ).toBe(true);

    const second = activateChainEffect(
      first.chain,
      effect,
      {
        costSelections: [
          {
            stepIndex: 0,
            instanceId: materialIds[0],
            kind: "cost",
            expectedZone: "overlay",
          },
        ],
        resolutionSelections: [],
      }
    );

    expect(second.success).toBe(false);
    expect(second.chain).toBe(first.chain);

    expect(
      getAttachedXyzMaterials(
        second.chain.gameState,
        hostId
      )
    ).toEqual([materialIds[1]]);
  });

  it("binds a reusable Xyz effect to its activating instance", () => {
    const {
      state,
      hostId,
      materialIds,
      effect,
    } = createXyzChainFixture();

    // A reusable effect should not store a physical host ID.
    const reusableEffect: CardEffectDefinition = {
      ...effect,
      costs: [{
        type: "detach-xyz-material",
        xyzInstanceId: "",
        count: 1,
      }],
    };

    const originalEffect = structuredClone(reusableEffect);

    const activated = activateChainEffectForInstance(
      createEffectChain(state),
      reusableEffect,
      hostId,
      {
        costSelections: [{
          stepIndex: 0,
          instanceId: materialIds[1],
          kind: "cost",
          expectedZone: "overlay",
        }],
        resolutionSelections: [],
      }
    );

    expect(
      activated.success,
      activated.errors.join(" ")
    ).toBe(true);

    // Only the selected material was detached.
    expect(
      getAttachedXyzMaterials(
        activated.chain.gameState,
        hostId
      )
    ).toEqual([materialIds[0]]);

    expect(
      activated.chain.gameState.cardInstances?.instances.find(
        instance => instance.instanceId === materialIds[1]
      )?.zone
    ).toBe("graveyard");

    // The registered definition remains reusable.
    expect(reusableEffect).toEqual(originalEffect);

    // The pending link stores the activation-specific binding.
    expect(
      activated.chain.links[0].effect.costs[0]
    ).toMatchObject({
      type: "detach-xyz-material",
      xyzInstanceId: hostId,
    });

    expect(
      validateCardInstanceSync(
        activated.chain.gameState
      )
    ).toEqual([]);
  });
});