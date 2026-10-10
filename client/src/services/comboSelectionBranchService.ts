
import type { CardEffectDefinition } from "../models/CardEffect";
import type { GameState, GameZone } from "../models/GameState";
import type {
  CardInstanceSelection,
} from "../models/CardSelection";
import type {
  EffectExecutionSelections,
} from "../models/EffectExecutionSelection";

interface SelectionSlot {
  index: number;
  cardId: number;
  zone: GameZone;
  kind: "cost" | "choose";
  section: "cost" | "resolution";
}

function getSlots(
  effect: CardEffectDefinition
): SelectionSlot[] {
  const slots: SelectionSlot[] = [];

  effect.costs.forEach((cost, index) => {
    if (cost.type === "move-card") {
      slots.push({
        index,
        cardId: cost.cardId,
        zone: cost.from,
        kind: "cost",
        section: "cost",
      });
    }
  });

  effect.steps.forEach((step, index) => {
    if (step.type === "draw") return;

    if (step.type === "search") {
      slots.push({
        index,
        cardId: step.cardId,
        zone: "deck",
        kind: "choose",
        section: "resolution",
      });
      return;
    }

    slots.push({
      index,
      cardId: step.cardId,
      zone: step.type === "destroy"
        ? "field"
        : step.from,
      kind: "choose",
      section: "resolution",
    });
  });

  return slots;
}

function matchingInstances(
  state: GameState,
  slot: SelectionSlot
): string[] {
  return (state.cardInstances?.instances ?? [])
    .filter(
      instance =>
        instance.cardId === slot.cardId &&
        instance.zone === slot.zone
    )
    .map(instance => instance.instanceId)
    .sort();
}

export function generateSelectionBranches(
  state: GameState,
  effect: CardEffectDefinition,
  maxBranches = 32
): EffectExecutionSelections[] {
  if (!state.cardInstances) return [];

  const limit = Number.isFinite(maxBranches)
    ? Math.max(0, Math.floor(maxBranches))
    : 0;

  if (limit === 0) return [];

  const slots = getSlots(effect);

  const results: EffectExecutionSelections[] = [];

  function visit(
    index: number,
    costSelections: CardInstanceSelection[],
    resolutionSelections: CardInstanceSelection[],
    reserved: Set<string>
  ): void {
    if (results.length >= limit) return;

    if (index === slots.length) {
      results.push({
        costSelections: [...costSelections],
        resolutionSelections: [...resolutionSelections],
      });
      return;
    }

    const slot = slots[index];

    const matches = matchingInstances(state, slot);

    // One physical copy requires no explicit selection.
    // Multiple copies produce separate search branches.
    if (matches.length <= 1) {
      visit(
        index + 1,
        costSelections,
        resolutionSelections,
        reserved
      );
      return;
    }

    for (const instanceId of matches) {
      if (reserved.has(instanceId)) continue;

      const selection: CardInstanceSelection = {
        stepIndex: slot.index,
        instanceId,
        kind: slot.kind,
        expectedZone: slot.zone,
      };

      const nextReserved = new Set(reserved);
      nextReserved.add(instanceId);

      visit(
        index + 1,
        slot.section === "cost"
          ? [...costSelections, selection]
          : costSelections,
        slot.section === "resolution"
          ? [...resolutionSelections, selection]
          : resolutionSelections,
        nextReserved
      );

      if (results.length >= limit) break;
    }
  }

  visit(0, [], [], new Set());

  return results;
}
