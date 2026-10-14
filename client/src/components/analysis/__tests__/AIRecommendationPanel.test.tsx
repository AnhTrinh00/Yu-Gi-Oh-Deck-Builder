import {
  describe,
  expect,
  it,
} from "vitest";

import {
  renderToStaticMarkup,
} from "react-dom/server";

import type {
  NormalizedAIRecommendationResult,
} from "../../../services/ai/aiRecommendationNormalizationService";

import AIRecommendationPanel from "../AIRecommendationPanel";

const recommendation = {
  action: "add" as const,
  cardId: 100,
  section: "main" as const,
  quantity: 1,
  reason: "Improves consistency.",
  confidence: "high" as const,
};

function makeResult(
  accepted = true
): NormalizedAIRecommendationResult {
  return {
    summary: "Improve deck consistency.",
    acceptedCount: accepted ? 1 : 0,
    rejectedCount: accepted ? 0 : 1,

    recommendations: [
      {
        index: 0,
        recommendation,
        status: accepted
          ? "accepted"
          : "rejected",

        groundingStatus: "grounded",

        validationStatus: accepted
          ? "valid"
          : "invalid",

        simulationStatus: accepted
          ? "applied"
          : "rejected",

        groundingReasons: [],

        validationReasons: accepted
          ? []
          : ["INSUFFICIENT_OWNED_COPIES"],

        simulationReasons: accepted
          ? []
          : ["INSUFFICIENT_OWNED_COPIES"],

        reasonMessages: accepted
          ? []
          : [
              "You do not own enough copies to make this change.",
            ],
      },
    ],
  };
}

describe("AIRecommendationPanel", () => {
  it("renders accepted recommendations", () => {
    const html = renderToStaticMarkup(
      <AIRecommendationPanel
        result={makeResult()}
        cardNames={new Map([[100, "Test Extender"]])}
      />
    );

    expect(html).toContain("Test Extender");
    expect(html).toContain("Passed simulation");
    expect(html).toContain("Improves consistency.");
  });

  it("renders rejected recommendations", () => {
    const html = renderToStaticMarkup(
      <AIRecommendationPanel
        result={makeResult(false)}
      />
    );

    expect(html).toContain("Rejected");

    expect(html).toContain(
      "You do not own enough copies"
    );
  });

  it("renders validation stage statuses", () => {
    const html = renderToStaticMarkup(
      <AIRecommendationPanel
        result={makeResult()}
      />
    );

    expect(html).toContain("Grounding:");
    expect(html).toContain("Independent validation:");
    expect(html).toContain("Simulation:");
  });

  it("renders an empty recommendation result", () => {
    const result: NormalizedAIRecommendationResult = {
      summary: "No changes needed.",
      recommendations: [],
      acceptedCount: 0,
      rejectedCount: 0,
    };

    const html = renderToStaticMarkup(
      <AIRecommendationPanel result={result} />
    );

    expect(html).toContain(
      "The AI did not suggest any deck changes."
    );
  });
});