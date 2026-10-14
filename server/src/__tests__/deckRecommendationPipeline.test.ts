import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type {
  DeckAnalysisRequest,
} from "../schemas/deckContext.js";

import type {
  DeckRecommendationResponse,
} from "../schemas/deckRecommendation.js";

import type {
  DeckRecommendationGroundingResult,
} from "../schemas/deckRecommendationGrounding.js";

import type {
  DeckRecommendationValidationResult,
} from "../schemas/deckRecommendationValidation.js";

import type {
  DeckRecommendationSimulationResult,
} from "../schemas/deckRecommendationSimulation.js";

import {
  groundDeckRecommendations,
} from "../services/deckRecommendationGroundingService.js";

import {
  validateDeckRecommendations,
} from "../services/deckRecommendationValidationService.js";

import {
  simulateDeckRecommendations,
} from "../services/deckRecommendationSimulationService.js";

import {
  runDeckRecommendationPipeline,
} from "../services/deckRecommendationPipelineService.js";

vi.mock(
  "../services/deckRecommendationGroundingService.js",
  () => ({
    groundDeckRecommendations: vi.fn(),
  })
);

vi.mock(
  "../services/deckRecommendationValidationService.js",
  () => ({
    validateDeckRecommendations: vi.fn(),
  })
);

vi.mock(
  "../services/deckRecommendationSimulationService.js",
  () => ({
    simulateDeckRecommendations: vi.fn(),
  })
);

const mockedGrounding = vi.mocked(
  groundDeckRecommendations
);

const mockedValidation = vi.mocked(
  validateDeckRecommendations
);

const mockedSimulation = vi.mocked(
  simulateDeckRecommendations
);

const recommendation = {
  action: "add" as const,
  cardId: 200,
  section: "main" as const,
  quantity: 1,
  reason: "Improve combo consistency.",
  confidence: "high" as const,
};

const request: DeckAnalysisRequest = {
  question: "",
  context: {
    version: 1,
    deckName: "Pipeline Test Deck",
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
    availableCollectionCards: [
      {
        id: 200,
        name: "Extender",
        type: "Effect Monster",
        description: "Extends a combo.",
        ownedQuantity: 2,
        deckQuantity: 0,
        availableQuantity: 2,
        allowedCopies: 3,
      },
    ],
    collectionCatalogTruncated: false,
  },
};

const response: DeckRecommendationResponse = {
  version: 1,
  summary: "Improve deck consistency.",
  recommendations: [recommendation],
  strengths: [],
  weaknesses: [],
  warnings: [],
};

function makeGrounding(
  status: "grounded" | "rejected" = "grounded"
): DeckRecommendationGroundingResult {
  return {
    recommendations: [
      {
        recommendation,
        status,
        reasons:
          status === "grounded"
            ? []
            : ["UNKNOWN_CARD"],
      },
    ],
    groundedCount: status === "grounded" ? 1 : 0,
    rejectedCount: status === "rejected" ? 1 : 0,
  };
}

function makeValidation(
  status: "valid" | "invalid" = "valid"
): DeckRecommendationValidationResult {
  return {
    recommendations: [
      {
        recommendation,
        status,
        reasons:
          status === "valid"
            ? []
            : ["INSUFFICIENT_OWNED_COPIES"],
      },
    ],
    validCount: status === "valid" ? 1 : 0,
    invalidCount: status === "invalid" ? 1 : 0,
  };
}

function makeSimulation(
  status: "applied" | "rejected" = "applied"
): DeckRecommendationSimulationResult {
  return {
    recommendations: [
      {
        recommendation,
        status,
        reasons:
          status === "applied"
            ? []
            : ["INSUFFICIENT_OWNED_COPIES"],
      },
    ],
    appliedCount: status === "applied" ? 1 : 0,
    rejectedCount: status === "rejected" ? 1 : 0,
    initialCounts: {
      main: 0,
      extra: 0,
      side: 0,
    },
    finalCounts: {
      main: status === "applied" ? 1 : 0,
      extra: 0,
      side: 0,
    },
  };
}

describe("runDeckRecommendationPipeline", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    mockedGrounding.mockReturnValue(
      makeGrounding()
    );

    mockedValidation.mockReturnValue(
      makeValidation()
    );

    mockedSimulation.mockReturnValue(
      makeSimulation()
    );
  });

  it("runs grounding, validation, and simulation", () => {
    const result = runDeckRecommendationPipeline(
      request,
      response
    );

    expect(mockedGrounding).toHaveBeenCalledOnce();
    expect(mockedValidation).toHaveBeenCalledOnce();
    expect(mockedSimulation).toHaveBeenCalledOnce();

    expect(result.grounding.groundedCount).toBe(1);
    expect(result.validation.validCount).toBe(1);
    expect(result.simulation.appliedCount).toBe(1);
  });

  it("passes grounding results into validation", () => {
    const grounding = makeGrounding();

    mockedGrounding.mockReturnValue(grounding);

    runDeckRecommendationPipeline(
      request,
      response
    );

    expect(mockedValidation).toHaveBeenCalledWith(
      request.context,
      grounding
    );
  });

  it("passes validation results into simulation", () => {
    const validation = makeValidation();

    mockedValidation.mockReturnValue(validation);

    runDeckRecommendationPipeline(
      request,
      response
    );

    expect(mockedSimulation).toHaveBeenCalledWith(
      request,
      validation
    );
  });

  it("preserves the results of all three stages", () => {
    const grounding = makeGrounding();
    const validation = makeValidation();
    const simulation = makeSimulation();

    mockedGrounding.mockReturnValue(grounding);
    mockedValidation.mockReturnValue(validation);
    mockedSimulation.mockReturnValue(simulation);

    const result = runDeckRecommendationPipeline(
      request,
      response
    );

    expect(result).toEqual({
      grounding,
      validation,
      simulation,
    });
  });

  it("preserves rejected grounding results", () => {
    mockedGrounding.mockReturnValue(
      makeGrounding("rejected")
    );

    mockedValidation.mockReturnValue(
      makeValidation("invalid")
    );

    mockedSimulation.mockReturnValue(
      makeSimulation("rejected")
    );

    const result = runDeckRecommendationPipeline(
      request,
      response
    );

    expect(result.grounding.rejectedCount).toBe(1);
    expect(result.validation.invalidCount).toBe(1);
    expect(result.simulation.rejectedCount).toBe(1);
  });

  it("preserves rejected validation results", () => {
    mockedValidation.mockReturnValue(
      makeValidation("invalid")
    );

    mockedSimulation.mockReturnValue(
      makeSimulation("rejected")
    );

    const result = runDeckRecommendationPipeline(
      request,
      response
    );

    expect(result.validation.invalidCount).toBe(1);
    expect(result.simulation.rejectedCount).toBe(1);
  });

  it("does not mutate the original request", () => {
    const original = structuredClone(request);

    runDeckRecommendationPipeline(
      request,
      response
    );

    expect(request).toEqual(original);
  });

  it("does not mutate the original AI response", () => {
    const original = structuredClone(response);

    runDeckRecommendationPipeline(
      request,
      response
    );

    expect(response).toEqual(original);
  });

  it("runs all stages in the correct order", () => {
    runDeckRecommendationPipeline(
      request,
      response
    );

    const groundingOrder =
      mockedGrounding.mock.invocationCallOrder[0];

    const validationOrder =
      mockedValidation.mock.invocationCallOrder[0];

    const simulationOrder =
      mockedSimulation.mock.invocationCallOrder[0];

    expect(groundingOrder).toBeLessThan(
      validationOrder
    );

    expect(validationOrder).toBeLessThan(
      simulationOrder
    );
  });

  it("reuses existing grounding without recalculating it", () => {
    const existingGrounding = makeGrounding();

    const result = runDeckRecommendationPipeline(
        request,
        response,
        existingGrounding
    );

    expect(mockedGrounding).not.toHaveBeenCalled();

    expect(mockedValidation).toHaveBeenCalledWith(
        request.context,
        existingGrounding
    );

    expect(mockedSimulation).toHaveBeenCalledWith(
        request,
        expect.any(Object)
    );

    expect(result.grounding).toBe(existingGrounding);
  });

  it("calculates grounding when none is supplied", () => {
    runDeckRecommendationPipeline(
        request,
        response
    );

    expect(mockedGrounding).toHaveBeenCalledOnce();

    expect(mockedGrounding).toHaveBeenCalledWith(
        request.context,
        response
    );
  });

  it("does not modify the supplied grounding result", () => {
    const existingGrounding = makeGrounding();
    const original = structuredClone(existingGrounding);

    runDeckRecommendationPipeline(
        request,
        response,
        existingGrounding
    );

    expect(existingGrounding).toEqual(original);
  });
});
