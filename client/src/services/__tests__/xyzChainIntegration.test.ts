import { describe, expect, it } from "vitest";

import type { Card } from "../../models/Card";
import type { CardEffectDefinition } from "../../models/CardEffect";
import type { GameState } from "../../models/GameState";

import {
  initializeCardInstances,
  validateCardInstanceSync,
} from "../simulation/cardInstanceService";

import {
  normalizeGameState,
} from "../simulation/extendedGameStateService";

import {
  placeCardOnField,
  isFieldSynchronized,
} from "../simulation/field/fieldZoneService";

import {
  executeChainXyzSummon,
} from "../simulation/summon/chainXyzSummonService";

import {
  getAttachedXyzMaterials,
} from "../simulation/summon/xyzMaterialService";

import {
  activateChainEffectForInstance,
  createEffectChain,
  negateChainLink,
  resolveEffectChain,
} from "../effect/effectChainService";

function makeCard(
  id: number,
  type: string,
  level: number,
  frameType = "effect"
): Card {
  return {
    id,
    name: `Card ${id}`,
    type,
    frameType,
    description: "",
    race: "Dragon",
    level,
    imageUrl: "",
    imageUrlSmall: "",
  };
}

const cards: Card[] = [
  makeCard(100, "Effect Monster", 4),
  makeCard(200, "Effect Monster", 4),
  makeCard(300, "Effect Monster", 4),
  makeCard(400, "Effect Monster", 4),
  makeCard(900, "XYZ Monster", 4, "xyz"),
];

function setup() {
  const initial: GameState = {
    zones: {
      hand: [100, 200, 300, 400],
      deck: [500, 501],
      extra: [900, 900],
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
    throw new Error(initialized.error);
  }

  let state = initialized.state;

  function getId(cardId: number, occurrence = 0) {
    const matches =
      state.cardInstances?.instances.filter(
        instance => instance.cardId === cardId
      ) ?? [];

    if (!matches[occurrence]) {
      throw new Error(`Missing instance ${cardId}`);
    }

    return matches[occurrence].instanceId;
  }

  const materialIds = [
    getId(100),
    getId(200),
    getId(300),
    getId(400),
  ];

  materialIds.forEach((instanceId, zoneIndex) => {
    const instance = state.cardInstances!.instances.find(
      item => item.instanceId === instanceId
    )!;

    const placed = placeCardOnField(state, {
      cardId: instance.cardId,
      instanceId,
      from: "hand",
      zoneType: "monster",
      zoneIndex,
      position: "face-up-attack",
    });

    if (!placed.success) {
      throw new Error(placed.error);
    }

    state = normalizeGameState(placed.state);

    state.cardInstances!.instances.find(
      item => item.instanceId === instanceId
    )!.zone = "field";
  });

  return {
    state,
    materialIds,
    xyzIds: [getId(900, 0), getId(900, 1)],
  };
}

function xyzEffect(): CardEffectDefinition {
  return {
    id: "xyz-integration-effect",
    sourceCardId: 900,
    label: "Detach to draw",
    activationZone: "field",
    conditions: [],
    costs: [
      {
        type: "detach-xyz-material",
        xyzInstanceId: "",
        count: 1,
      },
    ],
    steps: [
      {
        type: "draw",
        count: 1,
      },
    ],
    verification: "experimental",
  };
}

function summon(
  state: GameState,
  xyzId: string,
  materials: string[]
) {
  return executeChainXyzSummon(state, cards, {
    monsterInstanceId: xyzId,
    materialInstanceIds: materials,
  });
}

describe("Xyz + Effect Chain Integration", () => {
  it("summons, detaches, and resolves an effect", () => {
    const fixture = setup();

    const summoned = summon(
      fixture.state,
      fixture.xyzIds[0],
      fixture.materialIds.slice(0, 2)
    );

    expect(summoned.success, summoned.error).toBe(true);

    const activated = activateChainEffectForInstance(
      createEffectChain(summoned.state),
      xyzEffect(),
      fixture.xyzIds[0]
    );

    expect(
      activated.success,
      activated.errors.join(" ")
    ).toBe(true);

    expect(
      getAttachedXyzMaterials(
        activated.chain.gameState,
        fixture.xyzIds[0]
      )
    ).toHaveLength(1);

    const resolved = resolveEffectChain(activated.chain);

    expect(resolved.errors).toEqual([]);

    expect(resolved.chain.gameState.zones.hand).toHaveLength(1);
    expect(resolved.chain.gameState.zones.deck).toHaveLength(1);

    expect(
      validateCardInstanceSync(resolved.chain.gameState)
    ).toEqual([]);

    expect(
      isFieldSynchronized(resolved.chain.gameState)
    ).toBe(true);
  });

  it("preserves detached costs when an effect is negated", () => {
    const fixture = setup();

    const summoned = summon(
      fixture.state,
      fixture.xyzIds[0],
      fixture.materialIds.slice(0, 2)
    );

    expect(summoned.success, summoned.error).toBe(true);

    const activated = activateChainEffectForInstance(
      createEffectChain(summoned.state),
      xyzEffect(),
      fixture.xyzIds[0]
    );

    expect(activated.success).toBe(true);

    const negated = negateChainLink(
      activated.chain,
      activated.chain.links[0].chainLinkId
    );

    expect(negated.success).toBe(true);

    const resolved = resolveEffectChain(negated.chain);

    expect(resolved.chain.gameState.zones.hand).toHaveLength(0);
    expect(resolved.chain.gameState.zones.deck).toHaveLength(2);

    expect(
      getAttachedXyzMaterials(
        resolved.chain.gameState,
        fixture.xyzIds[0]
      )
    ).toHaveLength(1);
  });

  it("keeps two Xyz Monsters' materials independent", () => {
    const fixture = setup();

    const first = summon(
      fixture.state,
      fixture.xyzIds[0],
      fixture.materialIds.slice(0, 2)
    );

    expect(first.success, first.error).toBe(true);

    const second = summon(
      first.state,
      fixture.xyzIds[1],
      fixture.materialIds.slice(2, 4)
    );

    expect(second.success, second.error).toBe(true);

    const activated = activateChainEffectForInstance(
      createEffectChain(second.state),
      xyzEffect(),
      fixture.xyzIds[1]
    );

    expect(activated.success).toBe(true);

    expect(
      getAttachedXyzMaterials(
        activated.chain.gameState,
        fixture.xyzIds[0]
      )
    ).toEqual(fixture.materialIds.slice(0, 2));

    expect(
      getAttachedXyzMaterials(
        activated.chain.gameState,
        fixture.xyzIds[1]
      )
    ).toHaveLength(1);
  });

  it("rejects an invalid material without mutating state", () => {
    const fixture = setup();
    const original = structuredClone(fixture.state);

    const result = summon(
      fixture.state,
      fixture.xyzIds[0],
      [
        fixture.materialIds[0],
        "invalid-instance",
      ]
    );

    expect(result.success).toBe(false);
    expect(result.state).toBe(fixture.state);
    expect(fixture.state).toEqual(original);
  });
});