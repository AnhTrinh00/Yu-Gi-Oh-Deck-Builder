import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import express from "express";
import type { Server } from "node:http";

import {
  createDeckRecommendationRouter,
} from "../routes/deckRecommendationRoutes.js";

import type {
  DeckRecommendationProvider,
} from "../services/deckRecommendationService.js";

const servers: Server[] = [];

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      server =>
        new Promise<void>((resolve, reject) => {
          server.close(error => {
            if (error) reject(error);
            else resolve();
          });
        })
    )
  );
});

async function startServer(
  provider: DeckRecommendationProvider
): Promise<string> {
  const app = express();

  app.use(express.json());

  app.use(
    "/api/ai/recommend-deck",
    createDeckRecommendationRouter(provider)
  );

  const server = await new Promise<Server>(resolve => {
    const instance = app.listen(0, "127.0.0.1", () => {
      resolve(instance);
    });
  });

  servers.push(server);

  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Unable to determine test port.");
  }

  return `http://127.0.0.1:${address.port}`;
}

const validRequest = {
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

describe("deck recommendation route", () => {
  it("returns recommendations and grounding", async () => {
    const recommend = vi.fn().mockResolvedValue({
      version: 1,
      summary: "Consider improving consistency.",
      recommendations: [],
      strengths: [],
      weaknesses: [],
      warnings: [],
    });

    const baseUrl = await startServer({ recommend });

    const response = await fetch(
      `${baseUrl}/api/ai/recommend-deck`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validRequest),
      }
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.analysis.version).toBe(1);
    expect(body.grounding.groundedCount).toBe(0);
    expect(recommend).toHaveBeenCalledOnce();

    expect(body.validation).toBeDefined();
    expect(body.simulation).toBeDefined();

    expect(body.validation.validCount).toBe(0);
    expect(body.simulation.appliedCount).toBe(0);
  });

  it("rejects invalid requests without calling Gemini", async () => {
    const recommend = vi.fn();

    const baseUrl = await startServer({ recommend });

    const response = await fetch(
      `${baseUrl}/api/ai/recommend-deck`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          context: { version: 999 },
        }),
      }
    );

    expect(response.status).toBe(400);
    expect(recommend).not.toHaveBeenCalled();
  });

  it("returns a safe error when the provider fails", async () => {
    const recommend = vi.fn().mockRejectedValue(
      new Error("Sensitive provider details")
    );

    const baseUrl = await startServer({ recommend });

    const response = await fetch(
      `${baseUrl}/api/ai/recommend-deck`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validRequest),
      }
    );

    expect(response.status).toBe(502);

    const body = await response.json();

    expect(body.error).toBe(
      "Unable to generate deck recommendations."
    );

    expect(JSON.stringify(body)).not.toContain(
      "Sensitive provider details"
    );
  });
});
