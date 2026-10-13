
import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  GameState,
} from "../../models/simulation/GameState";

import {
  normalizeGameState,
} from "../simulation/extendedGameStateService";

import {
  findAvailableFieldZone,
  isFieldSynchronized,
  placeCardOnField,
  removeCardFromField,
} from "../simulation/field/fieldZoneService";

function createState(): GameState {
  return normalizeGameState({
    zones: {
      hand: [100, 100, 200],
      deck: [300],
      extra: [],
      field: [],
      graveyard: [],
      banished: [],
    },
    normalSummonUsed: false,
    usedEffects: [],
    actionHistory: [],
  });
}

describe("fieldZoneService", () => {
  it("places a monster on the field", () => {
    const original = createState();

    const result = placeCardOnField(original, {
      cardId: 100,
      from: "hand",
      zoneType: "monster",
      zoneIndex: 0,
      instanceId: "monster-1",
    });

    expect(result.success).toBe(true);

    expect(result.state.zones.hand).toEqual([
      100,
      200,
    ]);

    expect(result.state.zones.field).toEqual([
      100,
    ]);

    expect(
      result.state.fieldState!.monsterZones[0]
        ?.instanceId
    ).toBe("monster-1");

    expect(isFieldSynchronized(result.state)).toBe(
      true
    );

    expect(original.zones.field).toEqual([]);
  });

  it("places two copies with different instance IDs", () => {
    const first = placeCardOnField(
      createState(),
      {
        cardId: 100,
        from: "hand",
        zoneType: "monster",
        zoneIndex: 0,
        instanceId: "copy-1",
      }
    );

    const second = placeCardOnField(
      first.state,
      {
        cardId: 100,
        from: "hand",
        zoneType: "monster",
        zoneIndex: 1,
        instanceId: "copy-2",
      }
    );

    expect(second.success).toBe(true);
    expect(second.state.zones.field).toEqual([
      100,
      100,
    ]);

    expect(
      second.state.fieldState!.monsterZones[1]
        ?.instanceId
    ).toBe("copy-2");
  });

  it("rejects placement in an occupied zone", () => {
    const first = placeCardOnField(
      createState(),
      {
        cardId: 100,
        from: "hand",
        zoneType: "monster",
        zoneIndex: 0,
        instanceId: "copy-1",
      }
    );

    const second = placeCardOnField(
      first.state,
      {
        cardId: 200,
        from: "hand",
        zoneType: "monster",
        zoneIndex: 0,
        instanceId: "copy-2",
      }
    );

    expect(second.success).toBe(false);
    expect(second.state).toBe(first.state);
  });

  it("rejects duplicate field instance IDs", () => {
    const first = placeCardOnField(
      createState(),
      {
        cardId: 100,
        from: "hand",
        zoneType: "monster",
        zoneIndex: 0,
        instanceId: "same-id",
      }
    );

    const second = placeCardOnField(
      first.state,
      {
        cardId: 100,
        from: "hand",
        zoneType: "monster",
        zoneIndex: 1,
        instanceId: "same-id",
      }
    );

    expect(second.success).toBe(false);
  });

  it("moves a monster from field to graveyard", () => {
    const placed = placeCardOnField(
      createState(),
      {
        cardId: 100,
        from: "hand",
        zoneType: "monster",
        zoneIndex: 0,
        instanceId: "monster-1",
      }
    );

    const removed = removeCardFromField(
      placed.state,
      {
        zoneType: "monster",
        zoneIndex: 0,
        to: "graveyard",
      }
    );

    expect(removed.success).toBe(true);

    expect(removed.state.zones.field).toEqual(
      []
    );

    expect(
      removed.state.zones.graveyard
    ).toEqual([100]);

    expect(
      removed.state.fieldState!.monsterZones[0]
    ).toBeNull();

    expect(isFieldSynchronized(removed.state)).toBe(
      true
    );
  });

  it("places a Spell/Trap card face-down", () => {
    const result = placeCardOnField(
      createState(),
      {
        cardId: 200,
        from: "hand",
        zoneType: "spell-trap",
        zoneIndex: 2,
        instanceId: "spell-1",
      }
    );

    expect(result.success).toBe(true);

    expect(
      result.state.fieldState!.spellTrapZones[2]
        ?.position
    ).toBe("face-down");
  });

  it("places a card into the Field Spell Zone", () => {
    const result = placeCardOnField(
      createState(),
      {
        cardId: 200,
        from: "hand",
        zoneType: "field-spell",
        instanceId: "field-spell-1",
      }
    );

    expect(result.success).toBe(true);

    expect(
      result.state.fieldState!.fieldSpellZone
        ?.instanceId
    ).toBe("field-spell-1");
  });

  it("finds the first available monster zone", () => {
    const placed = placeCardOnField(
      createState(),
      {
        cardId: 100,
        from: "hand",
        zoneType: "monster",
        zoneIndex: 0,
        instanceId: "monster-1",
      }
    );

    expect(
      findAvailableFieldZone(
        placed.state,
        "monster"
      )
    ).toBe(1);
  });

  it("detects desynchronized field data", () => {
    const state = createState();

    state.zones.field.push(999);

    expect(isFieldSynchronized(state)).toBe(
      false
    );
  });

  it("rejects operations on desynchronized state", () => {
    const state = createState();

    state.zones.field.push(999);

    const result = placeCardOnField(
      state,
      {
        cardId: 100,
        from: "hand",
        zoneType: "monster",
        zoneIndex: 0,
        instanceId: "monster-1",
      }
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain(
      "not synchronized"
    );
  });
});
