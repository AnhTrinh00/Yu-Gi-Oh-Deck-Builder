import "fake-indexeddb/auto";

import { afterEach, beforeEach } from "vitest";

import {
  closeDatabase,
  deleteDatabase,
} from "../indexedDbService";

beforeEach(async () => {
  await deleteDatabase();
});

afterEach(async () => {
  await closeDatabase();
});