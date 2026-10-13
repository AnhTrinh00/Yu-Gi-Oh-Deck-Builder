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