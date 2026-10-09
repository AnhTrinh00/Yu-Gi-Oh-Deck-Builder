
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import DeckOwnershipWarnings from "../DeckOwnershipWarnings";

describe("DeckOwnershipWarnings", () => {
  it("displays a valid ownership message", () => {
    const html = renderToStaticMarkup(
      <DeckOwnershipWarnings
        report={{
          valid: true,
          issues: [],
          totalMissingCopies: 0,
          affectedCards: 0,
        }}
      />
    );

    expect(html).toContain("Collection Compatibility");
    expect(html).toContain("enough copies");
  });

  it("displays missing card information", () => {
    const html = renderToStaticMarkup(
      <DeckOwnershipWarnings
        report={{
          valid: false,
          totalMissingCopies: 1,
          affectedCards: 1,
          issues: [
            {
              cardId: 1,
              cardName: "Blue-Eyes White Dragon",
              owned: 2,
              used: 3,
              missing: 1,
            },
          ],
        }}
      />
    );

    expect(html).toContain("Blue-Eyes White Dragon");
    expect(html).toContain("Missing: 1");
  });
});
