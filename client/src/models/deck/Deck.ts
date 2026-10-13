import type { Card } from "../card/Card";

export type DeckSection = "main" | "extra" | "side";

export interface DeckCard {
    card: Card;
    quantity: number;
}

export interface Deck {
    name: string;
    main: DeckCard[];
    extra: DeckCard[];
    side: DeckCard[];
}