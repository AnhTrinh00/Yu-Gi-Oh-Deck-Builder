import "./testSetup";

import { describe, expect, it } from "vitest";

import {
  deleteMetadata,
  getActiveDeckId,
  getMetadata,
  METADATA_KEYS,
  setActiveDeckId,
  setMetadata,
} from "../metadataRepository";

describe("metadataRepository", () => {
  it("stores and retrieves metadata", async () => {
    await setMetadata("testKey", { enabled: true });

    expect(await getMetadata("testKey")).toEqual({
      enabled: true,
    });
  });

  it("returns null for missing metadata", async () => {
    expect(await getMetadata("missing")).toBeNull();
  });

  it("stores the active deck ID", async () => {
    await setActiveDeckId("deck-123");

    expect(await getActiveDeckId()).toBe("deck-123");
  });

  it("clears the active deck ID", async () => {
    await setActiveDeckId("deck-123");
    await setActiveDeckId(null);

    expect(await getActiveDeckId()).toBeNull();
  });

  it("rejects empty metadata keys", async () => {
    await expect(
      setMetadata("", true),
    ).rejects.toThrow();
  });

  it("deletes metadata", async () => {
    await setMetadata(
      METADATA_KEYS.LOCAL_STORAGE_MIGRATION_VERSION,
      1,
    );

    await deleteMetadata(
      METADATA_KEYS.LOCAL_STORAGE_MIGRATION_VERSION,
    );

    expect(
      await getMetadata(
        METADATA_KEYS.LOCAL_STORAGE_MIGRATION_VERSION,
      ),
    ).toBeNull();
  });
});