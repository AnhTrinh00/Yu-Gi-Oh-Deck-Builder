import { useState } from "react";

import type {
  CardEffectDefinition,
} from "../../models/CardEffect";

import type {
  EffectExecutionSelections,
} from "../../models/EffectExecutionSelection";

import type {
  GameState,
} from "../../models/GameState";

import {
  createChainSelections,
  getChainSelectionRequirements,
} from "../../services/chainSelectionService";

interface Props {
  gameState: GameState;
  effect: CardEffectDefinition;
  onActivate: (
    selections: EffectExecutionSelections
  ) => void;
  onCancel: () => void;
}

export function ChainSelectionEditor({
  gameState,
  effect,
  onActivate,
  onCancel,
}: Props) {
  const [selected, setSelected] = useState<
    Record<string, string>
  >({});

  const [error, setError] = useState<string | null>(
    null
  );

  const requirements = getChainSelectionRequirements(
    gameState,
    effect
  );

  function activate() {
    try {
      for (const requirement of requirements) {
        if (requirement.kind !== "target") {
          continue;
        }

        const key = 
          `${requirement.category}-${requirement.stepIndex}`;

        if (!selected[key]) {
          throw new Error(
            `You must select a target for ${requirement.label}.`
          );
        }
      }

      const selections = createChainSelections(
        requirements,
        selected
      );

      onActivate(selections);
      setError(null);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Invalid card selection."
      );
    }
  }

  return (
    <section className="combo-chain-selection-editor">
      <h4>Configure Effect Selections</h4>

      <p>
        {effect.label}
      </p>

      <p>
        Targeting operations require a physical card
        selection at activation. Other operations may
        use automatic selection during resolution.
      </p>

      {requirements.length === 0 && (
        <p>
          This effect has no selectable card operations.
        </p>
      )}

      {requirements.map(requirement => {
        const key =
          `${requirement.category}-${requirement.stepIndex}`;

        return (
          <div
            key={key}
            className="combo-chain-selection-row"
          >
            <label>
              <strong>{requirement.label}</strong>

              <span>
                Card ID: {requirement.cardId}
                {" · "}
                Zone: {requirement.zone}
              </span>

              <select
                value={selected[key] ?? ""}
                onChange={event => {
                  setSelected(previous => ({
                    ...previous,
                    [key]: event.target.value,
                  }));
                }}
              >
                <option value="">
                  {requirement.kind === "target"
                    ? "Select required target"
                    : "Automatic"}
                </option>

                {requirement.options.map(option => (
                  <option
                    key={option.instanceId}
                    value={option.instanceId}
                  >
                    {option.instanceId}
                    {" — "}
                    {option.zone}
                  </option>
                ))}
              </select>
            </label>

            {requirement.kind === "target" && (
              <small>
                Target locked at activation
              </small>
            )}

            {requirement.options.length === 0 && (
              <small>
                No matching instance is currently
                available. The operation may fail,
                or an earlier chain link may make
                the card available before resolution.
              </small>
            )}
          </div>
        );
      })}

      <div className="combo-effect-actions">
        <button type="button" onClick={activate}>
          Confirm Activation
        </button>

        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>

      {error && <p role="alert">{error}</p>}
    </section>
  );
}