
import type { Combo } from "../../models/combo/Combo";

const STORAGE_KEY = "yugioh-combos-v1";

export function loadCombos(): Combo[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(isCombo);
  } catch {
    return [];
  }
}

function isCombo(value: unknown): value is Combo {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const combo = value as Record<string, unknown>;

  return (
    typeof combo.id === "string" &&
    typeof combo.name === "string" &&
    typeof combo.description === "string" &&
    Array.isArray(combo.starters) &&
    Array.isArray(combo.requirements) &&
    Array.isArray(combo.steps) &&
    Array.isArray(combo.endBoardCardIds) &&
    typeof combo.createdAt === "string" &&
    typeof combo.updatedAt === "string"
  );
}

export function saveCombos(combos: Combo[]): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(combos)
  );
}

export function upsertCombo(combo: Combo): Combo[] {
  const existing = loadCombos();

  const index = existing.findIndex(
    (item) => item.id === combo.id
  );

  const updated = [...existing];

  if (index === -1) {
    updated.push(combo);
  } else {
    updated[index] = combo;
  }

  saveCombos(updated);
  return updated;
}

export function deleteCombo(comboId: string): Combo[] {
  const updated = loadCombos().filter(
    (combo) => combo.id !== comboId
  );

  saveCombos(updated);
  return updated;
}
