import { useCallback, useEffect, useRef, useState } from "react";

import type { DeckWorkspace } from "../services/deck/deckWorkspaceService";

import {
  createWorkspaceDeck,
  deleteWorkspaceDeck,
  duplicateWorkspaceDeck,
  initializeDeckWorkspace,
  renameWorkspaceDeck,
  selectWorkspaceDeck,
} from "../services/deck/deckWorkspaceService";

import {
  startDeckWorkspace,
} from "../services/deck/deckWorkspaceStartupService";

export interface UseDeckWorkspaceResult {
  workspace: DeckWorkspace | null;
  isLoading: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  refresh: () => Promise<void>;
  createDeck: (name?: string) => Promise<void>;
  selectDeck: (deckId: string) => Promise<void>;
  renameDeck: (deckId: string, name: string) => Promise<void>;
  duplicateDeck: (deckId: string) => Promise<void>;
  deleteDeck: (deckId: string) => Promise<void>;
  clearError: () => void;
  transition: (
    operation: () => Promise<DeckWorkspace>,
  ) => Promise<DeckWorkspace>;
}

type WorkspaceOperation = () => Promise<DeckWorkspace>;

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "An unexpected deck workspace error occurred.";
}

export function useDeckWorkspace(): UseDeckWorkspaceResult {
  const [workspace, setWorkspace] =
    useState<DeckWorkspace | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(false);
  const operationQueueRef = useRef<Promise<void>>(
    Promise.resolve(),
  );

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  /**
   * Serializes workspace operations.
   *
   * This prevents an earlier deck selection from completing
   * after a later selection and replacing the newer state.
   *
   * The queue also continues after a failed operation.
   */
  const runOperation = useCallback(
    (operation: WorkspaceOperation): Promise<void> => {
      const execute = async (): Promise<void> => {
        if (!mountedRef.current) {
          return;
        }

        setIsLoading(true);
        setError(null);

        try {
          const result = await operation();

          if (mountedRef.current) {
            setWorkspace(result);
          }
        } catch (caughtError) {
          if (mountedRef.current) {
            setError(getErrorMessage(caughtError));
          }

          throw caughtError;
        } finally {
          if (mountedRef.current) {
            setIsLoading(false);
          }
        }
      };

      const pending = operationQueueRef.current.then(execute);

      // Keep the queue usable even if an unexpected error
      // escapes the operation handler.
      operationQueueRef.current = pending.catch(() => {});

      return pending;
    },
    [],
  );
  /**
   * Executes a workspace operation in the shared queue
   * and returns the resulting workspace.
   *
   * The active-deck controller uses this to update
   * the active deck ID and contents together.
   */
  const transition = useCallback(
    (
      operation: () => Promise<DeckWorkspace>,
    ): Promise<DeckWorkspace> => {
      const execute = async (): Promise<DeckWorkspace> => {
        setIsLoading(true);
        setError(null);

        try {
          const result = await operation();

          if (mountedRef.current) {
            setWorkspace(result);
          }

          return result;
        } catch (caughtError) {
          if (mountedRef.current) {
            setError(getErrorMessage(caughtError));
          }

          throw caughtError;
        } finally {
          if (mountedRef.current) {
            setIsLoading(false);
          }
        }
      };

      const pending = operationQueueRef.current.then(execute);

      // Keep subsequent operations working after a failure.
      operationQueueRef.current = pending.then(
        () => undefined,
        () => undefined,
      );

      return pending;
    },
    [],
  );

  /**
   * Call only after the legacy deck migration is ready.
   *
   * Do not automatically initialize on mount yet.
   */
  const initialize = useCallback(
    () => 
      runOperation(async () => {
        const result = await startDeckWorkspace();
        return result.workspace;
      }),
    [runOperation],
  );

  /**
   * Reloads the current workspace without changing
   * the active deck selection.
   */
  const refresh = useCallback(
    () => runOperation(initializeDeckWorkspace),
    [runOperation],
  )

  const createDeck = useCallback(
    (name?: string) =>
      runOperation(() => createWorkspaceDeck(name)),
    [runOperation],
  );

  const selectDeck = useCallback(
    (deckId: string) =>
      runOperation(() => selectWorkspaceDeck(deckId)),
    [runOperation],
  );

  /**
   * Renaming a background deck should not change
   * the currently selected deck.
   */
  const renameDeck = useCallback(
    (deckId: string, name: string) =>
      runOperation(async () => {
        await renameWorkspaceDeck(deckId, name);

        return initializeDeckWorkspace();
      }),
    [runOperation],
  );

  const duplicateDeck = useCallback(
    (deckId: string) =>
      runOperation(() => duplicateWorkspaceDeck(deckId)),
    [runOperation],
  );

  const deleteDeck = useCallback(
    (deckId: string) =>
      runOperation(() => deleteWorkspaceDeck(deckId)),
    [runOperation],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    workspace,
    isLoading,
    error,
    initialize,
    refresh,
    createDeck,
    selectDeck,
    renameDeck,
    duplicateDeck,
    deleteDeck,
    clearError,
    transition,
  };
}