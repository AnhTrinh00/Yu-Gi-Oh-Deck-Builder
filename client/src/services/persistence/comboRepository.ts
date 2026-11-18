import type { Combo } from "../../models/combo/Combo";

import { getDatabase } from "./indexedDbService";

function validateCombo(combo: Combo): void {
  if (!combo.id.trim()) {
    throw new Error("Combo ID cannot be empty.");
  }

  if (!combo.name.trim()) {
    throw new Error("Combo name cannot be empty.");
  }

  if (
    !Array.isArray(combo.starters) ||
    !Array.isArray(combo.requirements) ||
    !Array.isArray(combo.steps) ||
    !Array.isArray(combo.endBoardCardIds)
  ) {
    throw new Error("Invalid combo structure.");
  }
}

export async function getSavedCombos(): Promise<Combo[]> {
  const database = await getDatabase();

  const combos = await database.getAll("combos");

  return combos.sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}

export async function getSavedCombo(
  id: string,
): Promise<Combo | null> {
  const database = await getDatabase();

  return (await database.get("combos", id)) ?? null;
}

export async function saveCombo(
  combo: Combo,
): Promise<void> {
  validateCombo(combo);

  const database = await getDatabase();

  await database.put("combos", combo);
}

export async function saveCombos(
  combos: Combo[],
): Promise<void> {
  for (const combo of combos) {
    validateCombo(combo);
  }

  const database = await getDatabase();
  const transaction = database.transaction(
    "combos",
    "readwrite",
  );

  const store = transaction.objectStore("combos");

  for (const combo of combos) {
    store.put(combo);
  }

  await transaction.done;
}

export async function deleteSavedCombo(
  id: string,
): Promise<void> {
  const database = await getDatabase();

  await database.delete("combos", id);
}

export async function clearSavedCombos(): Promise<void> {
  const database = await getDatabase();

  await database.clear("combos");
}