
import { useMemo, useState } from "react";

import type { Card } from "../models/Card";
import type { Deck } from "../models/Deck";
import type { CardRelationship } from "../models/CardRelationship";

import { discoverComboCandidates } from "../services/comboDiscoveryService";
import { analyzeComboCandidates } from "../services/comboCandidateAnalysisService";

interface Props {
  deck: Deck;
  cards: Card[];
  relationships: CardRelationship[];
}

export default function ComboDiscovery({
  deck,
  cards,
  relationships,
}: Props) {
  const [maxDepth, setMaxDepth] = useState(3);
  const [maxCandidates, setMaxCandidates] = useState(20);
  const [starterFilter, setStarterFilter] = useState("all");

  const cardNames = useMemo(
    () => new Map(cards.map((card) => [card.id, card.name])),
    [cards]
  );

  const cardIds = useMemo(
    () => cards.map((card) => card.id),
    [cards]
  );

  const candidates = useMemo(() => {
    const discovered = discoverComboCandidates(
      cardIds,
      relationships,
      {
        maxDepth,
        maxCandidates: 1000,
        minDepth: 1,
      }
    );

    return analyzeComboCandidates(discovered, deck);
  }, [cardIds, relationships, deck, maxDepth]);

  const visibleCandidates = candidates
    .filter(
      (candidate) =>
        starterFilter === "all" ||
        candidate.starterCardId === Number(starterFilter)
    )
    .slice(0, maxCandidates);

  function cardName(id: number): string {
    return cardNames.get(id) ?? `Card ${id}`;
  }

  return (
    <section className="combo-discovery">
      <h2>Automatic Combo Discovery</h2>

      <p>
        Explore possible interaction sequences using recorded
        card relationships. Results are candidates, not
        verified legal combos.
      </p>

      <div className="combo-discovery-controls">
        <label>
          Maximum Path Depth
          <select
            value={maxDepth}
            onChange={(event) =>
              setMaxDepth(Number(event.target.value))
            }
          >
            <option value={2}>2 relationships</option>
            <option value={3}>3 relationships</option>
            <option value={4}>4 relationships</option>
          </select>
        </label>

        <label>
          Maximum Results
          <select
            value={maxCandidates}
            onChange={(event) =>
              setMaxCandidates(Number(event.target.value))
            }
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
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
        Found {visibleCandidates.length} candidate path(s)
        in the current results.
      </p>

      {visibleCandidates.length === 0 ? (
        <p>
          No candidates found. Add more recorded card
          relationships or change the filters.
        </p>
      ) : (
        <div className="combo-candidate-list">
          {visibleCandidates.map((candidate) => (
            <article
              key={candidate.id}
              className="combo-candidate-card"
            >
              <h3>
                {cardName(candidate.starterCardId)}
                {" → "}
                {cardName(candidate.targetCardId)}
              </h3>

              <p>
                <strong>Graph score:</strong>{" "}
                {candidate.score}
              </p>

              <p>
                <strong>Starter copies:</strong>{" "}
                {candidate.starterCopies}
              </p>

              <p>
                <strong>Opening starter probability:</strong>{" "}
                {(candidate.openingProbability * 100).toFixed(2)}%
              </p>

              {!candidate.availableInMainDeck && (
                <p className="combo-candidate-warning">
                  This starting card is not in the Main Deck.
                </p>
              )}

              <h4>Candidate Sequence</h4>

              <ol>
                {candidate.steps.map((step, index) => (
                  <li key={`${candidate.id}-${index}`}>
                    <strong>
                      {cardName(step.sourceCardId)}
                    </strong>
                    {" — "}
                    {step.relationshipTypes.join(" / ")}
                    {" → "}
                    <strong>
                      {cardName(step.targetCardId)}
                    </strong>
                  </li>
                ))}
              </ol>

              <p>
                <strong>Potential destination:</strong>{" "}
                {cardName(candidate.targetCardId)}
              </p>

              <p className="combo-candidate-note">
                This sequence requires gameplay validation
                before it can be considered a legal combo.
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
