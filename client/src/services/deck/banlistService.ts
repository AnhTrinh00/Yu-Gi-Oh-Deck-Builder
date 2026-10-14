import type { Card, BanlistStatus } from "../../models/card/Card";

export type DeckFormat = "advanced" | "traditional";

export function getBanlistStatus(
    card: Card,
    format: DeckFormat
): BanlistStatus {
    if (format === "advanced") {
        return card.banlistInfo?.tcg ?? "Unlimited";
    }

    return "Unlimited";
}

export function getBanlistCopyLimit(
    card: Card,
    format: DeckFormat
): number {
    const status = getBanlistStatus(card, format);

    switch (status) {
        case "Forbidden":
            return 0;

        case "Limited":
            return 1;

        case "Semi-Limited":
            return 2;

        case "Unlimited":
            return 3;
    }
}

export function getKnownBanlistCopyLimit(
  card: Card,
  format: DeckFormat
): number | undefined {
  if (format === "advanced") {
    const status = card.banlistInfo?.tcg;

    if (status === undefined) {
      return undefined;
    }

    return getBanlistCopyLimit(card, format);
  }

  return getBanlistCopyLimit(card, format);
}