import { useState } from "react";
import type { FormEvent } from "react";

import type { UseDeckWorkspaceResult } from "../../hooks/useDeckWorkspace";
import type { StoredDeck } from "../../models/persistence/StoredRecords";

import "./DeckWorkspaceManager.css";

interface DeckWorkspaceManagerProps {
  manager: UseDeckWorkspaceResult;
}

function getSectionCount(
  cards: StoredDeck["main"],
): number {
  return cards.reduce(
    (total, entry) => total + entry.quantity,
    0,
  );
}

export function DeckWorkspaceManager({
  manager,
}: DeckWorkspaceManagerProps) {
  const {
    workspace,
    isLoading,
    error,
    createDeck,
    selectDeck,
    renameDeck,
    duplicateDeck,
    deleteDeck,
    clearError,
  } = manager;

  const [newDeckName, setNewDeckName] = useState("");
  const [editingDeckId, setEditingDeckId] =
    useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deletingDeckId, setDeletingDeckId] =
    useState<string | null>(null);

  async function handleCreate(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const name = newDeckName.trim();

    if (!name) return;

    try {
        await createDeck(name);
        setNewDeckName("");
    } catch {
      // The workspace hook displays the error.
      // Preserve the input so the user can retry.
  }
  }

  async function handleRename(
    event: FormEvent<HTMLFormElement>,
    deckId: string,
  ) {
    event.preventDefault();

    const name = editingName.trim();

    if (!name) return;

    try {
        await renameDeck(deckId, name);

        setEditingDeckId(null);
        setEditingName("");
    } catch {
        // Keep the editor open if renaming fails.
    }
  }

  async function runWorkspaceAction(
    action: () => Promise<void>,
  ): Promise<void> {
    try {
        await action();
    } catch {
        // The workspace hook has already recorded the error.
    }
  }

  function startEditing(deck: StoredDeck) {
    setEditingDeckId(deck.id);
    setEditingName(deck.name);
    setDeletingDeckId(null);
  }

  function cancelEditing() {
    setEditingDeckId(null);
    setEditingName("");
  }

  if (!workspace) {
    return (
      <section className="deck-workspace-manager">
        <h2>Deck Workspace</h2>

        {isLoading ? (
          <p role="status">Loading saved decks...</p>
        ) : (
          <p>
            Deck workspace is not initialized yet.
          </p>
        )}

        {error && (
          <p role="alert" className="deck-workspace-error">
            {error}
          </p>
        )}
      </section>
    );
  }

  const { activeDeckId, decks } = workspace;

  return (
    <section
      className="deck-workspace-manager"
      aria-label="Deck workspace"
    >
      <header className="deck-workspace-header">
        <div>
          <h2>Deck Workspace</h2>
          <p>
            {decks.length} saved{" "}
            {decks.length === 1 ? "deck" : "decks"}
          </p>
        </div>
      </header>

      {error && (
        <div className="deck-workspace-error" role="alert">
          <span>{error}</span>

          <button
            type="button"
            onClick={clearError}
          >
            Dismiss
          </button>
        </div>
      )}

      <form
        className="deck-workspace-create"
        onSubmit={(event) => void handleCreate(event)}
      >
        <label htmlFor="new-workspace-deck-name">
          New deck name
        </label>

        <div className="deck-workspace-create-row">
          <input
            id="new-workspace-deck-name"
            type="text"
            value={newDeckName}
            onChange={(event) =>
              setNewDeckName(event.target.value)
            }
            placeholder="Enter deck name"
            maxLength={100}
            disabled={isLoading}
          />

          <button
            type="submit"
            disabled={isLoading || !newDeckName.trim()}
          >
            Create
          </button>
        </div>
      </form>

      <div className="deck-workspace-list">
        {decks.map((deck) => {
          const isActive = deck.id === activeDeckId;
          const isEditing = editingDeckId === deck.id;
          const isDeleting = deletingDeckId === deck.id;

          return (
            <article
              key={deck.id}
              className={[
                "deck-workspace-item",
                isActive ? "is-active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {isEditing ? (
                <form
                  className="deck-workspace-rename"
                  onSubmit={(event) =>
                    void handleRename(event, deck.id)
                  }
                >
                  <input
                    type="text"
                    aria-label={`Rename ${deck.name}`}
                    value={editingName}
                    onChange={(event) =>
                      setEditingName(event.target.value)
                    }
                    maxLength={100}
                    disabled={isLoading}
                  />

                  <button
                    type="submit"
                    disabled={
                      isLoading || !editingName.trim()
                    }
                  >
                    Save
                  </button>

                  <button
                    type="button"
                    onClick={cancelEditing}
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <div className="deck-workspace-item-heading">
                  <strong>{deck.name}</strong>

                  {isActive && (
                    <span className="deck-workspace-active">
                      Active
                    </span>
                  )}
                </div>
              )}

              <div className="deck-workspace-counts">
                <span>
                  Main: {getSectionCount(deck.main)}
                </span>
                <span>
                  Extra: {getSectionCount(deck.extra)}
                </span>
                <span>
                  Side: {getSectionCount(deck.side)}
                </span>
              </div>

              <div className="deck-workspace-actions">
                <button
                  type="button"
                  disabled={isLoading || isActive}
                  onClick={() => {
                    void runWorkspaceAction(() => selectDeck(deck.id));
                  }}
                >
                  {isActive ? "Selected" : "Select"}
                </button>

                <button
                  type="button"
                  disabled={isLoading || isEditing}
                  onClick={() => startEditing(deck)}
                >
                  Rename
                </button>

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => {
                    void runWorkspaceAction(() => duplicateDeck(deck.id));
                  }}
                >
                  Duplicate
                </button>

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => {
                    setDeletingDeckId(deck.id);
                    cancelEditing();
                  }}
                >
                  Delete
                </button>
              </div>

              {isDeleting && (
                <div className="deck-workspace-confirm">
                  <p>
                    Delete "{deck.name}"? This cannot be
                    undone.
                  </p>

                  <div className="deck-workspace-actions">
                    <button
                      type="button"
                      className="deck-workspace-danger"
                      disabled={isLoading}
                      onClick={() => {
                        void (async () => {
                            try {
                            await deleteDeck(deck.id);
                            setDeletingDeckId(null);
                            } catch {
                            // Keep confirmation visible if deletion fails.
                            }
                        })();
                      }}
                    >
                      Confirm Delete
                    </button>

                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() =>
                        setDeletingDeckId(null)
                      }
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}