import type {
  RecommendationValidationReason,
} from "../../models/ai/AIDeckRecommendationValidation";

const REASON_MESSAGES: Record<
  RecommendationValidationReason,
  string
> = {
  NOT_GROUNDED:
    "This recommendation could not be verified against your deck or collection.",

  UNKNOWN_CARD:
    "The recommended card could not be found in the available card data.",

  UNKNOWN_REPLACEMENT:
    "The replacement card could not be found in the available card data.",

  CARD_NOT_IN_SECTION:
    "The card is not present in the specified deck section.",

  INSUFFICIENT_DECK_COPIES:
    "There are not enough copies in your deck to make this change.",

  INSUFFICIENT_OWNED_COPIES:
    "You do not own enough copies to make this change.",

  INVALID_SECTION:
    "This card cannot be placed in the selected deck section.",

  BANLIST_LIMIT:
    "This change exceeds the known banlist restriction, or the card's banlist limit could not be verified.",

  COPY_LIMIT:
    "This change exceeds the maximum allowed copies across your deck.",

  DECK_SIZE_LIMIT:
    "This change would exceed the maximum size of the selected deck section.",
};

export function getRecommendationReasonMessage(
  reason: RecommendationValidationReason
): string {
  return REASON_MESSAGES[reason];
}