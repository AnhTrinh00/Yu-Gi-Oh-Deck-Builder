
import {
  describe,
  expect,
  it,
} from "vitest";

import {
  validateCardCopyLimit,
} from "../services/deckRecommendationCopyLimitService.js";

describe("validateCardCopyLimit", () => {
  it("allows three copies of an Unlimited card", () => {
    const result = validateCardCopyLimit(2, 1, 3);

    expect(result.valid).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  it("rejects more than three copies", () => {
    const result = validateCardCopyLimit(3, 1, 3);

    expect(result.valid).toBe(false);
    expect(result.reasons).toContain("COPY_LIMIT");
  });

  it("rejects Forbidden cards", () => {
    const result = validateCardCopyLimit(0, 1, 0);

    expect(result.valid).toBe(false);
    expect(result.reasons).toContain("BANLIST_LIMIT");
  });

  it("enforces Limited cards", () => {
    expect(
      validateCardCopyLimit(0, 1, 1).valid
    ).toBe(true);

    expect(
      validateCardCopyLimit(1, 1, 1).reasons
    ).toContain("BANLIST_LIMIT");
  });

  it("enforces Semi-Limited cards", () => {
    expect(
      validateCardCopyLimit(1, 1, 2).valid
    ).toBe(true);

    expect(
      validateCardCopyLimit(2, 1, 2).reasons
    ).toContain("BANLIST_LIMIT");
  });

  it("rejects unknown banlist allowances", () => {
    const result = validateCardCopyLimit(
      0,
      1,
      undefined
    );

    expect(result.valid).toBe(false);
    expect(result.reasons).toContain("BANLIST_LIMIT");
  });

  it("allows reductions without requiring a limit", () => {
    const result = validateCardCopyLimit(
      3,
      -1,
      undefined
    );

    // This helper validates additions. Negative deltas
    // should not be used for removal recommendations.
    expect(result.valid).toBe(false);
  });
});
