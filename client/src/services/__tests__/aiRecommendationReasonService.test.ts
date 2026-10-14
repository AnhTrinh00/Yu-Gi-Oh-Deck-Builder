import {
  describe,
  expect,
  it,
} from "vitest";

import {
  getRecommendationReasonMessage,
} from "../ai/aiRecommendationReasonService";

import type {
  RecommendationValidationReason,
} from "../../models/ai/AIDeckRecommendationValidation";

describe("getRecommendationReasonMessage", () => {
  const reasons: RecommendationValidationReason[] = [
    "NOT_GROUNDED",
    "UNKNOWN_CARD",
    "UNKNOWN_REPLACEMENT",
    "CARD_NOT_IN_SECTION",
    "INSUFFICIENT_DECK_COPIES",
    "INSUFFICIENT_OWNED_COPIES",
    "INVALID_SECTION",
    "BANLIST_LIMIT",
    "COPY_LIMIT",
    "DECK_SIZE_LIMIT",
  ];

  it.each(reasons)(
    "returns a readable message for %s",
    (reason) => {
      const message =
        getRecommendationReasonMessage(reason);

      expect(typeof message).toBe("string");
      expect(message.length).toBeGreaterThan(10);
      expect(message).not.toBe(reason);
    }
  );

  it("explains insufficient ownership", () => {
    expect(
      getRecommendationReasonMessage(
        "INSUFFICIENT_OWNED_COPIES"
      )
    ).toContain("own enough copies");
  });

  it("explains deck size restrictions", () => {
    expect(
      getRecommendationReasonMessage(
        "DECK_SIZE_LIMIT"
      )
    ).toContain("maximum size");
  });
});