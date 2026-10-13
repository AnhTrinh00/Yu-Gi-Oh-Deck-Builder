
import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type {
  DeckAnalysisRequest,
} from "../schemas/deckContext.js";

import {
  GeminiDeckRecommendationProvider,
} from "../services/geminiDeckRecommendationService.js";

function makeRequest(): DeckAnalysisRequest {
  return {
    question: "How can I improve consistency?",
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
  };
}

function makeResponse() {
  return {
    version: 1,
    summary: "The deck needs more consistency.",
    recommendations: [],
    strengths: ["Simple deck structure."],
    weaknesses: ["Insufficient card information."],
    warnings: ["Analysis is not rules-verified."],
  };
}

function makeProvider(responseText?: string) {
  const generateContent = vi.fn().mockResolvedValue({
    text: responseText,
  });

  const provider =
    new GeminiDeckRecommendationProvider(
      "",
      "test-model",
      { generateContent }
    );

  return { provider, generateContent };
}

describe("GeminiDeckRecommendationProvider", () => {
  it("returns a validated recommendation response", async () => {
    const { provider, generateContent } =
      makeProvider(JSON.stringify(makeResponse()));

    const result = await provider.recommend(
      makeRequest()
    );

    expect(result.version).toBe(1);
    expect(result.recommendations).toEqual([]);
    expect(generateContent).toHaveBeenCalledOnce();
  });

  it("sends the deck context to Gemini", async () => {
    const { provider, generateContent } =
      makeProvider(JSON.stringify(makeResponse()));

    await provider.recommend(makeRequest());

    const args = generateContent.mock.calls[0][0];

    expect(args.model).toBe("test-model");
    expect(args.config.responseMimeType)
      .toBe("application/json");

    const prompt = args.contents[0].parts[0].text;

    expect(prompt).toContain("Test Deck");
    expect(prompt).toContain(
      "How can I improve consistency?"
    );
  });

  it("rejects empty responses", async () => {
    const { provider } = makeProvider("");

    await expect(
      provider.recommend(makeRequest())
    ).rejects.toThrow(/empty recommendation/);
  });

  it("rejects malformed JSON", async () => {
    const { provider } = makeProvider(
      "{invalid-json}"
    );

    await expect(
      provider.recommend(makeRequest())
    ).rejects.toThrow(/invalid recommendation JSON/);
  });

  it("rejects invalid response structures", async () => {
    const { provider } = makeProvider(
      JSON.stringify({
        summary: "Missing required fields.",
      })
    );

    await expect(
      provider.recommend(makeRequest())
    ).rejects.toThrow(
      /invalid recommendation structure/
    );
  });

  it("rejects invalid recommendation quantities", async () => {
    const invalidResponse = {
      ...makeResponse(),
      recommendations: [
        {
          action: "add",
          cardId: 100,
          section: "main",
          quantity: 5,
          reason: "Invalid quantity.",
          confidence: "high",
        },
      ],
    };

    const { provider } = makeProvider(
      JSON.stringify(invalidResponse)
    );

    await expect(
      provider.recommend(makeRequest())
    ).rejects.toThrow(
      /invalid recommendation structure/
    );
  });

  it("propagates provider failures", async () => {
    const generateContent = vi.fn()
      .mockRejectedValue(
        new Error("Provider unavailable")
      );

    const provider =
      new GeminiDeckRecommendationProvider(
        "",
        "test-model",
        { generateContent }
      );

    await expect(
      provider.recommend(makeRequest())
    ).rejects.toThrow("Provider unavailable");
  });

  it("requires an API key without a mock client", () => {
    expect(() => {
      new GeminiDeckRecommendationProvider(
        "",
        "test-model"
      );
    }).toThrow("GEMINI_API_KEY is required.");
  });
});
