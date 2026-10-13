
import type { CollectionCard } from "../../models/CollectionCard";

export type CollectionCategory =
  | "all"
  | "monster"
  | "spell"
  | "trap"
  | "extra";

export type CollectionSort =
  | "name-asc"
  | "name-desc"
  | "quantity-desc"
  | "quantity-asc"
  | "type"
  | "archetype";

export interface CollectionFilters {
  search: string;
  category: CollectionCategory;
  monsterType: string;
  archetype: string;
  sort: CollectionSort;
}

export const DEFAULT_COLLECTION_FILTERS: CollectionFilters = {
  search: "",
  category: "all",
  monsterType: "all",
  archetype: "all",
  sort: "name-asc",
};

const EXTRA_TYPES = ["fusion", "synchro", "xyz", "link"];

export function getCollectionCategory(type: string): CollectionCategory {
  const normalized = type.toLowerCase();

  if (normalized.includes("spell")) return "spell";
  if (normalized.includes("trap")) return "trap";

  if (EXTRA_TYPES.some((type) => normalized.includes(type))) {
    return "extra";
  }

  return "monster";
}

export function getMonsterTypes(collection: CollectionCard[]): string[] {
  return [...new Set(
    collection
      .filter((item) =>
        ["monster", "extra"].includes(
          getCollectionCategory(item.card.type)
        )
      )
      .map((item) => item.card.type)
  )].sort();
}

export function getCollectionArchetypes(
  collection: CollectionCard[]
): string[] {
  return [...new Set(
    collection
      .map((item) => item.card.archetype?.trim())
      .filter((name): name is string => Boolean(name))
  )].sort((a, b) => a.localeCompare(b));
}

export function filterCollection(
  collection: CollectionCard[],
  filters: CollectionFilters
): CollectionCard[] {
  const search = filters.search.trim().toLowerCase();

  const filtered = collection.filter(({ card }) => {
    const category = getCollectionCategory(card.type);

    const matchesSearch =
      !search ||
      card.name.toLowerCase().includes(search) ||
      card.type.toLowerCase().includes(search) ||
      (card.archetype ?? "").toLowerCase().includes(search);

    const matchesCategory =
      filters.category === "all" ||
      category === filters.category ||
      (filters.category === "monster" && category === "extra");

    const matchesMonsterType =
      filters.monsterType === "all" ||
      card.type === filters.monsterType;

    const matchesArchetype =
      filters.archetype === "all" ||
      card.archetype === filters.archetype;

    return (
      matchesSearch &&
      matchesCategory &&
      matchesMonsterType &&
      matchesArchetype
    );
  });

  return filtered.sort((a, b) => {
    switch (filters.sort) {
      case "name-desc":
        return b.card.name.localeCompare(a.card.name);
      case "quantity-desc":
        return b.quantity - a.quantity ||
          a.card.name.localeCompare(b.card.name);
      case "quantity-asc":
        return a.quantity - b.quantity ||
          a.card.name.localeCompare(b.card.name);
      case "type":
        return a.card.type.localeCompare(b.card.type) ||
          a.card.name.localeCompare(b.card.name);
      case "archetype":
        return (a.card.archetype ?? "").localeCompare(
          b.card.archetype ?? ""
        ) || a.card.name.localeCompare(b.card.name);
      default:
        return a.card.name.localeCompare(b.card.name);
    }
  });
}

export function getCollectionStatistics(collection: CollectionCard[]) {
  const totals = {
    totalCopies: 0,
    uniqueCards: collection.length,
    monsters: 0,
    spells: 0,
    traps: 0,
    extraDeck: 0,
  };

  for (const { card, quantity } of collection) {
    totals.totalCopies += quantity;

    const category = getCollectionCategory(card.type);

    if (category === "monster" || category === "extra") {
      totals.monsters += quantity;
    }

    if (category === "spell") totals.spells += quantity;
    if (category === "trap") totals.traps += quantity;
    if (category === "extra") totals.extraDeck += quantity;
  }

  return totals;
}
