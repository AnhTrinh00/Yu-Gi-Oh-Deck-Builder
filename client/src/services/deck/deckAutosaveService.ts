import type { Deck } from "../../models/deck/Deck";
import type { StoredDeck } from "../../models/persistence/StoredRecords";

import { saveWorkspaceDeck } from "./deckWorkspaceService";

export type DeckSaveFunction = (
  deckId: string,
  deck: Deck,
) => Promise<StoredDeck>;

export class DeckAutosaveService {
  private queue: Promise<void> = Promise.resolve();

  private pendingCount = 0;

  private lastError: Error | null = null;

  private readonly saveDeck: DeckSaveFunction;

  constructor(
    saveDeck: DeckSaveFunction = saveWorkspaceDeck,
  ) {
    this.saveDeck = saveDeck;
  }

  /**
   * Enqueues a deck snapshot for saving.
   *
   * Saves execute sequentially, in the order requested.
   * A failed save does not permanently break the queue.
   */
  save(
    deckId: string,
    deck: Deck,
  ): Promise<StoredDeck> {
    if (!deckId.trim()) {
      return Promise.reject(
        new Error("Cannot save a deck without an ID."),
      );
    }

    // Capture the deck state immediately.
    const snapshot = structuredClone(deck);

    this.pendingCount += 1;

    const operation = this.queue.then(async () => {
      try {
        const result = await this.saveDeck(
          deckId,
          snapshot,
        );

        this.lastError = null;

        return result;
      } catch (error) {
        this.lastError =
          error instanceof Error
            ? error
            : new Error("Deck autosave failed.");

        throw this.lastError;
      } finally {
        this.pendingCount -= 1;
      }
    });

    // Keep the internal queue resolved even when an
    // individual save fails.
    this.queue = operation.then(
      () => undefined,
      () => undefined,
    );

    // The caller still receives the original rejection.
    return operation;
  }

  /**
   * Waits for all saves queued before this call.
   *
   * Does not hide failures: callers must also handle
   * rejected promises returned by save().
   */
  async flush(): Promise<void> {
    await this.queue;

    if (this.lastError) {
      throw this.lastError;
    }
  }

  /**
   * Waits for every save currently queued.
   *
   * Unlike flush(), this method only waits for completion.
   * The controller tracks whether its latest revision
   * was successfully persisted.
   */
  async waitForIdle(): Promise<void> {
    await this.queue;
  }

  hasPendingSaves(): boolean {
    return this.pendingCount > 0;
  }

  getLastError(): Error | null {
    return this.lastError;
  }
}