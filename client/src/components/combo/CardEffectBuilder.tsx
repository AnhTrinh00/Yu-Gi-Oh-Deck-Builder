import { useState } from "react";
import type {
  CardEffectDefinition,
  EffectCondition,
  EffectCost,
  EffectStep,
} from "../../models/CardEffect";
import type { GameZone } from "../../models/GameState";
import {
  CONDITION_TYPES,
  GAME_ZONES,
  STEP_TYPES,
  newCondition,
  newCost,
  newEffect,
  newStep,
  validateBuiltEffect,
} from "../../services/effect/definition/cardEffectBuilderService";
import { EffectTemplateManager } from "./EffectTemplateManager";

interface CardChoice {
  id: number;
  name: string;
}

interface Props {
  cards: CardChoice[];
  initialEffect?: CardEffectDefinition | null;
  onSave: (effect: CardEffectDefinition) => void;
  onCancel: () => void;
  disabled?: boolean;
}

const numberValue = (value: string) => Number(value);

export function CardEffectBuilder({
  cards,
  initialEffect,
  onSave,
  onCancel,
  disabled = false,
}: Props) {
  const [effect, setEffect] = useState<CardEffectDefinition>(
    () =>
      initialEffect
        ? structuredClone(initialEffect)
        : newEffect(cards[0]?.id ?? 1)
  );

  const [error, setError] = useState<string | null>(null);
  const [showJson, setShowJson] = useState(false);

  function edit(patch: Partial<CardEffectDefinition>) {
    setEffect(previous => ({
      ...previous,
      ...patch,
    }));
    setError(null);
  }

  function applyTemplate(
    templateEffect: CardEffectDefinition
  ): void {
    setEffect(previous => ({
      ...structuredClone(templateEffect),

      // Preserve the identity of an existing effect when editing it.
      if: initialEffect
        ? previous.id
        : templateEffect.id,
      
      sourceCardId: previous.sourceCardId,

      // A template never automatically verifies an effect.
      verification: "experimental",
    }));

    setError(null);
  }

  function setCondition(
    index: number,
    value: EffectCondition
  ) {
    edit({
      conditions: effect.conditions.map((item, i) =>
        i === index ? value : item
      ),
    });
  }

  function setCost(index: number, value: EffectCost) {
    edit({
      costs: effect.costs.map((item, i) =>
        i === index ? value : item
      ),
    });
  }

  function setStep(index: number, value: EffectStep) {
    edit({
      steps: effect.steps.map((item, i) =>
        i === index ? value : item
      ),
    });
  }

  function zones(
    value: GameZone,
    onChange: (zone: GameZone) => void
  ) {
    return (
      <select
        value={value}
        onChange={event =>
          onChange(event.target.value as GameZone)
        }
      >
        {GAME_ZONES.map(zone => (
          <option key={zone} value={zone}>
            {zone}
          </option>
        ))}
      </select>
    );
  }

  function cardIdInput(
    value: number,
    onChange: (id: number) => void
  ) {
    return (
      <label>
        Card ID
        <input
          type="number"
          min="1"
          step="1"
          value={value}
          onChange={event =>
            onChange(numberValue(event.target.value))
          }
        />
      </label>
    );
  }

  function save() {
    try {
      const validated = validateBuiltEffect(effect);
      onSave(validated);
      setError(null);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Invalid effect definition."
      );
    }
  }

  return (
    <section
      className="combo-effect-builder"
      aria-label="Card Effect Builder"
    >
      <h4>
        {initialEffect
          ? "Edit effect visually"
          : "Create effect visually"}
      </h4>

      <p>
        Definitions are simplified simulation rules,
        not automatically verified Yu-Gi-Oh! card rulings.
      </p>

      <EffectTemplateManager
        sourceCardId={effect.sourceCardId}
        currentEffect={effect}
        onApply={applyTemplate}
      />

      <div className="combo-builder-fields">
        <label>
          Source card
          <select
            value={effect.sourceCardId}
            onChange={event =>
              edit({
                sourceCardId: numberValue(
                  event.target.value
                ),
              })
            }
          >
            {!cards.some(
              card => card.id === effect.sourceCardId
            ) && (
              <option value={effect.sourceCardId}>
                Card ID {effect.sourceCardId}
              </option>
            )}

            {cards.map(card => (
              <option key={card.id} value={card.id}>
                {card.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Effect ID
          <input
            value={effect.id}
            disabled={Boolean(initialEffect)}
            onChange={event =>
              edit({ id: event.target.value })
            }
          />
        </label>

        <label>
          Effect label
          <input
            value={effect.label}
            onChange={event =>
              edit({ label: event.target.value })
            }
          />
        </label>

        <label>
          Activation zone
          {zones(effect.activationZone, zone =>
            edit({ activationZone: zone })
          )}
        </label>

        <label>
          Verification
          <select
            value={effect.verification}
            onChange={event =>
              edit({
                verification: event.target.value as
                  CardEffectDefinition["verification"],
              })
            }
          >
            <option value="experimental">
              Experimental
            </option>
            <option value="manually-verified">
              Manually verified
            </option>
          </select>
        </label>

        <label>
          Once-per-turn key (optional)
          <input
            value={effect.oncePerTurnKey ?? ""}
            onChange={event =>
              edit({
                oncePerTurnKey:
                  event.target.value || undefined,
              })
            }
          />
        </label>
      </div>

      <h5>Conditions</h5>

      {effect.conditions.map((condition, index) => (
        <div className="combo-builder-row" key={index}>
          <select
            aria-label={`Condition ${index + 1} type`}
            value={condition.type}
            onChange={event =>
              setCondition(
                index,
                newCondition(
                  event.target.value as
                    EffectCondition["type"]
                )
              )
            }
          >
            {CONDITION_TYPES.map(type => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          {condition.type === "source-in-zone" &&
            zones(condition.zone, zone =>
              setCondition(index, {
                ...condition,
                zone,
              })
            )}

          {condition.type === "card-in-zone" && (
            <>
              {cardIdInput(
                condition.cardId,
                cardId =>
                  setCondition(index, {
                    ...condition,
                    cardId,
                  })
              )}

              {zones(condition.zone, zone =>
                setCondition(index, {
                  ...condition,
                  zone,
                })
              )}

              <label>
                Minimum
                <input
                  type="number"
                  min="1"
                  value={condition.minimum ?? 1}
                  onChange={event =>
                    setCondition(index, {
                      ...condition,
                      minimum: numberValue(
                        event.target.value
                      ),
                    })
                  }
                />
              </label>
            </>
          )}

          {condition.type === "effect-unused" && (
            <label>
              Usage key
              <input
                value={condition.usageKey}
                onChange={event =>
                  setCondition(index, {
                    ...condition,
                    usageKey: event.target.value,
                  })
                }
              />
            </label>
          )}

          <button
            type="button"
            onClick={() =>
              edit({
                conditions: effect.conditions.filter(
                  (_, i) => i !== index
                ),
              })
            }
          >
            Remove condition
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() =>
          edit({
            conditions: [
              ...effect.conditions,
              newCondition("source-in-zone"),
            ],
          })
        }
      >
        Add condition
      </button>

      <h5>Costs</h5>

      {effect.costs.map((cost, index) => (
        <div className="combo-builder-row" key={index}>
          <label>
            Cost type
            <select
              aria-label={`Cost ${index + 1} type`}
              value={cost.type}
              onChange={event => {
                if (
                  event.target.value ===
                  "detach-xyz-material"
                ) {
                  setCost(index, {
                    type: "detach-xyz-material",
                    xyzInstanceId: "",
                    count: 1,
                  });
                } else {
                  setCost(index, newCost());
                }
              }}
            >
              <option value="move-card">
                Move card
              </option>
              <option value="detach-xyz-material">
                Detach Xyz Material
              </option>
            </select>
          </label>

          {cost.type === "move-card" ? (
            <>
              {cardIdInput(cost.cardId, cardId =>
                setCost(index, {
                  ...cost,
                  cardId,
                })
              )}

              <label>
                From
                {zones(cost.from, from =>
                  setCost(index, {
                    ...cost,
                    from,
                  })
                )}
              </label>

              <label>
                To
                {zones(cost.to, to =>
                  setCost(index, {
                    ...cost,
                    to,
                  })
                )}
              </label>
            </>
          ) : (
            <>
              <p>
                The activating Xyz Monster will be selected
                when the effect is activated.
              </p>

              <label>
                Materials to detach
                <input
                  type="number"
                  value={cost.count}
                  disabled
                  readOnly
                />
              </label>
            </>
          )}

          <button
            type="button"
            onClick={() =>
              edit({
                costs: effect.costs.filter(
                  (_, i) => i !== index
                ),
              })
            }
          >
            Remove cost
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() =>
          edit({
            costs: [...effect.costs, newCost()],
          })
        }
      >
        Add cost
      </button>

      <h5>Operations</h5>

      {effect.steps.map((step, index) => (
        <div className="combo-builder-row" key={index}>
          <select
            aria-label={`Operation ${index + 1} type`}
            value={step.type}
            onChange={event =>
              setStep(
                index,
                newStep(
                  event.target.value as EffectStep["type"]
                )
              )
            }
          >
            {STEP_TYPES.map(type => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          {step.type === "draw" && (
            <label>
              Count
              <input
                type="number"
                min="1"
                max="60"
                value={step.count}
                onChange={event =>
                  setStep(index, {
                    ...step,
                    count: numberValue(
                      event.target.value
                    ),
                  })
                }
              />
            </label>
          )}

          {step.type !== "draw" &&
            cardIdInput(step.cardId, cardId =>
              setStep(index, {
                ...step,
                cardId,
              })
            )}

          {(step.type === "move" ||
            step.type === "special-summon") && (
            <label>
              From
              {zones(step.from, from =>
                setStep(index, {
                  ...step,
                  from,
                })
              )}
            </label>
          )}

          {step.type === "move" && (
            <label>
              To
              {zones(step.to, to =>
                setStep(index, {
                  ...step,
                  to,
                })
              )}
            </label>
          )}

          <button
            type="button"
            onClick={() =>
              edit({
                steps: effect.steps.filter(
                  (_, i) => i !== index
                ),
              })
            }
          >
            Remove operation
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() =>
          edit({
            steps: [...effect.steps, newStep("draw")],
          })
        }
      >
        Add operation
      </button>

      <div className="combo-effect-actions">
        <button
          type="button"
          onClick={() =>
            setShowJson(value => !value)
          }
        >
          {showJson ? "Hide JSON" : "Preview JSON"}
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={save}
        >
          {initialEffect
            ? "Save visual changes"
            : "Save new effect"}
        </button>

        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>

      {showJson && (
        <pre className="combo-builder-preview">
          {JSON.stringify(effect, null, 2)}
        </pre>
      )}

      {error && <p role="alert">{error}</p>}
    </section>
  );
}