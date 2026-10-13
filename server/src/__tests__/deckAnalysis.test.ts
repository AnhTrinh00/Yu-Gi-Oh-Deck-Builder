
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

const provider: LLMProvider = {
  analyze: async () => {
    throw new Error("AI must not be called.");
  },
};

const app = createApp(provider);

function makeContext() {
  return {
    version: 1,
    deckName: "Test Deck",
    format: "advanced",
    cards: [
      {
        id: 100,
        name: "Test Monster",
        section: "main",
        quantity: 2,
        type: "Effect Monster",
        race: "Warrior",
        description: "Test effect.",
        ownedQuantity: 1,
        missingQuantity: 1,
        banlistStatus: "Unlimited",
        allowedCopies: 3,
      },
    ],
    statistics: {
      mainCount: 2,
      extraCount: 0,
      sideCount: 0,
      totalCount: 2,
      uniqueCards: 1,
      missingCopies: 1,
      isDeckValid: false,
      validationErrors: [
        "Main Deck must contain at least 40 cards.",
      ],
    },
    limitations: [],
  };
}

describe("POST /api/ai/analyze-deck", () => {
  it("accepts a valid deck context", async () => {
    const response = await request(app)
      .post("/api/ai/analyze-deck")
      .send({
        question: "How can I improve my deck?",
        context: makeContext(),
      });

    expect(response.status).toBe(200);

    expect(response.body).toMatchObject({
      status: "accepted",
      contextVersion: 1,
      cardEntries: 1,
      aiAnalysisPerformed: false,
    });
  });

  it("rejects missing context", async () => {
    const response = await request(app)
      .post("/api/ai/analyze-deck")
      .send({
        question: "Analyze my deck.",
      });

    expect(response.status).toBe(400);
  });

  it("rejects invalid quantities", async () => {
    const context = makeContext();
    context.cards[0].quantity = -1;

    const response = await request(app)
      .post("/api/ai/analyze-deck")
      .send({ context });

    expect(response.status).toBe(400);
  });

  it("rejects inconsistent statistics", async () => {
    const context = makeContext();
    context.statistics.totalCount = 40;

    const response = await request(app)
      .post("/api/ai/analyze-deck")
      .send({ context });

    expect(response.status).toBe(400);
  });

  it("rejects excessive card entries", async () => {
    const context = makeContext();

    context.cards = Array.from(
      { length: 101 },
      (_, index) => ({
        ...context.cards[0],
        id: index + 1,
      })
    );

    const response = await request(app)
      .post("/api/ai/analyze-deck")
      .send({ context });

    expect(response.status).toBe(400);
  });

  it("rejects ungrounded simulation references", async () => {
    const context = {
      ...makeContext(),
      evidence: {
        relationships: [],
        savedCombos: [],
        simulations: [
          {
            comboId: "unknown-combo",
            outcome: "completed",
            summary: "Completed.",
            warnings: [],
            verification: "simulator-reported",
          },
        ],
        limitations: [],
      },
    };

    const response = await request(app)
      .post("/api/ai/analyze-deck")
      .send({ context });

    expect(response.status).toBe(400);
  });

  it("does not return provider credentials", async () => {
    const response = await request(app)
      .post("/api/ai/analyze-deck")
      .send({ context: makeContext() });

    expect(JSON.stringify(response.body))
      .not.toContain("apiKey");
  });
});
