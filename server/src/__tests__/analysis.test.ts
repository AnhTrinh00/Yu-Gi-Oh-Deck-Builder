
import {
  describe,
  expect,
  it,
} from "vitest";

import request from "supertest";

import { createApp } from "../app.js";

import type {
  LLMProvider,
} from "../services/llmService.js";

import type {
  AnalysisResponse,
} from "../schemas/analysis.js";

const validRequest = {
  question: "Which combo is stronger?",
  combos: [
    {
      id: "combo-1",
      actions: [{
        effectId: "effect-1",
        description: "Search one card",
      }],
      metrics: {
        score: 75,
        finalHand: 3,
        finalField: 2,
        actionsUsed: 1,
        potentialInteractions: 1,
      },
      strengths: ["Short combo"],
      weaknesses: ["Limited board"],
    },
  ],
};

const validResponse: AnalysisResponse = {
  summary: "The supplied combo has a short sequence.",
  recommendedComboId: "combo-1",
  explanations: [{
    comboId: "combo-1",
    explanation: "It uses one action.",
    advantages: ["Low action count"],
    limitations: ["Only one potential interaction"],
  }],
  caveats: ["Official legality is not established."],
};

function mockProvider(
  response: AnalysisResponse = validResponse
): LLMProvider {
  return {
    analyze: async () => response,
  };
}

describe("Combo AI API", () => {
  it("returns a health response", async () => {
    const app = createApp(mockProvider());

    const response = await request(app)
      .get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
  });

  it("accepts a valid analysis request", async () => {
    const app = createApp(mockProvider());

    const response = await request(app)
      .post("/api/ai/analyze-combos")
      .send(validRequest);

    expect(response.status).toBe(200);
    expect(
      response.body.analysis.recommendedComboId
    ).toBe("combo-1");
    expect(response.body.rulesVerified).toBe(false);
  });

  it("rejects an empty combo list", async () => {
    const app = createApp(mockProvider());

    const response = await request(app)
      .post("/api/ai/analyze-combos")
      .send({
        question: "",
        combos: [],
      });

    expect(response.status).toBe(400);
  });

  it("rejects duplicate combo IDs", async () => {
    const app = createApp(mockProvider());

    const response = await request(app)
      .post("/api/ai/analyze-combos")
      .send({
        question: "",
        combos: [
          validRequest.combos[0],
          validRequest.combos[0],
        ],
      });

    expect(response.status).toBe(400);
  });

  it("rejects invented combo references", async () => {
    const app = createApp(mockProvider({
      ...validResponse,
      recommendedComboId: "invented-combo",
    }));

    const response = await request(app)
      .post("/api/ai/analyze-combos")
      .send(validRequest);

    expect(response.status).toBe(502);
  });

  it("rejects missing combo explanations", async () => {
    const app = createApp(mockProvider({
      ...validResponse,
      explanations: [],
    }));

    const response = await request(app)
      .post("/api/ai/analyze-combos")
      .send(validRequest);

    expect(response.status).toBe(502);
  });

  it("handles provider failures safely", async () => {
    const app = createApp({
      analyze: async () => {
        throw new Error("Private provider details");
      },
    });

    const response = await request(app)
      .post("/api/ai/analyze-combos")
      .send(validRequest);

    expect(response.status).toBe(502);
    expect(
      JSON.stringify(response.body)
    ).not.toContain("Private provider details");
  });
});
