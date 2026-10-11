import { useState } from "react";

import type { Deck } from "../../models/Deck";
import type { EffectChainState } from "../../models/EffectChain";
import type { ChainResolutionEntry } from "../../models/EffectChain";

import {
  createComboExplorerState,
} from "../../services/comboExplorerStateService";

import {
  cardEffectRegistry,
} from "../../services/cardEffectRegistryService";

import {
  activateChainEffect,
  createEffectChain,
  negateChainLink,
  resolveEffectChain,
} from "../../services/effectChainService";

import type { EffectExecutionSelections } from "../../models/EffectExecutionSelection";
import { ChainSelectionEditor } from "./ChainSelectionEditor";

interface Props {
  deck: Deck;
}

export function ChainSimulator({ deck }: Props) {
  const [hand, setHand] = useState<number[]>([]);
  const [chain, setChain] =
    useState<EffectChainState | null>(null);

  const [selectedEffectId, setSelectedEffectId] =
    useState("");

  const [entries, setEntries] =
    useState<ChainResolutionEntry[]>([]);

  const [error, setError] = useState<string | null>(
    null
  );

  const [configuringEffectId, setConfiguringEffectId] =
    useState<string | null>(null);

  const effects = cardEffectRegistry.getAllEffects();

  const cards = deck.main.flatMap(entry =>
    Array.from(
      { length: entry.quantity },
      () => entry.card
    )
  );

  function toggleHandCard(
    cardId: number,
    index: number
  ) {
    if (chain) return;

    setHand(previous => {
      const copy = [...previous];

      // Represent a physical opening-hand choice
      // using the card's index in the expanded deck.
      const selected = copy[index];

      if (selected === cardId) {
        delete copy[index];
      } else {
        copy[index] = cardId;
      }

      return copy;
    });
  }

  function startSimulation() {
    try {
      const selectedHand = hand.filter(
        (id): id is number =>
          Number.isSafeInteger(id) && id > 0
      );

      const state = createComboExplorerState(
        deck,
        selectedHand
      );

      setChain(createEffectChain(state));
      setEntries([]);
      setError(null);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not initialize simulation."
      );
    }
  }

  function activateEffect() {
    if (!chain) return;

    const effect = effects.find(
      item => item.id === selectedEffectId
    );

    if (!effect) {
      setError("Select a registered effect.");
      return;
    }

    setConfiguringEffectId(effect.id);
    setError(null);
  }

  function confirmActivation(
    selections: EffectExecutionSelections
  ) {
    if (!chain || !configuringEffectId) return;

    const effect = effects.find(
        item => item.id === configuringEffectId
    );

    if (!effect) {
        setError("Selected effect no longer exist.");
        setConfiguringEffectId(null);
        return;
    }

    const result = activateChainEffect(
        chain, effect, selections
    );

    if (!result.success) {
        setError(result.errors.join(" "));
        return;
    }

    setChain(result.chain);
    setEntries([]);
    setConfiguringEffectId(null);
    setError(null);
  }

  function negate(linkId: string) {
    if (!chain) return;

    const result = negateChainLink(
      chain,
      linkId
    );

    if (!result.success) {
      setError(result.errors.join(" "));
      return;
    }

    setChain(result.chain);
    setError(null);
  }

  function resolve() {
    if (!chain || chain.links.length === 0) {
      return;
    }

    const result = resolveEffectChain(chain);

    setChain(result.chain);
    setEntries(result.entries);

    setError(
      result.errors.length > 0
        ? result.errors.join(" ")
        : null
    );
  }

  function reset() {
    setConfiguringEffectId(null);
    setChain(null);
    setHand([]);
    setEntries([]);
    setError(null);
  }

  return (
    <section className="combo-chain-simulator">
      <h3>Chain Simulator</h3>

      <p>
        Test registered effects with activation
        costs, chain links, negation, and
        reverse-order resolution.
      </p>

      {!chain && (
        <>
          <h4>Select Starting Hand</h4>

          <p>
            Select up to six physical cards from
            the Main Deck.
          </p>

          <div className="combo-chain-hand">
            {cards.map((card, index) => {
              const selected =
                hand[index] === card.id;

              const count = hand.filter(
                (id): id is number =>
                  Number.isSafeInteger(id) &&
                  id > 0
              ).length;

              return (
                <button
                  type="button"
                  key={`${card.id}-${index}`}
                  disabled={
                    !selected && count >= 6
                  }
                  className={
                    selected
                      ? "combo-chain-selected"
                      : ""
                  }
                  onClick={() =>
                    toggleHandCard(
                      card.id,
                      index
                    )
                  }
                >
                  {card.name}
                  {selected ? " ✓" : ""}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={startSimulation}
          >
            Start Chain Simulation
          </button>
        </>
      )}

      {chain && (
        <>
          <h4>Game State</h4>

          <div className="combo-chain-zones">
            {Object.entries(
              chain.gameState.zones
            ).map(([zone, cardIds]) => (
              <div key={zone}>
                <strong>{zone}</strong>
                <span>
                  {cardIds.length} cards
                </span>
                <small>
                  {cardIds.join(", ") || "Empty"}
                </small>
              </div>
            ))}
          </div>

          <h4>Activate an Effect</h4>

          <div className="combo-builder-row">
            <select
              aria-label="Effect to activate"
              value={selectedEffectId}
              onChange={event =>
                setSelectedEffectId(
                  event.target.value
                )
              }
            >
              <option value="">
                Select effect
              </option>

              {effects.map(effect => (
                <option
                  key={effect.id}
                  value={effect.id}
                >
                  {effect.label} ({effect.id})
                </option>
              ))}
            </select>

            <button
              type="button"
              disabled={!selectedEffectId}
              onClick={activateEffect}
            >
              Activate
            </button>

            {configuringEffectId && (
                <ChainSelectionEditor
                    key={configuringEffectId}
                    gameState={chain.gameState}
                    effect={
                        effects.find(
                            item => item.id === configuringEffectId
                        )!
                    }
                    onActivate={confirmActivation}
                    onCancel={() => {
                        setConfiguringEffectId(null);
                        setError(null);
                    }}
                />
            )}
          </div>

          <h4>
            Pending Chain ({chain.links.length})
          </h4>

          {chain.links.length === 0 ? (
            <p>No pending chain links.</p>
          ) : (
            <ol className="combo-chain-links">
              {chain.links.map(link => (
                <li key={link.chainLinkId}>
                  <strong>
                    {link.chainLinkId}
                  </strong>

                  <span>
                    {link.effect.label}
                  </span>

                  {link.negated ? (
                    <span>Negated</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        negate(
                          link.chainLinkId
                        )
                      }
                    >
                      Mark Negated
                    </button>
                  )}
                </li>
              ))}
            </ol>
          )}

          <div className="combo-effect-actions">
            <button
              type="button"
              disabled={
                chain.links.length === 0
              }
              onClick={resolve}
            >
              Resolve Chain
            </button>

            <button
              type="button"
              onClick={reset}
            >
              Reset Simulation
            </button>
          </div>

          {entries.length > 0 && (
            <>
              <h4>Resolution Results</h4>

              <ol>
                {entries.map(entry => (
                  <li key={entry.chainLinkId}>
                    {entry.effectId}:
                    {" "}
                    {entry.status}
                    {" "}
                    ({entry.completedSteps}
                    {" "}
                    steps completed)
                    {entry.skippedSteps &&
                      entry.skippedSteps.length > 0 && (
                        <span>
                          {" - "}
                          Skipped invalid targets at steps:
                          {" "}
                          {entry.skippedSteps
                            .map(index => index + 1)
                            .join(", ")}
                        </span>
                      )}
                    {entry.error &&
                      ` — ${entry.error}`}
                  </li>
                ))}
              </ol>
            </>
          )}
        </>
      )}

      {error && (
        <p role="alert">
          {error}
        </p>
      )}
    </section>
  );
}