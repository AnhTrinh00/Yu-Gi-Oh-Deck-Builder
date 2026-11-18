import { useCallback, useEffect, useRef, useState } from "react";
import type { Card } from "../models/card/Card";
import type { CollectionCard } from "../models/card/CollectionCard";
import type { Combo } from "../models/combo/Combo";
import type { CardRelationship } from "../models/effect/CardRelationship";
import {
  addCollectionQuantity,
  getPersistedCollection,
  removeCollectionQuantity,
} from "../services/persistence/collectionRepository";
import { getSavedCombos, saveCombo, deleteSavedCombo } from "../services/persistence/comboRepository";
import {
  getSavedRelationships,
  replaceSavedRelationships,
} from "../services/persistence/personalDefinitionRepository";
import { migrateLegacyUserData } from "../services/persistence/legacyUserDataMigrationService";
import { enqueuePersonalWrite, waitForPersonalWrites } from "../services/persistence/personalWriteQueue";

export interface PersonalWorkspaceData {
  collection: CollectionCard[];
  combos: Combo[];
  relationships: CardRelationship[];
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : "Unable to access your saved data.";
}

export function usePersonalWorkspace() {
  const [data, setData] = useState<PersonalWorkspaceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const mounted = useRef(false);
  const startup = useRef<Promise<PersonalWorkspaceData> | null>(null);
  const pendingCount = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    const pending = startup.current ?? (async () => {
      await migrateLegacyUserData();
      await waitForPersonalWrites();
      const [collection, combos, relationships] = await Promise.all([
        getPersistedCollection(), getSavedCombos(), getSavedRelationships(),
      ]);
      return { collection, combos, relationships };
    })();
    startup.current = pending;
    try {
      const next = await pending;
      if (mounted.current) { setData(next); setError(null); }
    } catch (cause) {
      if (mounted.current) setError(message(cause));
      throw cause;
    } finally {
      if (startup.current === pending) startup.current = null;
    }
  }, []);

  useEffect(() => { void refresh().catch(() => {}); }, [refresh]);

  const runWrite = useCallback(async (operation: () => Promise<void>) => {
    pendingCount.current += 1;
    if (mounted.current) { setIsSaving(true); setError(null); }
    try {
      await enqueuePersonalWrite(operation);
    } catch (cause) {
      if (mounted.current) setError(message(cause));
      throw cause;
    } finally {
      pendingCount.current -= 1;
      if (mounted.current && pendingCount.current === 0) setIsSaving(false);
    }
  }, []);

  const addCard = useCallback((card: Card) => runWrite(async () => {
    await addCollectionQuantity(card, 1);
    const collection = await getPersistedCollection();
    if (mounted.current) setData(prev => prev ? { ...prev, collection } : prev);
  }), [runWrite]);

  const removeCard = useCallback((cardId: number) => runWrite(async () => {
    await removeCollectionQuantity(cardId, 1);
    const collection = await getPersistedCollection();
    if (mounted.current) setData(prev => prev ? { ...prev, collection } : prev);
  }), [runWrite]);

  const upsertCombo = useCallback((combo: Combo) => runWrite(async () => {
    await saveCombo(combo);
    const combos = await getSavedCombos();
    if (mounted.current) setData(prev => prev ? { ...prev, combos } : prev);
  }), [runWrite]);

  const removeCombo = useCallback((comboId: string) => runWrite(async () => {
    await deleteSavedCombo(comboId);
    const combos = await getSavedCombos();
    if (mounted.current) setData(prev => prev ? { ...prev, combos } : prev);
  }), [runWrite]);

  const addRelationship = useCallback((relationship: CardRelationship) => runWrite(async () => {
    const current = await getSavedRelationships();
    const exists = current.some(item => item.sourceCardId === relationship.sourceCardId &&
      item.targetCardId === relationship.targetCardId && item.type === relationship.type);
    if (!exists) await replaceSavedRelationships([...current, relationship]);
    const relationships = exists ? current : await getSavedRelationships();
    if (mounted.current) setData(prev => prev ? { ...prev, relationships } : prev);
  }), [runWrite]);

  const removeRelationship = useCallback((sourceCardId: number, targetCardId: number,
    type: CardRelationship["type"]) => runWrite(async () => {
      const current = await getSavedRelationships();
      await replaceSavedRelationships(current.filter(item =>
        item.sourceCardId !== sourceCardId || item.targetCardId !== targetCardId || item.type !== type));
      const relationships = await getSavedRelationships();
      if (mounted.current) setData(prev => prev ? { ...prev, relationships } : prev);
    }), [runWrite]);

  return { data, error, isSaving, refresh, addCard, removeCard,
    upsertCombo, removeCombo, addRelationship, removeRelationship };
}
