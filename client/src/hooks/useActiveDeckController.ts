import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import type { Deck } from "../models/deck/Deck";

import {
  DeckAutosaveService,
} from "../services/deck/deckAutosaveService";

import type {
  DeckWorkspace,
} from "../services/deck/deckWorkspaceService";

import {
  createWorkspaceDeck,
  deleteWorkspaceDeck,
  duplicateWorkspaceDeck,
  initializeDeckWorkspace,
  renameWorkspaceDeck,
  selectWorkspaceDeck,
} from "../services/deck/deckWorkspaceService";

import { useDeckWorkspace } from "./useDeckWorkspace";

type DeckUpdater = (current: Deck) => Deck;

type SaveStatus = "idle" | "saving" | "saved" | "error";

function toError(error: unknown): Error {
  return error instanceof Error
    ? error
    : new Error("Unable to save the deck.");
}

export function useActiveDeckController() {
  const manager = useDeckWorkspace();

  const {
    workspace,
    isLoading,
    error: workspaceError,
    initialize: initializeWorkspace,
    transition: executeWorkspaceTransition,
  } = manager;

  const [deck, setDeck] = useState<Deck | null>(null);
  const [saveStatus, setSaveStatus] =
    useState<SaveStatus>("idle");
  const [saveError, setSaveError] =
    useState<string | null>(null);

  const autosaveRef = useRef(
    new DeckAutosaveService(),
  );

  const activeDeckIdRef = useRef<string | null>(null);
  const deckRef = useRef<Deck | null>(null);

  const revisionRef = useRef(0);
  const savedRevisionRef = useRef(0);

  const transitionRef = useRef(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const workspaceDeckId =
    workspace?.activeDeckId ?? null;

  const workspaceDeck =
    workspace?.activeDeck ?? null;

  useEffect(() => {
    if (!workspaceDeckId || !workspaceDeck) {
      return;
    }

    if (activeDeckIdRef.current === workspaceDeckId) {
      return;
    }

    activeDeckIdRef.current = workspaceDeckId;
    deckRef.current = workspaceDeck;

    revisionRef.current = 0;
    savedRevisionRef.current = 0;

    setDeck(workspaceDeck);
    setSaveStatus("idle");
    setSaveError(null);
  }, [workspaceDeckId, workspaceDeck]);

  const initialize = useCallback(async () => {
    await initializeWorkspace();
  }, [initializeWorkspace]);

  const persistRevision = useCallback(
    (
      deckId: string,
      snapshot: Deck,
      revision: number,
    ): Promise<void> => {
      const operation = autosaveRef.current.save(
        deckId,
        snapshot,
      );

      return operation.then(
        () => {
          if (activeDeckIdRef.current !== deckId) {
            return;
          }

          savedRevisionRef.current = Math.max(
            savedRevisionRef.current,
            revision,
          );

          if (
            mountedRef.current &&
            savedRevisionRef.current === revisionRef.current
          ) {
            setSaveStatus("saved");
            setSaveError(null);
          }
        },
        (error: unknown) => {
          if (activeDeckIdRef.current !== deckId) {
            throw error;
          }

          if (
            mountedRef.current &&
            revision === revisionRef.current
          ) {
            setSaveStatus("error");
            setSaveError(toError(error).message);
          }

          throw error;
        },
      );
    },
    [],
  );

  const updateDeck = useCallback(
    (updater: DeckUpdater): void => {
      if (transitionRef.current) {
        throw new Error(
          "Cannot edit while switching decks.",
        );
      }

      const deckId = activeDeckIdRef.current;
      const current = deckRef.current;

      if (!deckId || !current) {
        throw new Error("No active deck is loaded.");
      }

      const updated = updater(current);

      if (updated === current) {
        return;
      }

      const revision = revisionRef.current + 1;
      revisionRef.current = revision;

      deckRef.current = updated;
      setDeck(updated);

      setSaveStatus("saving");
      setSaveError(null);

      void persistRevision(
        deckId,
        updated,
        revision,
      ).catch(() => {
        // Save errors are exposed through saveStatus
        // and saveError. They do not become unhandled.
      });
    },
    [persistRevision],
  );

  /**
   * Ensures the latest snapshot is persisted.
   *
   * If an earlier save failed but a later full snapshot
   * succeeded, no retry is needed.
   *
   * Otherwise, the latest snapshot is saved again.
   */
  const ensureSaved = useCallback(async () => {
    await autosaveRef.current.waitForIdle();

    const deckId = activeDeckIdRef.current;
    const current = deckRef.current;

    if (!deckId || !current) {
      return;
    }

    if (
      savedRevisionRef.current === revisionRef.current
    ) {
      return;
    }

    setSaveStatus("saving");
    setSaveError(null);

    const revision = revisionRef.current;

    await persistRevision(
      deckId,
      current,
      revision,
    );

    await autosaveRef.current.waitForIdle();

    if (
      savedRevisionRef.current !== revisionRef.current
    ) {
      throw new Error(
        "The latest deck changes were not saved.",
      );
    }
  }, [persistRevision]);

  const retrySave = useCallback(async () => {
    if (transitionRef.current) {
      throw new Error(
        "A deck operation is already in progress.",
      );
    }

    transitionRef.current = true;
    setIsTransitioning(true);

    try {
      await ensureSaved();
    } catch (error) {
      if (mountedRef.current) {
        setSaveStatus("error");
        setSaveError(toError(error).message);
      }

      throw error;
    } finally {
      transitionRef.current = false;
      if (mountedRef.current) setIsTransitioning(false);
    }
  }, [ensureSaved]);

  const runTransition = useCallback(
    async (
      operation: () => Promise<DeckWorkspace>,
    ): Promise<void> => {
      if (transitionRef.current) {
        throw new Error(
          "A deck operation is already in progress.",
        );
      }

      transitionRef.current = true;
      setIsTransitioning(true);
      let savingEdits = true;

      try {
        // Complete all outstanding edits first.
        await ensureSaved();
        savingEdits = false;

        // Execute the IndexedDB operation.
        const nextWorkspace =
          await executeWorkspaceTransition(operation);

        // Commit ID and contents before unlocking edits.
        activeDeckIdRef.current =
          nextWorkspace.activeDeckId;

        deckRef.current = nextWorkspace.activeDeck;

        revisionRef.current = 0;
        savedRevisionRef.current = 0;

        setDeck(nextWorkspace.activeDeck);
        setSaveStatus("idle");
        setSaveError(null);
      } catch (error) {
        // Workspace failures are reported by useDeckWorkspace.
        // Do not misrepresent them as autosave failures.
        if (savingEdits && mountedRef.current) {
          setSaveStatus("error");
          setSaveError(toError(error).message);
        }

        throw error;
      } finally {
        transitionRef.current = false;
        if (mountedRef.current) setIsTransitioning(false);
      }
    },
    [ensureSaved, executeWorkspaceTransition],
  );

  const selectDeck = useCallback(
    (deckId: string) =>
      runTransition(() => selectWorkspaceDeck(deckId)),
    [runTransition],
  );

  const createDeck = useCallback(
    (name?: string) =>
      runTransition(() => createWorkspaceDeck(name)),
    [runTransition],
  );

  const duplicateDeck = useCallback(
    (deckId: string) =>
      runTransition(() => duplicateWorkspaceDeck(deckId)),
    [runTransition],
  );

  const deleteDeck = useCallback(
    (deckId: string) =>
      runTransition(() => deleteWorkspaceDeck(deckId)),
    [runTransition],
  );

  const renameDeck = useCallback(
    (deckId: string, name: string) =>
      runTransition(async () => {
        await renameWorkspaceDeck(deckId, name);
        return initializeDeckWorkspace();
      }),
    [runTransition],
  );

  const displayWorkspace = workspace && deck ? {
    ...workspace,
    activeDeck: deck,
    decks: workspace.decks.map((record) =>
      record.id === workspace.activeDeckId
        ? {
            ...record,
            name: deck.name,
            main: deck.main.map(({ card, quantity }) => ({ cardId: card.id, quantity })),
            extra: deck.extra.map(({ card, quantity }) => ({ cardId: card.id, quantity })),
            side: deck.side.map(({ card, quantity }) => ({ cardId: card.id, quantity })),
          }
        : record,
    ),
  } : workspace;

  return {
    workspaceManager: {
      ...manager,
      workspace: displayWorkspace,
      isLoading: isLoading || isTransitioning,
      selectDeck,
      createDeck,
      duplicateDeck,
      deleteDeck,
      renameDeck,
    },
    deck,
    activeDeckId: workspaceDeckId,
    decks: workspace?.decks ?? [],
    isLoading,
    isTransitioning,
    workspaceError,
    saveStatus,
    saveError,
    initialize,
    updateDeck,
    ensureSaved,
    retrySave,
    selectDeck,
    createDeck,
    duplicateDeck,
    deleteDeck,
    renameDeck,
  };
}