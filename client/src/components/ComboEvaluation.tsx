
import { useMemo, useState } from "react";

import type { Combo } from "../models/Combo";
import type { Deck } from "../models/Deck";
import type { Card } from "../models/Card";
import type { GameZone } from "../models/GameState";

import { simulateCombo } from "../services/comboSimulationService";

interface Props {
  deck: Deck;
  combos: Combo[];
  cards: Card[];
}

const displayZones: GameZone[] = [
  "hand",
  "field",
  "graveyard",
  "banished",
  "deck",
  "extra",
];

export default function ComboEvaluation({
  deck,
  combos,
  cards,
}: Props) {
  const [selectedComboId, setSelectedComboId] =
    useState("");

  const selectedCombo = combos.find(
    (combo) => combo.id === selectedComboId
  );

  const cardNames = useMemo(
    () => new Map(cards.map((card) => [card.id, card.name])),
    [cards]
  );

  const result = useMemo(
    () =>
      selectedCombo
        ? simulateCombo(selectedCombo, deck)
        : null,
    [selectedCombo, deck]
  );

  function cardName(id: number): string {
    return cardNames.get(id) ?? `Card ${id}`;
  }

  return (
    <section className="combo-evaluation">
      <h2>Combo Evaluation</h2>

      <p>
        Simulate recorded combo steps using a simplified
        game-state model.
      </p>

      <label>
        Select Combo
        <select
          value={selectedComboId}
          onChange={(event) =>
            setSelectedComboId(event.target.value)
          }
        >
          <option value="">Choose a saved combo</option>

          {combos.map((combo) => (
            <option key={combo.id} value={combo.id}>
              {combo.name}
            </option>
          ))}
        </select>
      </label>

      {result && (
        <div className="combo-evaluation-results">
          <h3>
            {result.success
              ? "Simulation Completed"
              : "Simulation Failed"}
          </h3>

          <p>
            <strong>Steps completed:</strong>{" "}
            {result.completedSteps} / {result.totalSteps}
          </p>

          {result.errors.length > 0 && (
            <>
              <h4>Errors</h4>
              <ul className="combo-errors">
                {result.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </>
          )}

          {result.warnings.length > 0 && (
            <>
              <h4>Warnings</h4>
              <ul className="combo-warnings">
                {result.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </>
          )}

          <h4>Executed Actions</h4>

          {result.finalState.actionHistory.length === 0 ? (
            <p>No actions were executed.</p>
          ) : (
            <ol>
              {result.finalState.actionHistory.map(
                (action) => (
                  <li key={action.id}>
                    <strong>{cardName(action.cardId)}</strong>
                    {" — "}{action.type}
                    {action.description
                      ? `: ${action.description}`
                      : ""}
                  </li>
                )
              )}
            </ol>
          )}

          <h4>Final Game State</h4>

          <div className="game-state-grid">
            {displayZones.map((zone) => {
              const cardIds = result.finalState.zones[zone];

              const counts = new Map<number, number>();

              for (const id of cardIds) {
                counts.set(
                  id,
                  (counts.get(id) ?? 0) + 1
                );
              }

              return (
                <div key={zone} className="game-zone">
                  <h5>
                    {zone.toUpperCase()} ({cardIds.length})
                  </h5>

                  {counts.size === 0 ? (
                    <p>Empty</p>
                  ) : (
                    <ul>
                      {[...counts].map(([id, quantity]) => (
                        <li key={id}>
                          {cardName(id)} ×{quantity}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>

          <p>
            <strong>Normal Summon used:</strong>{" "}
            {result.finalState.normalSummonUsed
              ? "Yes"
              : "No"}
          </p>

          <p>
            <strong>Tracked effects used:</strong>{" "}
            {result.finalState.usedEffects.length}
          </p>
        </div>
      )}
    </section>
  );
}
