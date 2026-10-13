
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

const mockProvider: LLMProvider = {
  analyze: async () => {
    throw new Error("Provider should not be called.");
  },
};

describe("API error handling", () => {
  const app = createApp(mockProvider);

  it("returns 404 for unknown endpoints", async () => {
    const response = await request(app)
      .get("/api/unknown");

    expect(response.status).toBe(404);

    expect(response.body).toEqual({
      error: "API endpoint not found.",
    });
  });

  it("rejects malformed JSON", async () => {
    const response = await request(app)
      .post("/api/ai/analyze-combos")
      .set("Content-Type", "application/json")
      .send('{"combos": [invalid]}');

    expect(response.status).toBe(400);

    expect(response.body).toEqual({
      error: "Malformed JSON request body.",
    });
  });

  it("rejects oversized request bodies", async () => {
    const response = await request(app)
      .post("/api/ai/analyze-combos")
      .send({
        question: "x".repeat(40_000),
        combos: [],
      });

    expect(response.status).toBe(413);

    expect(response.body).toEqual({
      error: "Request body is too large.",
    });
  });

  it("does not expose internal server details", async () => {
    const response = await request(app)
      .get("/api/nonexistent");

    expect(
      JSON.stringify(response.body)
    ).not.toContain("stack");

    expect(
      JSON.stringify(response.body)
    ).not.toContain("node_modules");
  });
});
