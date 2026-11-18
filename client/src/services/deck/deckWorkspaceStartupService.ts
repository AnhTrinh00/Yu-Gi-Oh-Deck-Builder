import type { DeckWorkspace } from "./deckWorkspaceService";

import {
  initializeDeckWorkspace,
} from "./deckWorkspaceService";

import {
  migrateLegacyDeck,
} from "../persistence/legacyDeckMigrationService";

export interface DeckWorkspaceStartupResult {
  workspace: DeckWorkspace;
  migratedLegacyDeck: boolean;
}

let startupPromise:
  | Promise<DeckWorkspaceStartupResult>
  | null = null;

/**
 * Migrates legacy data before initializing IndexedDB decks.
 *
 * Multiple simultaneous callers share the same startup
 * operation, preventing duplicate initialization.
 */
export function startDeckWorkspace():
  Promise<DeckWorkspaceStartupResult> {
  if (startupPromise) {
    return startupPromise;
  }

  startupPromise = (async () => {
    const migration = await migrateLegacyDeck();

    const workspace = await initializeDeckWorkspace();

    return {
      workspace,
      migratedLegacyDeck:
        migration.status === "migrated",
    };
  })().catch((error: unknown) => {
    startupPromise = null;
    throw error;
  });

  return startupPromise;
}