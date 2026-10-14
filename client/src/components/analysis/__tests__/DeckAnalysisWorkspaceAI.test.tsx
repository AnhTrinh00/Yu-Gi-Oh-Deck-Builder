// @vitest-environment jsdom

import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

import type { Deck } from "../../../models/deck/Deck";

import DeckAnalysisWorkspace from "../DeckAnalysisWorkspace";

import {
  requestAIDeckRecommendations,
} from "../../../services/ai/aiDeckRecommendationApiService";

vi.mock(
  "../../../services/ai/aiDeckRecommendationApiService",
  () => ({
    requestAIDeckRecommendations: vi.fn(),
  })
);

const api = vi.mocked(requestAIDeckRecommendations);

const emptyDeck = (name: string): Deck => ({
  name,
  main: [],
  extra: [],
  side: [],
});

const emptyResponse = (summary: string) => ({
  analysis: {
    version: 1 as const,
    summary,
    recommendations: [],
    strengths: [],
    weaknesses: [],
    warnings: [],
  },
  grounding: {
    recommendations: [],
    groundedCount: 0,
    rejectedCount: 0,
  },
  validation: {
    recommendations: [],
    validCount: 0,
    invalidCount: 0,
  },
  simulation: {
    recommendations: [],
    appliedCount: 0,
    rejectedCount: 0,
    initialCounts: {
      main: 0,
      extra: 0,
      side: 0,
    },
    finalCounts: {
      main: 0,
      extra: 0,
      side: 0,
    },
  },
});

function deferred<T>() {
  let resolve!: (value: T) => void;

  const promise = new Promise<T>((r) => {
    resolve = r;
  });

  return { promise, resolve };
}

const props = {
  collection: [],
  relationships: [],
  combos: [],
  format: "advanced" as const,
  onSaveCombo: () => true,
};

function openRecommendations() {
  fireEvent.click(
    screen.getByRole("button", {
      name: "Recommendations",
    })
  );
}

function generate() {
  fireEvent.click(
    screen.getByRole("button", {
      name: "Generate AI Recommendations",
    })
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("DeckAnalysisWorkspace AI lifecycle", () => {
  it("renders loading and then displays the response", async () => {
    const pending = deferred<
      Awaited<
        ReturnType<typeof requestAIDeckRecommendations>
      >
    >();

    api.mockReturnValueOnce(pending.promise);

    render(
      <DeckAnalysisWorkspace
        {...props}
        deck={emptyDeck("Deck A")}
      />
    );

    openRecommendations();
    generate();

    expect(
      screen.getByRole("status").textContent
    ).toContain("Analyzing");

    pending.resolve(emptyResponse("Deck A result"));

    await waitFor(() =>
      expect(
        screen.getByText("Deck A result")
      ).toBeTruthy()
    );
  });

  it("discards an older response after switching decks", async () => {
    const first = deferred<
      Awaited<
        ReturnType<typeof requestAIDeckRecommendations>
      >
    >();

    const second = deferred<
      Awaited<
        ReturnType<typeof requestAIDeckRecommendations>
      >
    >();

    api
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    const { rerender } = render(
      <DeckAnalysisWorkspace
        {...props}
        deck={emptyDeck("Deck A")}
      />
    );

    openRecommendations();
    generate();

    rerender(
      <DeckAnalysisWorkspace
        {...props}
        deck={emptyDeck("Deck B")}
      />
    );

    expect(screen.queryByRole("status")).toBeNull();

    generate();

    first.resolve(emptyResponse("Stale A"));
    second.resolve(emptyResponse("Current B"));

    await waitFor(() =>
      expect(
        screen.getByText("Current B")
      ).toBeTruthy()
    );

    expect(
      screen.queryByText("Stale A")
    ).toBeNull();
  });

  it("does not resurface a stale response after switching back", async () => {
    const pending = deferred<
        Awaited<
        ReturnType<typeof requestAIDeckRecommendations>
        >
    >();

    api.mockReturnValueOnce(pending.promise);

    const { rerender } = render(
        <DeckAnalysisWorkspace
        {...props}
        deck={emptyDeck("Deck A")}
        />
    );

    openRecommendations();
    generate();

    expect(
        screen.getByRole("status").textContent
    ).toContain("Analyzing");

    // Commit the transition to Deck B before
    // switching back to Deck A.
    await act(async () => {
        rerender(
        <DeckAnalysisWorkspace
            {...props}
            deck={emptyDeck("Deck B")}
        />
        );
    });

    expect(screen.queryByRole("status")).toBeNull();

    await act(async () => {
        rerender(
        <DeckAnalysisWorkspace
            {...props}
            deck={emptyDeck("Deck A")}
        />
        );
    });

    // The old Deck A request must remain invalidated.
    expect(screen.queryByRole("status")).toBeNull();

    await act(async () => {
        pending.resolve(emptyResponse("Old A"));
        await pending.promise;
    });

    expect(screen.queryByText("Old A")).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
  });
});
