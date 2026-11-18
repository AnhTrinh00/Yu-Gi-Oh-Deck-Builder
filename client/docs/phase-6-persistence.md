# Phase 6 — Persistence Architecture

**Status:** Phase 6.1 design approved; implementation pending  
**Scope:** Browser-local workspace with a shared, read-only MongoDB knowledge layer  
**Project:** Yu-Gi-Oh! Deck Builder

## 1. Goals and non-goals

Phase 6 improves persistence and deck management while preserving the existing React/TypeScript, Express, deterministic analysis, and Gemini recommendation systems.

Goals:
- Maintain personal card collections, multiple named decks, and saved combos across reloads.
- Preserve custom card effects, effect templates, and relationships.
- Support non-destructive migration from existing `localStorage` data.
- Allow portable, versioned JSON backup and restore.
- Provide a foundation for curated shared combo/archetype knowledge through MongoDB.
- Preserve existing domain interfaces and deterministic legality/analysis behavior.

Non-goals:
- Login, signup, user accounts, user profiles, or multi-user account databases.
- Automatic cross-device synchronization.
- Uploading personal collections or decks to MongoDB by default.
- Public write access to shared knowledge.
- Automatic application of AI recommendations to decks.

## 2. Architecture and ownership

```text
YGOPRODeck API ───────► Card catalog / refreshable metadata
                               │
React + TypeScript ────────────┼──► IndexedDB (per browser origin)
   │                           │     cards, collection, decks, combos,
   │                           │     custom effects, templates, relationships
   │                           │
   └──► Express + TypeScript ──┼──► Gemini API (advisory AI)
              │                │
              └────────────────┴──► MongoDB (curated shared knowledge)
                                     read-only public knowledge endpoints
```

**Personal workspace:** IndexedDB is the authoritative store for browser-local user-authored data. This is isolated by browser origin/profile, not synchronized between devices. Clearing site data may delete it. A JSON backup/export is therefore important.

**Shared knowledge:** MongoDB contains curated public combo and archetype records. It must never be used as a single shared collection/deck store for anonymous visitors.

**AI:** Express may receive selected deck/collection context to generate recommendations, but such requests do not imply permanent storage. Keep API keys on the server, preserve cancellation and stale-response protections, and treat deterministic validation as authoritative.

## 3. Existing domain contracts

Current source models reviewed in the Phase 6.1 ZIP:

- `client/src/models/card/Card.ts`: `Card.id` is the numeric YGOPRODeck identifier; card metadata includes type, description, images, optional stats, archetype, and banlist information.
- `client/src/models/card/CollectionCard.ts`: a `Card` plus quantity.
- `client/src/models/deck/Deck.ts`: `name`, `main`, `extra`, `side`; each section contains `{ card: Card, quantity: number }`. There is currently no persistent deck ID.
- `client/src/models/combo/Combo.ts`: string `id`, name, description, starters, requirements, ordered steps, end-board card IDs, and timestamps.

**Compatibility rule:** Keep these domain contracts stable. Introduce separate persistence DTOs and adapters; do not make pure deck construction, legality, combo, or analysis functions dependent on IndexedDB or MongoDB.

## 4. IndexedDB design (proposed v1)

**Database name:** `yugioh-deck-builder`  
**Version:** `1`  
**Implementation:** small typed repository layer using the `idb` package.

| Object store | Key path | Record purpose |
| --- | --- | --- |
| `cards` | `id` | `{ id: number, card: Card, cachedAt: string }` |
| `collection` | `cardId` | `{ cardId: number, quantity: number, updatedAt: string }` |
| `decks` | `id` | Stored deck with UUID, name, three sections of `{ cardId, quantity }`, and timestamps |
| `combos` | `id` | Existing `Combo` records |
| `cardEffects` | To be finalized from existing effect registry contract | User-authored card effects |
| `effectTemplates` | `id` (subject to verifying existing template persistence) | Saved custom templates, not built-in presets |
| `relationships` | To be finalized from existing relationship identity semantics | Custom card relationships |
| `metadata` | `key` | Active deck ID, migration version, other workspace metadata |

Do not finalize the `cardEffects` or `relationships` key paths until their current identity/uniqueness rules are checked during Phase 6.2/6.4. Preserve all existing valid records, including multiple relationships between the same cards when supported by the current model.

### 4.1 Stored deck shape

```ts
interface StoredDeckCard {
  cardId: number;
  quantity: number;
}

interface StoredDeck {
  id: string; // crypto.randomUUID()
  name: string;
  main: StoredDeckCard[];
  extra: StoredDeckCard[];
  side: StoredDeckCard[];
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}
```

Use `metadata.activeDeckId` to identify the currently edited deck. Saving a draft with fewer than 40 Main Deck cards is allowed; legality validation remains separate from persistence. Copy limits and section restrictions remain enforced by the existing application logic.

### 4.2 Card references and cache

Collection and deck entries store numeric card IDs and quantities. `cards` holds metadata snapshots for reconstructing existing domain objects. Cache misses should trigger a controlled catalog lookup, with a recoverable error state if metadata is unavailable. Cache metadata can become stale; banlist checks must not blindly trust old snapshots.

### 4.3 Repository boundaries

Suggested frontend modules under `client/src/services/persistence/`:

- `indexedDbService.ts`: open/version/upgrade/transaction lifecycle.
- `cardRepository.ts`: get, upsert, refresh cache.
- `collectionRepository.ts`: get, set quantities, remove, clear.
- `deckRepository.ts`: create, list, get, save, duplicate, delete.
- `comboRepository.ts`: personal combo CRUD.
- `migrationService.ts`: validated, repeatable legacy import.

Additional repositories/adapters for effects, templates, and relationships will follow existing contracts. React components should use hooks/services, not raw IndexedDB operations. Async hydration must finish before autosave can overwrite stored data; UI must distinguish loading, ready, and error states.

## 5. MongoDB design (shared knowledge only)

Use the existing Express server and add Mongoose when this feature is implemented (Phase 6.5), not during IndexedDB setup.

### 5.1 `shared_combos`

Proposed fields:

| Field | Meaning |
| --- | --- |
| `_id` | MongoDB document ID |
| `name`, `description`, `archetype` | Display and search metadata |
| `starters`, `requirements`, `steps`, `endBoardCardIds` | Combo structure mapped to the existing `Combo` domain |
| `source` | Curated provenance/reference information |
| `verification` | Draft/reviewed/verified status and timestamps |
| `schemaVersion` | Knowledge record version |
| `createdAt`, `updatedAt` | Audit timestamps |

Initial indexes: `archetype`, `starters.cardId`, and `verification.status`. A saved combo is **not** automatically proven executable; reuse deterministic evaluation and do not present unverified knowledge as verified.

### 5.2 `archetype_knowledge`

Proposed fields: `_id`, unique normalized `archetypeKey`, display `name`, `description`, related `cardIds`, suggested starter IDs, related combo references, `schemaVersion`, and timestamps. Begin with curated records; avoid treating generated text as verified game facts.

### 5.3 Public API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/knowledge/combos` | Filtered, paginated approved combos |
| GET | `/api/knowledge/combos/:id` | Approved combo detail |
| GET | `/api/knowledge/archetypes` | Archetype directory |
| GET | `/api/knowledge/archetypes/:key` | Archetype detail |

No public write endpoints in Phase 6. Validate query parameters, bound pagination, rate-limit as appropriate, and avoid exposing draft/unreviewed content. Curated data is maintained through controlled development/seed workflows.

## 6. Legacy localStorage migration

| Existing key | Destination |
| --- | --- |
| `yugioh-collection` | `collection` + `cards` |
| `yugioh-deck-builder-deck` | One `decks` record + `cards` |
| `yugioh-combos-v1` | `combos` |
| `yugioh-card-effects-v1` | `cardEffects` |
| `yugioh-effect-templates-v1` | `effectTemplates` |
| `yugioh-card-relationships` | `relationships` |

Migration requirements:

1. Read and validate legacy data using current domain validators wherever available; report invalid records rather than silently discarding them.
2. Transform and deduplicate card metadata by YGOPRODeck ID, preserving quantities and existing IDs.
3. Import related data atomically where practical; do not mark migration complete before writes commit.
4. Record a migration version/marker in `metadata` so retries and reloads do not duplicate decks or inflate quantities.
5. Verify migrated record counts and important content before considering migration successful.
6. Preserve original localStorage keys through the migration and a recovery period; never delete them preemptively.
7. Handle interrupted migrations, quota errors, private browsing restrictions, and unsupported storage gracefully.

Do not rely solely on matching item counts for verification: compare IDs, quantities, deck sections, combo details, and custom analysis definitions.

## 7. Backup and restore

Implement a versioned JSON workspace export containing decks, collection, combos, custom effects/templates, relationships, and sufficient card snapshots to reconstruct records. Exclude secrets and Gemini credentials. Validate imported JSON and offer a clear merge-versus-replace decision; create a backup before destructive replacement. Reject unsupported schema versions safely.

## 8. Testing and acceptance criteria

- IndexedDB initialization, upgrades, and repository CRUD work with an isolated test database.
- Multiple saved decks are isolated; switching and deleting one deck does not corrupt others.
- Draft decks can be saved, while legality checks remain authoritative.
- Collection quantities and card references survive reloads.
- Personal combos, custom effects, templates, and relationships survive reloads.
- Migration is idempotent and recoverable after interrupted/invalid imports.
- Export/import round trips preserve meaningful workspace data.
- MongoDB APIs expose only approved knowledge and enforce filtering/pagination.
- Existing Phase 5 AI validation, grounding, cancellation, and stale-response tests remain passing.
- `npm run test`, `npm run lint`, and `npm run build` pass in the affected workspaces.

## 9. Implementation roadmap

| Phase | Deliverable |
| --- | --- |
| **6.1** | Architecture, schema, migration and API design (this document) |
| **6.2** | IndexedDB initialization, typed repositories, tests |
| **6.3** | Multiple saved deck management and React hydration |
| **6.4** | Collection, combo, effect, template and relationship persistence |
| **6.5** | Mongoose shared-knowledge models, curated data and read-only Express routes |
| **6.6** | Idempotent localStorage migration, JSON backup/restore |
| **6.7** | Integration tests, documentation, verification, Phase 7 handoff |

## 10. Decisions and future considerations

- No login/signup or user database unless future product feedback justifies it.
- Browser-local data is intentionally device/browser-specific. MongoDB does not automatically synchronize it.
- No arbitrary anonymous writes to shared MongoDB collections.
- YGOPRODeck remains the card catalog source; card metadata caches are not authoritative for changing banlists.
- AI recommendations are advisory; deterministic validation remains authoritative.
- Preserve existing model interfaces and keep storage details behind adapters/repositories.
- Phase 6.1 is design-only. Begin application code in Phase 6.2 and proceed incrementally with tests.