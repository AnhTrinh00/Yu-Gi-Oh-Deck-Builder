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
}