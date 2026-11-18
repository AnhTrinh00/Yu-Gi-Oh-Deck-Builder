import { useEffect, useState } from "react";

import type { Deck } from "../../models/deck/Deck";
import type { CardEffectDefinition } from "../../models/effect/CardEffect";
import type { ComboDiscoveryEvaluationResult } from "../../services/combo/discovery/comboDiscoveryEvaluationService";

import { cardEffectRegistry } from "../../services/effect/cardEffectRegistryService";
import { createComboExplorerState } from "../../services/combo/discovery/comboExplorerStateService";
import { discoverAndRankCombos } from "../../services/combo/discovery/comboDiscoveryEvaluationService";
import {
  getSavedCardEffects,
  replaceSavedCardEffects,
} from "../../services/persistence/personalDefinitionRepository";
import { enqueuePersonalWrite, waitForPersonalWrites } from "../../services/persistence/personalWriteQueue";
import { parseCardEffects } from "../../services/effect/definition/cardEffectSchemaService";

import { ComboAIAnalysis } from "./ComboAIAnalysis";
import { CardEffectBuilder } from "./CardEffectBuilder";
import { ChainSimulator } from "./ChainSimulator";

interface Props {
  deck: Deck;
}

export default function ComboExplorer({ deck }: Props) {
  const [hand, setHand] = useState<number[]>([]);
  const [maxDepth, setMaxDepth] = useState(3);
  const [maxResults, setMaxResults] = useState(30);

  const [effectJson, setEffectJson] = useState("[]");
  const [builderOpen, setBuilderOpen] = useState(false);
  const [builderInitial, setBuilderInitial] = useState<CardEffectDefinition | null>(null);
  const [editingEffectId, setEditingEffectId] =
    useState<string | null>(null);

  const [registryVersion, setRegistryVersion] = useState(0);

  const [result, setResult] =
    useState<ComboDiscoveryEvaluationResult | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [storageBlocked, setStorageBlocked] = useState(true);
  const [effectsLoaded, setEffectsLoaded] = useState(false);

  useEffect(() => {
    let current = true;
    void waitForPersonalWrites().then(() => getSavedCardEffects()).then(effects => {
      if (!current) return;
      cardEffectRegistry.clear();
      cardEffectRegistry.registerEffects(effects);
      setStorageBlocked(false);
      setEffectsLoaded(true);
      setRegistryVersion(version => version + 1);
    }).catch(cause => {
      if (!current) return;
      setError(cause instanceof Error ? cause.message : "Unable to load saved effects.");
      setStorageBlocked(true);
      setEffectsLoaded(true);
    });
    return () => { current = false; };
  }, []);

  const [running, setRunning] = useState(false);

  // Read the current registry after every registry-version update.
  void registryVersion;

  const registeredEffects =
    cardEffectRegistry.getAllEffects();

  const effectCount = registeredEffects.length;

  const mainCards = deck.main.filter(
    entry => entry.quantity > 0
  );

  const cardNames = new Map(
    [...deck.main, ...deck.extra].map(
      entry => [entry.card.id, entry.card.name]
    )
  );

  function refreshRegistry(): void {
    setRegistryVersion(previous => previous + 1);
    setResult(null);
  }

  function getErrorMessage(
    cause: unknown,
    fallback: string
  ): string {
    return cause instanceof Error
      ? cause.message
      : fallback;
  }

  /*
   * Apply a registry mutation and persist it.
   * If persistence fails, restore the previous registry.
   */
  async function commitRegistryChange(mutation: () => void): Promise<void> {
    await enqueuePersonalWrite(async () => {
      const previous = cardEffectRegistry.getAllEffects();
      try {
        mutation();
        await replaceSavedCardEffects(cardEffectRegistry.getAllEffects());
        refreshRegistry();
        setError(null);
      } catch (cause) {
        cardEffectRegistry.clear();
        cardEffectRegistry.registerEffects(previous);
        refreshRegistry();
        throw cause;
      }
    });
  }

  function addToHand(cardId: number): void {
    const owned =
      mainCards.find(entry => entry.card.id === cardId)
        ?.quantity ?? 0;

    const selected =
      hand.filter(id => id === cardId).length;

    if (selected >= owned || hand.length >= 6) {
      return;
    }

    setHand(previous => [...previous, cardId]);
    setResult(null);
    setError(null);
  }

  function removeFromHand(index: number): void {
    setHand(previous =>
      previous.filter((_, i) => i !== index)
    );

    setResult(null);
    setError(null);
  }

  function resetEffectEditor(): void {
    setEffectJson("[]");
    setEditingEffectId(null);
  }

  /*
   * Register new effects or save an existing effect.
   */
  async function handleSaveEffects(): Promise<void> {
    try {
      if (storageBlocked) {
        setError(
          "Saved effect data could not be loaded. " +
          "Back up or repair the stored data before making changes."
        );
        return;
      }

      const parsed: unknown = JSON.parse(effectJson);
      const effects = parseCardEffects(parsed);

      if (editingEffectId !== null) {
        if (effects.length !== 1) {
          throw new Error(
            "Editing requires exactly one effect definition."
          );
        }

        const updatedEffect = effects[0];

        if (updatedEffect.id !== editingEffectId) {
          throw new Error(
            "Effect ID cannot be changed while editing."
          );
        }

        await commitRegistryChange(() => {
          cardEffectRegistry.replaceEffect(updatedEffect);
        });
      } else {
        if (effects.length === 0) {
          throw new Error(
            "Provide at least one effect definition."
          );
        }

        await commitRegistryChange(() => {
          cardEffectRegistry.registerEffects(effects);
        });
      }

      resetEffectEditor();
    } catch (cause) {
      setError(
        getErrorMessage(
          cause,
          "Unable to save card effects."
        )
      );
    }
  }

  function handleEditEffect(
    effect: CardEffectDefinition
  ): void {
    setEditingEffectId(effect.id);
    setEffectJson(
      JSON.stringify([effect], null, 2)
    );
    setError(null);
  }

  async function handleDeleteEffect(effectId: string): Promise<void> {
    try {
      if (storageBlocked) {
        setError(
          "Saved effect data could not be loaded. " +
          "Back up or repair the stored data before making changes."
        );
        return;
      }
      await commitRegistryChange(() => {
        const removed =
          cardEffectRegistry.removeEffect(effectId);

        if (!removed) {
          throw new Error(
            `Effect "${effectId}" was not found.`
          );
        }
      });

      if (editingEffectId === effectId) {
        resetEffectEditor();
      }
    } catch (cause) {
      setError(
        getErrorMessage(
          cause,
          "Unable to delete card effect."
        )
      );
    }
  }

  async function handleBuilderSave(
    effect: CardEffectDefinition
  ): Promise<void> {
    try {
      if (storageBlocked) {
        throw new Error(
          "Saved effect data could not be loaded. " +
          "Resolve the storage error before editing."
        );
      }

      await commitRegistryChange(() => {
        if (builderInitial) {
          if (effect.id !== builderInitial.id) {
            throw new Error(
              "Effect ID cannot be changed while editing."
            );
          }

          cardEffectRegistry.replaceEffect(effect);
        } else {
          cardEffectRegistry.registerEffect(effect);
        }
      });

      setBuilderOpen(false);
      setBuilderInitial(null);
      setError(null);
    } catch (cause) {
      setError(
        getErrorMessage(
          cause,
          "Unable to save card effect."
        )
      );
    }
  }

  function handleDiscover(): void {
    if (running) return;

    setRunning(true);
    setError(null);
    setResult(null);

    try {
      if (hand.length === 0) {
        throw new Error(
          "Select at least one starting-hand card."
        );
      }

      if (effectCount === 0) {
        throw new Error(
          "Register card effects before discovering combos."
        );
      }

      const initialState = createComboExplorerState(
        deck,
        hand
      );

      const registry = {
        get: (effectId: string) =>
          cardEffectRegistry.getEffect(effectId),

        getAll: () =>
          cardEffectRegistry.getAllEffects(),
      };

      const discovery = discoverAndRankCombos(
        initialState,
        registry,
        [],
        {
          maxDepth,
          maxResults,
          maxNodes: 500,
          maxCandidatesPerNode: 50,
          maxSelectionBranches: 32,
          includeExperimental: false,
        }
      );

      setResult(discovery);
    } catch (cause) {
      setError(
        getErrorMessage(
          cause,
          "Combo discovery failed."
        )
      );
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="combo-explorer">
      <h2>Combo Explorer</h2>
      {!effectsLoaded && <p role="status">Loading saved card effects...</p>}

      <p>
        Explore effect-based combo lines from a selected
        opening hand. Results are experimental and do
        not guarantee official duel legality.
      </p>

      {/* 1. Effect management */}
      <section className="combo-explorer-panel">
        <h3>1. Manage Card Effects</h3>

        <p>
          Registered effects:{" "}
          <strong>{effectCount}</strong>
        </p>

        <p>
          Card effects are manually defined and stored
          locally in your browser. Only manually verified
          effects are used by the default combo search.
        </p>

        <button
          type="button"
          disabled={storageBlocked}
          onClick={() => {
            setBuilderInitial(null);
            setBuilderOpen(true);
          }}
        >
          Create Effect Visually
        </button>

        {builderOpen && (
          <CardEffectBuilder
            key={builderInitial?.id ?? "new-effect"}
            cards={[
              ...new Map(
                [...deck.main, ...deck.extra, ...deck.side].map(
                  entry => [
                    entry.card.id,
                    {
                      id: entry.card.id,
                      name: entry.card.name,
                    },
                  ]
                )
              ).values(),
            ]}
            initialEffect={builderInitial}
            disabled={storageBlocked}
            onSave={handleBuilderSave}
            onCancel={() => {
              setBuilderOpen(false);
              setBuilderInitial(null);
            }}
          />
        )}

        <h4>Registered Effects</h4>

        {registeredEffects.length === 0 ? (
          <p>No card effects registered yet.</p>
        ) : (
          <ul className="combo-effect-list">
            {registeredEffects.map(effect => (
              <li key={effect.id}>
                <div>
                  <strong>{effect.label}</strong>
                  <p>
                    Card:{" "}
                    {cardNames.get(effect.sourceCardId) ??
                      `ID ${effect.sourceCardId}`}
                  </p>
                  <p>
                    Effect ID: {effect.id}
                  </p>
                  <p>
                    Activation zone:{" "}
                    {effect.activationZone}
                  </p>
                  <p>
                    Verification:{" "}
                    {effect.verification}
                  </p>
                </div>

                <div className="combo-effect-actions">
                  <button
                    type="button"
                    onClick={() =>
                      handleEditEffect(effect)
                    }
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleDeleteEffect(effect.id)
                    }
                  >
                    Delete
                  </button>

                  <button
                    type="button"
                    disabled={storageBlocked}
                    onClick={() => {
                      setBuilderInitial(effect);
                      setBuilderOpen(true);
                    }}
                  >
                    Edit Visually
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <h4>
          {editingEffectId
            ? `Edit Effect: ${editingEffectId}`
            : "Register New Effects"}
        </h4>

        <p>
          {editingEffectId
            ? "Modify the selected effect and save your changes. Its ID must remain unchanged."
            : "Paste one or more effect definitions as a JSON array."}
        </p>

        <label htmlFor="combo-effects-json">
          Effect definitions (JSON)
        </label>

        <textarea
          id="combo-effects-json"
          value={effectJson}
          onChange={event =>
            setEffectJson(event.target.value)
          }
          rows={12}
          spellCheck={false}
        />

        <div className="combo-effect-actions">
          <button
            type="button"
            onClick={handleSaveEffects}
          >
            {editingEffectId
              ? "Save Changes"
              : "Register Effects"}
          </button>

          {editingEffectId !== null && (
            <button
              type="button"
              onClick={resetEffectEditor}
            >
              Cancel Editing
            </button>
          )}
        </div>
      </section>

      {/* 2. Starting hand */}
      <section className="combo-explorer-panel">
        <h3>2. Select Starting Hand</h3>

        <label htmlFor="combo-hand-card">
          Add a Main Deck card
        </label>

        <select
          id="combo-hand-card"
          value=""
          onChange={event => {
            if (event.target.value) {
              addToHand(Number(event.target.value));
            }
          }}
          disabled={hand.length >= 6}
        >
          <option value="">Choose a card</option>

          {mainCards.map(entry => {
            const selected = hand.filter(
              id => id === entry.card.id
            ).length;

            return (
              <option
                key={entry.card.id}
                value={entry.card.id}
                disabled={
                  selected >= entry.quantity
                }
              >
                {entry.card.name} (
                {entry.quantity - selected} available)
              </option>
            );
          })}
        </select>

        <p>Selected: {hand.length}/6 cards</p>

        {hand.length === 0 ? (
          <p>No cards selected.</p>
        ) : (
          <ol>
            {hand.map((cardId, index) => (
              <li key={`${cardId}-${index}`}>
                {cardNames.get(cardId) ?? cardId}{" "}

                <button
                  type="button"
                  onClick={() =>
                    removeFromHand(index)
                  }
                  aria-label={`Remove card ${index + 1}`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* 3. Search settings */}
      <section className="combo-explorer-panel">
        <h3>3. Search Settings</h3>

        <label htmlFor="combo-max-depth">
          Maximum combo depth
        </label>

        <select
          id="combo-max-depth"
          value={maxDepth}
          onChange={event => {
            setMaxDepth(Number(event.target.value));
            setResult(null);
          }}
        >
          {[1, 2, 3, 4, 5].map(depth => (
            <option key={depth} value={depth}>
              {depth} actions
            </option>
          ))}
        </select>

        <label htmlFor="combo-max-results">
          Maximum results
        </label>

        <select
          id="combo-max-results"
          value={maxResults}
          onChange={event => {
            setMaxResults(Number(event.target.value));
            setResult(null);
          }}
        >
          {[10, 20, 30, 50, 100].map(count => (
            <option key={count} value={count}>
              {count} results
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={handleDiscover}
          disabled={
            running ||
            hand.length === 0 ||
            effectCount === 0
          }
        >
          {running
            ? "Discovering..."
            : "Discover & Rank Combos"}
        </button>
      </section>

      {error && (
        <p role="alert">{error}</p>
      )}

      {/* 4. Discovery results */}
      {result && (
        <section className="combo-explorer-panel">
          <h3>4. Discovery Results</h3>

          <div className="combo-explorer-stats">
            <p>
              Explored nodes:{" "}
              <strong>
                {result.search.stats.exploredNodes}
              </strong>
            </p>

            <p>
              Discovered combos:{" "}
              <strong>
                {result.search.combos.length}
              </strong>
            </p>

            <p>
              Evaluated combos:{" "}
              <strong>
                {result.ranking.evaluatedCount}
              </strong>
            </p>
          </div>

          {result.ranking.warnings.map(
            (warning, index) => (
              <p
                key={index}
                className="combo-explorer-warning"
              >
                {warning}
              </p>
            )
          )}

          {result.ranking.ranked.length === 0 ? (
            <p>
              No executable combo lines were found
              from this starting hand using the
              registered effects and search limits.
            </p>
          ) : (
            <div className="combo-explorer-results">
              {result.ranking.ranked.map(
                (item, index) => (
                  <article
                    key={item.combo.id}
                    className="combo-explorer-result"
                  >
                    <h4>
                      #{index + 1} — {item.combo.id}
                    </h4>

                    <p>
                      Score:{" "}
                      <strong>
                        {item.score.toFixed(1)}/100
                      </strong>
                    </p>

                    <p>
                      Final hand:{" "}
                      {item.resources.finalHand}
                      {" | "}
                      Final field:{" "}
                      {item.resources.finalField}
                      {" | "}
                      Interactions:{" "}
                      {item.interactions.total}
                    </p>

                    <h5>Action Sequence</h5>
                    <ol>
                      {item.combo.actions.map(
                        (action, actionIndex) => (
                          <li
                            key={`${action.effectId}-${actionIndex}`}
                          >
                            {action.description}
                          </li>
                        )
                      )}
                    </ol>

                    <h5>Strengths</h5>
                    <ul>
                      {item.strengths.map(
                        (value, i) => (
                          <li key={i}>
                            {value}
                          </li>
                        )
                      )}
                    </ul>

                    <h5>Weaknesses</h5>
                    <ul>
                      {item.weaknesses.map(
                        (value, i) => (
                          <li key={i}>
                            {value}
                          </li>
                        )
                      )}
                    </ul>
                  </article>
                )
              )}
            </div>
          )}
        </section>
      )}

      {/* 5. Gemini analysis */}
      {result &&
        result.ranking.ranked.length > 0 && (
          <section className="combo-explorer-panel">
            <h3>5. Gemini Combo Analysis</h3>

            <ComboAIAnalysis
              combos={result.ranking.ranked.slice(0, 10)}
            />
          </section>
        )}

      <section className="combo-explorer-panel">
        <ChainSimulator deck={deck} />
      </section>
    </section>
  );
}
