
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import AnalysisTabs from "../AnalysisTabs";

describe("AnalysisTabs", () => {
  const tabs = [
    {
      id: "overview" as const,
      label: "Overview",
      content: <p>Overview content</p>,
    },
    {
      id: "combos" as const,
      label: "Combos",
      content: <p>Combo content</p>,
    },
  ];

  it("renders all tab labels", () => {
    const html = renderToStaticMarkup(
      <AnalysisTabs tabs={tabs} />
    );

    expect(html).toContain("Overview");
    expect(html).toContain("Combos");
  });

  it("renders the default tab content", () => {
    const html = renderToStaticMarkup(
      <AnalysisTabs tabs={tabs} />
    );

    expect(html).toContain("Overview content");
    expect(html).not.toContain("Combo content");
  });

  it("supports a different default tab", () => {
    const html = renderToStaticMarkup(
      <AnalysisTabs tabs={tabs} defaultTab="combos" />
    );

    expect(html).toContain("Combo content");
    expect(html).not.toContain("Overview content");
  });
});
