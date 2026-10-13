
import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type {
  AIDeckContext,
} from "../../models/ai/AIDeckContext";

import {
  AIDeckApiError,
  submitAIDeckAnalysis,
} from "../ai/aiDeckApiService";

const context: AIDeckContext = {
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
};

const request = {
  question: "Analyze this deck.",
  context,
};

const acceptedResponse = {
  status: "accepted",
  contextVersion: 1,
  deckName: "Test Deck",
  cardEntries: 0,
  evidenceIncluded: false,
  aiAnalysisPerformed: false,
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("submitAIDeckAnalysis", () => {
  it("submits the deck context to the backend", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify(acceptedResponse),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      )
    );

    vi.stubGlobal("fetch", fetchMock);

    const result = await submitAIDeckAnalysis(request);

    expect(result).toEqual(acceptedResponse);

    expect(fetchMock).toHaveBeenCalledOnce();

    const [url, options] = fetchMock.mock.calls[0];

    expect(url).toContain("/api/ai/analyze-deck");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual(request);
  });

  it("handles backend validation failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: "Invalid deck analysis request.",
          }),
          { status: 400 }
        )
      )
    );

    await expect(
      submitAIDeckAnalysis(request)
    ).rejects.toMatchObject({
      name: "AIDeckApiError",
      status: 400,
    });
  });

  it("handles oversized requests", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(null, { status: 413 })
      )
    );

    await expect(
      submitAIDeckAnalysis(request)
    ).rejects.toThrow(/exceeds the server request limit/);
  });

  it("handles rate limiting", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(null, { status: 429 })
      )
    );

    await expect(
      submitAIDeckAnalysis(request)
    ).rejects.toMatchObject({
      status: 429,
    });
  });

  it("handles network failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(
        new TypeError("Failed to fetch")
      )
    );

    await expect(
      submitAIDeckAnalysis(request)
    ).rejects.toThrow(
      "Unable to connect to the AI service."
    );
  });

  it("rejects malformed backend responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            status: "accepted",
          }),
          { status: 200 }
        )
      )
    );

    await expect(
      submitAIDeckAnalysis(request)
    ).rejects.toThrow(
      "The AI service returned an unexpected response."
    );
  });

  it("rejects invalid JSON responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("not-json", { status: 200 })
      )
    );

    await expect(
      submitAIDeckAnalysis(request)
    ).rejects.toThrow(
      "The AI service returned invalid JSON."
    );
  });

  it("supports cancellation", async () => {
    const controller = new AbortController();
    controller.abort();

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      submitAIDeckAnalysis(
        request,
        { signal: controller.signal }
      )
    ).rejects.toThrow("Request cancelled.");

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns a typed API error", () => {
    const error = new AIDeckApiError(
      "Example error",
      400
    );

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("AIDeckApiError");
    expect(error.status).toBe(400);
  });
});
