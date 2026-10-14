
import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type {
  DeckAnalysisRequest,
} from "../schemas/deckContext.js";

import type {
  DeckRecommendationProvider,
} from "../services/deckRecommendationService.js";

import {
  generateDeckRecommendations,
} from "../services/deckRecommendationService.js";

const makeRequest = (): DeckAnalysisRequest => ({
  question: "How can I improve this deck?",
  context: {
    version: 1,
    deckName: "Test Deck",
    format: "advanced",
    cards: [],
    statistics: {
      mainCount: 0,
      extraCount: 0,
      sideCount: 0,
      totalCount: 0,
      uniqueCards: 0,
      missingCopies: 0,
      isDeckValid: false,
      validationErrors: [],
    },
    limitations: [],
  },
});

describe("generateDeckRecommendations", () => {
  it("returns structured recommendations and grounding", async () => {
    const provider: DeckRecommendationProvider = {
      recommend: vi.fn().mockResolvedValue({
        version: 1,
        summary: "The deck needs additional starters.",
        recommendations: [],
        strengths: [],
        weaknesses: ["Low consistency."],
        warnings: [],
      }),
    };

    const result = await generateDeckRecommendations(
      makeRequest(),
      provider
    );

    expect(result.analysis.version).toBe(1);
    expect(result.grounding.groundedCount).toBe(0);
    expect(result.grounding.rejectedCount).toBe(0);
    expect(provider.recommend).toHaveBeenCalledOnce();
  });

  it("rejects malformed provider responses", async () => {
    const provider: DeckRecommendationProvider = {
      recommend: vi.fn().mockResolvedValue({
        summary: "Missing required fields.",
      }),
    };

    await expect(
      generateDeckRecommendations(
        makeRequest(),
        provider
      )
    ).rejects.toThrow();
  });

  it("propagates provider failures", async () => {
    const provider: DeckRecommendationProvider = {
      recommend: vi.fn().mockRejectedValue(
        new Error("Provider unavailable.")
      ),
    };

    await expect(
      generateDeckRecommendations(
        makeRequest(),
        provider
      )
    ).rejects.toThrow("Provider unavailable.");
  });
});
