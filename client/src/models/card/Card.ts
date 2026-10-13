export interface Card {
    id: number;
    name: string;

    type: string;
    frameType: string;

    description: string;

    race: string;
    attribute?: string;

    level?: number;
    atk?: number;
    def?: number;

    archetype?: string;

    imageUrl: string;
    imageUrlSmall: string;

    banlistInfo?: {
        tcg?: BanlistStatus;
        ocg?: BanlistStatus;
        goat?: BanlistStatus;
    };

    linkval?: number;
}

export type BanlistStatus =
  | "Forbidden"
  | "Limited"
  | "Semi-Limited"
  | "Unlimited";