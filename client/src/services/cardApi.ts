import type { Card } from "../models/Card";

const API_BASE_URL = "https://db.ygoprodeck.com/api/v7";

export interface YuGiOhCard {
    id: number;
    name: string;

    type: string;
    frameType: string;

    desc: string;

    race: string;
    attribute?: string;

    level?: number;
    atk?: number;
    def?: number;

    archetype?: string;

    card_images: {
        id: number;
        image_url: string;
        image_url_small: string;
    }[];
}

interface CardApiResponse {
    data: YuGiOhCard[];
}

function mapApiCardToCard(apiCard: YuGiOhCard): Card {
  return {
    id: apiCard.id,
    name: apiCard.name,

    type: apiCard.type,
    frameType: apiCard.frameType,

    description: apiCard.desc,

    race: apiCard.race,
    attribute: apiCard.attribute,

    level: apiCard.level,
    atk: apiCard.atk,
    def: apiCard.def,

    archetype: apiCard.archetype,

    imageUrl: apiCard.card_images[0].image_url,
    imageUrlSmall: apiCard.card_images[0].image_url_small,
  };
}

export async function getCardByName(
    name: string
): Promise<Card | null> {
    const response = await fetch(
        `${API_BASE_URL}/cardinfo.php?name=${encodeURIComponent(name)}`
    );

    if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
    }

    const data: CardApiResponse = await response.json();

    const apiCard = data.data?.[0];

    if (!apiCard) {
        return null;
    }

    return mapApiCardToCard(apiCard);
}

export async function searchCards(
    name: string
): Promise<Card[]> {
    const response = await fetch(
        `${API_BASE_URL}/cardinfo.php?fname=${encodeURIComponent(name)}`
    );

    if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        console.error("YGOPRODeck API error:", errorData);

        throw new Error(
        errorData?.error ?? `API request failed: ${response.status}`
        );
    }

    const data: CardApiResponse = await response.json();

    return data.data.map(mapApiCardToCard);
}
