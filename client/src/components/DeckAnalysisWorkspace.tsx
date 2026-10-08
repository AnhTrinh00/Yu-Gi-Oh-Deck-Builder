
import { useState } from "react";

import type { Deck } from "../models/Deck";
import type { CollectionCard } from "../models/CollectionCard";
import type { CardRelationship } from "../models/CardRelationship";
import type { Combo } from "../models/Combo";
import type { RecommendationPriority } from "../models/DeckRecommendation";
import type { DeckFormat } from "../services/banlistService";

import { useDeckAnalysis } from "../hooks/useDeckAnalysis";
import { candidateToComboDraft } from "../services/comboCandidateConversionService";

import ComboEditor from "./ComboEditor";
import ComboEvaluation from "./ComboEvaluation";

type AnalysisTab =
  | "overview"
  | "discovery"
  | "evaluation"
  | "recommendations";

interface Props {
  deck: Deck;
  collection: CollectionCard[];
  relationships: CardRelationship[];
  combos: Combo[];
  format: DeckFormat;
  onSaveCombo: (combo: Combo) => boolean;
}

export default function DeckAnalysisWorkspace({
  deck,
  collection,
  relationships,
  combos,
  format,
  onSaveCombo,
}: Props) {
  const [activeTab, setActiveTab] =
    useState<AnalysisTab>("overview");

  const [maxDepth, setMaxDepth] = useState(3);
  const [starterFilter, setStarterFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] =
    useState<RecommendationPriority | "all">("all");

  const [draftCombo, setDraftCombo] = useState<Combo | null>(
    null
  );

  const analysis = useDeckAnalysis({
    deck,
    collection,
    relationships,
    combos,
    format,
    maxDepth,
  });

  const {
    cards,
    cardNames,
    counts,
    candidates,
    recommendations,
    summary,
    health,
  } = analysis;

  function cardName(id: number): string {
    return cardNames.get(id) ?? `Card ${id}`;
  }

  const visibleCandidates = candidates.filter(
    (candidate) =>
      starterFilter === "all" ||
      candidate.starterCardId === Number(starterFilter)
  );

  const visibleRecommendations = recommendations.filter(
    (recommendation) =>
      priorityFilter === "all" ||
      recommendation.priority === priorityFilter
  );

  function startComboDraft(
    candidate: (typeof candidates)[number]
  ) {
    const draft = candidateToComboDraft(
      candidate,
      cardNames
    );

    setDraftCombo(draft);
    setActiveTab("discovery");
  }

  return (
    <section className="deck-analysis-workspace">
      <h2>Deck Analysis</h2>

      <p>
        Analyze deck composition, discover candidate combos,
        evaluate saved sequences, and review recommendations.
      </p>

      <nav
        className="analysis-tabs"
        aria-label="Deck analysis sections"
      >
        {(
          [
            ["overview", "Overview"],
            ["discovery", "Combo Discovery"],
            ["evaluation", "Combo Evaluation"],
            ["recommendations", "Recommendations"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-current={
              activeTab === id ? "page" : undefined
            }
            className={
              activeTab === id ? "active" : ""
            }
            onClick={() => {
              setActiveTab(id);
              setDraftCombo(null);
            }}
          >
            {label}
          </button>
        ))}
      </nav>

      {activeTab === "overview" && (
        <div className="analysis-panel">
          <h3>Deck Overview</h3>

          <div className="analysis-metrics">
            <div>
              <strong>{counts.main}</strong>
              <span>Main Deck</span>
            </div>

            <div>
              <strong>{counts.extra}</strong>
              <span>Extra Deck</span>
            </div>

            <div>
              <strong>{counts.side}</strong>
              <span>Side Deck</span>
            </div>

            <div>
              <strong>{counts.unique}</strong>
              <span>Unique Cards</span>
            </div>

            <div>
              <strong>{summary.candidateCount}</strong>
              <span>Candidate Paths</span>
            </div>

            <div>
              <strong>
                {summary.accessibleCandidates}
              </strong>
              <span>Paths with Main Deck Starters</span>
            </div>

            <div>
              <strong>{summary.simulatedCombos}</strong>
              <span>Saved Combos</span>
            </div>

            <div>
              <strong>
                {summary.successfulSimulations}
              </strong>
              <span>Passing Simplified Simulations</span>
            </div>

            <div>
              <strong>
                {summary.recommendationCount}
              </strong>
              <span>Recommendations</span>
            </div>

            <div>
              <strong>
                {summary.highPriorityCount}
              </strong>
              <span>High Priority</span>
            </div>
          </div>
  
          <div className="analysis-health">
            <h3>Analysis Health</h3>

            <div className="analysis-health-summary">
              <p>
                <strong>Errors:</strong> {health.errorCount}
              </p>

              <p>
                <strong>Warnings:</strong> {health.warningCount}
              </p>

              <p>
                <strong>Information:</strong> {health.infoCount}
              </p>
            </div>

            {health.issues.length === 0 ? (
              <p>
                No issues detected by the current health checks.
              </p>
            ) : (
              <div className="analysis-health-issues">
                {health.issues.map((issue) => (
                  <article
                    key={issue.id}
                    className={`analysis-health-issue ${issue.severity}`}
                  >
                    <strong>
                      {issue.severity.toUpperCase()}
                    </strong>

                    <p>{issue.message}</p>
                  </article>
                ))}
              </div>
            )}
          </div>

          <p className="analysis-disclaimer">
            Candidate paths are graph-based possibilities.
            Passing a simplified simulation does not
            establish complete Yu-Gi-Oh! legality.
          </p>
        </div>
      )}

      {activeTab === "discovery" && (
        <div className="analysis-panel">
          <h3>Combo Discovery</h3>

          <div className="analysis-filters">
            <label>
              Maximum Depth
              <select
                value={maxDepth}
                onChange={(event) =>
                  setMaxDepth(Number(event.target.value))
                }
              >
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
              </select>
            </label>

            <label>
              Starting Card
              <select
                value={starterFilter}
                onChange={(event) =>
                  setStarterFilter(event.target.value)
                }
              >
                <option value="all">All Cards</option>

                {cards.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <p>
            Showing {visibleCandidates.length} of{" "}
            {candidates.length} retained candidate paths.
          </p>

          {draftCombo ? (
            <div className="analysis-draft">
              <h4>Review Discovered Combo</h4>

              <p>
                Replace placeholder actions with the actual
                sequence before saving.
              </p>

              <ComboEditor
                key={draftCombo.id}
                cards={cards}
                editingCombo={draftCombo}
                onSave={(combo) => {
                  if (onSaveCombo(combo)) {
                    setDraftCombo(null);
                    setActiveTab("evaluation");
                  }
                }}
                onCancel={() => setDraftCombo(null)}
              />
            </div>
          ) : visibleCandidates.length === 0 ? (
            <p>
              No candidates found. Record card relationships
              or adjust the discovery filters.
            </p>
          ) : (
            <div className="analysis-result-list">
              {visibleCandidates.map((candidate) => (
                <article
                  key={candidate.id}
                  className="analysis-result-card"
                >
                  <h4>
                    {candidate.cardIds
                      .map(cardName)
                      .join(" → ")}
                  </h4>

                  <p>
                    <strong>Graph score:</strong>{" "}
                    {candidate.score}
                  </p>

                  <p>
                    <strong>Starter copies:</strong>{" "}
                    {candidate.starterCopies}
                  </p>

                  <p>
                    <strong>Opening starter:</strong>{" "}
                    {(
                      candidate.openingProbability * 100
                    ).toFixed(2)}%
                  </p>

                  <ol>
                    {candidate.steps.map((step, index) => (
                      <li key={index}>
                        {cardName(step.sourceCardId)}
                        {" → "}
                        {cardName(step.targetCardId)}
                        {" ("}
                        {step.relationshipTypes.join(", ")}
                        {")"}
                      </li>
                    ))}
                  </ol>

                  <button
                    type="button"
                    disabled={
                      !candidate.availableInMainDeck
                    }
                    onClick={() =>
                      startComboDraft(candidate)
                    }
                  >
                    Create Combo Draft
                  </button>

                  {!candidate.availableInMainDeck && (
                    <p>
                      Starter not available in Main Deck.
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "evaluation" && (
        <div className="analysis-panel">
          <ComboEvaluation
            deck={deck}
            combos={combos}
            cards={cards}
          />
        </div>
      )}

      {activeTab === "recommendations" && (
        <div className="analysis-panel">
          <h3>Deck Recommendations</h3>

          <div className="analysis-filters">
            <label>
              Priority
              <select
                value={priorityFilter}
                onChange={(event) =>
                  setPriorityFilter(
                    event.target.value as
                      RecommendationPriority | "all"
                  )
                }
              >
                <option value="all">All Priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </label>
          </div>

          {visibleRecommendations.length === 0 ? (
            <p>No recommendations match this filter.</p>
          ) : (
            <div className="analysis-result-list">
              {visibleRecommendations.map(
                (recommendation) => (
                  <article
                    key={recommendation.id}
                    className="analysis-result-card"
                  >
                    <h4>{recommendation.title}</h4>

                    <p>
                      <strong>Priority:</strong>{" "}
                      {recommendation.priority}
                      {" · "}
                      <strong>Score:</strong>{" "}
                      {recommendation.score}
                    </p>

                    <p>{recommendation.description}</p>

                    {recommendation.relatedCardIds.length >
                      0 && (
                      <p>
                        <strong>Related cards:</strong>{" "}
                        {recommendation.relatedCardIds
                          .map(cardName)
                          .join(", ")}
                      </p>
                    )}

                    <details>
                      <summary>Supporting Evidence</summary>
                      <ul>
                        {recommendation.evidence.map(
                          (evidence, index) => (
                            <li key={index}>
                              {evidence}
                            </li>
                          )
                        )}
                      </ul>
                    </details>
                  </article>
                )
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
