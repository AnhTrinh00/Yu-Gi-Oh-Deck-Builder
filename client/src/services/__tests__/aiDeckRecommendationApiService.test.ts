
import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type {
  AIRecommendationRequest,
} from "../ai/aiDeckRecommendationApiService";

import {
  requestAIDeckRecommendations,
} from "../ai/aiDeckRecommendationApiService";

const request: AIRecommendationRequest = {
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
};

const validResponse = {
  analysis: {
    version: 1,
    summary: "Improve consistency.",
    recommendations: [],
    strengths: [],
    weaknesses: [],
    warnings: [],
  },
  grounding: {
    recommendations: [],
    groundedCount: 0,
    rejectedCount: 0,
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("requestAIDeckRecommendations", () => {
  it("posts deck context and returns recommendations", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => validResponse,
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await requestAIDeckRecommendations(
      request
    );

    expect(result.analysis.summary).toBe(
      "Improve consistency."
    );

    expect(result.grounding.groundedCount).toBe(0);

    expect(fetchMock).toHaveBeenCalledOnce();

    const [url, options] = fetchMock.mock.calls[0];

    expect(url).toContain(
      "/api/ai/recommend-deck"
    );

    expect(options.method).toBe("POST");

    expect(JSON.parse(options.body)).toEqual(request);
  });

  it("handles invalid deck context", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
      })
    );

    await expect(
      requestAIDeckRecommendations(request)
    ).rejects.toThrow(
      "The deck context is invalid."
    );
  });

  it("handles rate limiting", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
      })
    );

    await expect(
      requestAIDeckRecommendations(request)
    ).rejects.toThrow(
      "Too many AI requests."
    );
  });

  it("handles provider failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
      })
    );

    await expect(
      requestAIDeckRecommendations(request)
    ).rejects.toThrow(
      "temporarily unavailable"
    );
  });

  it("rejects an invalid response envelope", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          unexpected: true,
        }),
      })
    );

    await expect(
      requestAIDeckRecommendations(request)
    ).rejects.toThrow(
      "invalid response"
    );
  });
});
