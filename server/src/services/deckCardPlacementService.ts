export type DeckSection = "main" | "extra" | "side";

export type CardPlacementType =
  | "main"
  | "extra"
  | "unknown";

const EXTRA_DECK_KEYWORDS = [
  "fusion",
  "synchro",
  "xyz",
  "link",
];

export function getCardPlacementType(
  cardType: string
): CardPlacementType {
  const normalized = cardType.trim().toLowerCase();

  if (!normalized) {
    return "unknown";
  }

  const isMonster = normalized.includes("monster");

  if (!isMonster) {
    if (
      normalized.includes("spell") ||
      normalized.includes("trap")
    ) {
      return "main";
    }

    return "unknown";
  }

  const isExtraDeckMonster =
    EXTRA_DECK_KEYWORDS.some(keyword =>
      normalized.split(/\s+/).includes(keyword)
    );

  if (isExtraDeckMonster) {
    return "extra";
  }

  return "main";
}

export function canPlaceCardInSection(
  cardType: string,
  section: DeckSection
): boolean {
  const placement = getCardPlacementType(cardType);

  if (placement === "unknown") {
    return false;
  }

  if (section === "side") {
    return true;
  }

  return placement === section;
}