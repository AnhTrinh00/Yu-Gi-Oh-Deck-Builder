import { useState } from "react";

import type { Deck } from "../../models/deck/Deck";
import type { EffectChainState } from "../../models/effect/EffectChain";
import type { ChainResolutionEntry } from "../../models/effect/EffectChain";

import {
  createComboExplorerState,
} from "../../services/combo/discovery/comboExplorerStateService";

import {
  cardEffectRegistry,
} from "../../services/effect/cardEffectRegistryService";

import {
  activateChainEffectForInstance,
  createEffectChain,
  negateChainLink,
  resolveEffectChain,
} from "../../services/effect/effectChainService";

import type { EffectExecutionSelections } from "../../models/effect/EffectExecutionSelection";
import { ChainSelectionEditor } from "./ChainSelectionEditor";

import type {
  CardEffectDefinition,
} from "../../models/effect/CardEffect";

import {
  bindCardEffectSource,
} from "../../services/effect/definition/cardEffectSourceBindingService";

import {
  placeCardOnField,
} from "../../services/simulation/field/fieldZoneService";

import {
  normalizeGameState,
} from "../../services/simulation/extendedGameStateService";

import {
  validateCardInstanceSync,
} from "../../services/simulation/cardInstanceService";

import {
  isFieldSynchronized,
} from "../../services/simulation/field/fieldZoneService";

import {
  executeChainXyzSummon,
} from "../../services/simulation/summon/chainXyzSummonService";

import {
  getAttachedXyzMaterials,
} from "../../services/simulation/summon/xyzMaterialService";

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

  const [configuringEffect, setConfiguringEffect] =
    useState<CardEffectDefinition | null>(null);

  const [selectedSourceInstanceId, setSelectedSourceInstanceId] =
    useState("");

  const [selectedXyzInstanceId, setSelectedXyzInstanceId] =
    useState("");

  const [selectedMaterialIds, setSelectedMaterialIds] =
    useState<string[]>([]);

  const effects = cardEffectRegistry.getAllEffects();

  const selectedEffect = effects.find(
    effect => effect.id === selectedEffectId
  );

  const availableSourceInstances =
    chain?.gameState.cardInstances?.instances.filter(
      instance =>
        selectedEffect !== undefined &&
        instance.cardId === selectedEffect.sourceCardId &&
        instance.zone === selectedEffect.activationZone
    ) ?? [];

  const cards = deck.main.flatMap(entry =>
    Array.from(
      { length: entry.quantity },
      () => entry.card
    )
  );

  const allCards = [
    ...deck.main,
    ...deck.extra,
    ...deck.side,
  ].map(entry => entry.card);

  const xyzInstances =
    chain?.gameState.cardInstances?.instances.filter(
      instance => {
        const card = allCards.find(
          item => item.id === instance.cardId
        );

        return (
          instance.zone === "extra" &&
          card?.frameType.toLowerCase() === "xyz"
        );
      }
    ) ?? [];

  const fieldMonsterInstances =
    chain?.gameState.cardInstances?.instances.filter(
      instance =>
        instance.zone === "field" &&
        chain.gameState.fieldState?.monsterZones.some(
          slot =>
            slot?.instanceId === instance.instanceId
        )
    ) ?? [];

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

  function placeMonsterFromHand(instanceId: string) {
    if (!chain) return;

    if (chain.links.length > 0) {
      setError(
        "Resolve the pending chain before changing the field."
      );
      return;
    }

    const state = chain.gameState;

    const instance = state.cardInstances?.instances.find(
      item => item.instanceId === instanceId
    );

    if (!instance || instance.zone !== "hand") {
      setError("Selected card is not in the hand.");
      return;
    }

    const zoneIndex =
      state.fieldState?.monsterZones.findIndex(
        slot => slot === null
      ) ?? -1;

    if (zoneIndex < 0) {
      setError("No empty Monster Zone is available.");
      return;
    }

    const result = placeCardOnField(state, {
      cardId: instance.cardId,
      instanceId,
      from: "hand",
      zoneType: "monster",
      zoneIndex,
      position: "face-up-attack",
    });

    if (!result.success) {
      setError(
        result.error ?? "Could not place monster."
      );
      return;
    }

    // Keep physical instance tracking synchronized.
    const updated = normalizeGameState(result.state);

    const tracked = updated.cardInstances?.instances.find(
      item => item.instanceId === instanceId
    );

    if (!tracked) {
      setError("Placed card instance was not found.");
      return;
    }

    tracked.zone = "field";

    const errors = validateCardInstanceSync(updated);

    if (
      errors.length > 0 ||
      !isFieldSynchronized(updated)
    ) {
      setError(
        errors.join(" ") ||
        "Field synchronization failed."
      );
      return;
    }

    setChain({
      ...chain,
      gameState: updated,
    });

    setConfiguringEffect(null);
    setEntries([]);
    setError(null);
  }

  function toggleXyzMaterial(instanceId: string) {
    setSelectedMaterialIds(previous =>
      previous.includes(instanceId)
        ? previous.filter(id => id !== instanceId)
        : [...previous, instanceId]
    );
  }

  function summonSelectedXyz() {
    if (!chain) return;

    if (chain.links.length > 0) {
      setError(
        "Resolve the pending chain before summoning."
      );
      return;
    }

    if (!selectedXyzInstanceId) {
      setError("Select an Xyz Monster.");
      return;
    }

    const result = executeChainXyzSummon(
      chain.gameState,
      allCards,
      {
        monsterInstanceId: selectedXyzInstanceId,
        materialInstanceIds: selectedMaterialIds,
      }
    );

    if (!result.success) {
      setError(result.error ?? "Xyz Summon failed.");
      return;
    }

    setChain({
      ...chain,
      gameState: result.state,
    });

    setSelectedXyzInstanceId("");
    setSelectedMaterialIds([]);
    setConfiguringEffect(null);
    setSelectedSourceInstanceId("");
    setEntries([]);
    setError(null);
  }

  function activateEffect() {
    if (!chain) return;

    if (!selectedEffect) {
      setError("Select a registered effect.");
      return;
    }

    if (!selectedSourceInstanceId) {
      setError("Select the physical card activating this effect.");
      return;
    }

    const binding = bindCardEffectSource(
      chain.gameState,
      selectedEffect,
      selectedSourceInstanceId
    );

    if (!binding.success || !binding.effect) {
      setError(
        binding.error ?? "Could not bind effect source."
      );
      return;
    }

    setConfiguringEffect(binding.effect);
    setError(null);
  }

  function confirmActivation(
    selections: EffectExecutionSelections
  ) {
    if (
      !chain ||
      !configuringEffect ||
      !selectedSourceInstanceId
    ) {
      return;
    }

    const result = activateChainEffectForInstance(
      chain,
      configuringEffect,
      selectedSourceInstanceId,
      selections
    );

    if (!result.success) {
      setError(result.errors.join(" "));
      return;
    }

    setChain(result.chain);
    setEntries([]);
    setConfiguringEffect(null);
    setSelectedSourceInstanceId("");
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
    setConfiguringEffect(null);
    setSelectedSourceInstanceId("");
    setSelectedXyzInstanceId("");
    setSelectedMaterialIds([]);
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

          <h4>Field Setup</h4>

          <p>
            Place monsters from your hand into empty Monster Zones
            to prepare for Extra Deck Summons.
          </p>

          <div className="combo-chain-field-setup">
            <h5>Monsters in Hand</h5>

            {chain.gameState.cardInstances?.instances
              .filter(instance => instance.zone === "hand")
              .map(instance => {
                const card = cards.find(
                  item => item.id === instance.cardId
                );

                const isMonster = card?.type.includes("Monster") ?? false;

                if (!isMonster) return null;

                return (
                  <button
                    key={instance.instanceId}
                    type="button"
                    disabled={chain.links.length > 0}
                    onClick={() =>
                      placeMonsterFromHand(instance.instanceId)
                    }
                  >
                    Place {card?.name ?? `Card ${instance.cardId}`}
                    {" "}
                    ({instance.instanceId})
                  </button>
                );
              })}

            <h5>Monster Zones</h5>

            <div className="combo-chain-monster-zones">
              {chain.gameState.fieldState?.monsterZones.map(
                (slot, index) => (
                  <div key={index}>
                    <strong>Zone {index + 1}</strong>
                    <span>
                      {slot
                        ? `Card ${slot.cardId} (${slot.instanceId})`
                        : "Empty"}
                    </span>
                  </div>
                )
              )}
            </div>
          </div>

          <h4>Xyz Summon</h4>

          <p>
            Select an Xyz Monster from the Extra Deck and
            choose its materials from your field.
          </p>

          <div className="combo-chain-xyz-summon">
            <label>
              Xyz Monster
              <select
                aria-label="Xyz Monster"
                value={selectedXyzInstanceId}
                onChange={event => {
                  setSelectedXyzInstanceId(event.target.value);
                  setSelectedMaterialIds([]);
                  setError(null);
                }}
                disabled={chain.links.length > 0}
              >
                <option value="">Select Xyz Monster</option>

                {xyzInstances.map(instance => {
                  const card = allCards.find(
                    item => item.id === instance.cardId
                  );

                  return (
                    <option
                      key={instance.instanceId}
                      value={instance.instanceId}
                    >
                      {card?.name ?? `Card ${instance.cardId}`}
                      {" "}
                      (Rank {card?.level ?? "?"})
                    </option>
                  );
                })}
              </select>
            </label>

            <h5>Available Materials</h5>

            <div className="combo-chain-xyz-materials">
              {fieldMonsterInstances.map(instance => {
                const card = allCards.find(
                  item => item.id === instance.cardId
                );

                const selected =
                  selectedMaterialIds.includes(instance.instanceId);

                return (
                  <label key={instance.instanceId}>
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={chain.links.length > 0}
                      onChange={() =>
                        toggleXyzMaterial(instance.instanceId)
                      }
                    />

                    {card?.name ?? `Card ${instance.cardId}`}
                    {" "}
                    (Level {card?.level ?? "?"})
                  </label>
                );
              })}
            </div>

            <button
              type="button"
              disabled={
                chain.links.length > 0 ||
                !selectedXyzInstanceId ||
                selectedMaterialIds.length < 2
              }
              onClick={summonSelectedXyz}
            >
              Xyz Summon
            </button>
          </div>

          <h4>Attached Xyz Materials</h4>

          <div className="combo-chain-xyz-attachments">
            {chain.gameState.xyzMaterials?.length ? (
              chain.gameState.xyzMaterials.map(attachment => (
                <div key={attachment.xyzInstanceId}>
                  <strong>
                    Xyz Monster: {attachment.xyzInstanceId}
                  </strong>

                  <p>
                    Materials:{" "}
                    {getAttachedXyzMaterials(
                      chain.gameState,
                      attachment.xyzInstanceId
                    ).join(", ") || "None"}
                  </p>
                </div>
              ))
            ) : (
              <p>No Xyz Materials are currently attached.</p>
            )}
          </div>

          <h4>Activate an Effect</h4>

          <div className="combo-builder-row">
            <label>
              Effect
              <select
                aria-label="Effect to activate"
                value={selectedEffectId}
                onChange={event => {
                  setSelectedEffectId(event.target.value);
                  setSelectedSourceInstanceId("");
                  setConfiguringEffect(null);
                  setError(null);
                }}
              >
                <option value="">Select effect</option>

                {effects.map(effect => (
                  <option key={effect.id} value={effect.id}>
                    {effect.label} ({effect.id})
                  </option>
                ))}
              </select>
            </label>

            <label>
              Activating card instance
              <select
                aria-label="Activating card instance"
                value={selectedSourceInstanceId}
                onChange={event => {
                  setSelectedSourceInstanceId(event.target.value);
                  setConfiguringEffect(null);
                  setError(null);
                }}
                disabled={!selectedEffect}
              >
                <option value="">Select source instance</option>

                {availableSourceInstances.map(instance => (
                  <option
                    key={instance.instanceId}
                    value={instance.instanceId}
                  >
                    {instance.instanceId} — Card {instance.cardId}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              disabled={
                !selectedEffectId ||
                !selectedSourceInstanceId
              }
              onClick={activateEffect}
            >
              Activate
            </button>
          </div>

          {selectedEffect && availableSourceInstances.length === 0 && (
            <p>
              No eligible physical copy of this card is currently
              in its activation zone.
            </p>
          )}

          {configuringEffect && (
            <ChainSelectionEditor
              key={`${configuringEffect.id}-${selectedSourceInstanceId}`}
              gameState={chain.gameState}
              effect={configuringEffect}
              onActivate={confirmActivation}
              onCancel={() => {
                setConfiguringEffect(null);
                setError(null);
              }}
            />
          )}

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