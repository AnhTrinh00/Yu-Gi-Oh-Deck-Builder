# Yu-Gi-Oh! Deck Builder

A web application designed to help Yu-Gi-Oh! players build decks using the cards they currently own.

The long-term goal is to combine card collection management, deck construction, combo analysis, and AI-assisted deck building into one application.

## Project Goals

The application will eventually allow users to:

* Search the Yu-Gi-Oh! card database
* Manage their personal card collection
* Track how many copies of each card they own
* Build Main, Extra, and Side Decks
* Build decks using only cards in their collection
* Validate deck construction rules
* Analyze possible card combinations and combo lines
* Identify possible end boards
* Provide AI-assisted deck-building recommendations

## Current Features

### Phase 1 — Card Search & Collection

* Search the Yu-Gi-Oh! card database through the Yu-Gi-Oh! card API
* Display card information and images
* Add cards to a personal collection
* Increase and decrease card quantities
* Remove cards from the collection
* Display owned quantities in search results

### Phase 2 — Deck Building

* Create and manage a deck
* Add cards to the deck
* Remove cards from the deck
* Increase and decrease card quantities
* Main Deck, Extra Deck, and Side Deck sections
* Display deck card counts
* Display different-card counts
* Validate basic deck construction rules
* Enforce a maximum of 3 copies of a card across the entire deck
* Rename the deck
* Automatically save the deck to browser localStorage
* Automatically load the saved deck when the application starts
* Clear the deck with confirmation
* Automated deck-service tests using Vitest

## Current Deck Rules

The current validation system supports the following basic deck construction rules:

| Deck Section | Allowed Size |
| ------------ | ------------ |
| Main Deck    | 40–60 cards  |
| Extra Deck   | 0–15 cards   |
| Side Deck    | 0–15 cards   |

The application currently limits each card to a maximum of 3 copies across the Main, Extra, and Side Deck combined.

Advanced format-specific rules, including Forbidden, Limited, and Semi-Limited cards, will be implemented in a future phase.

## Current Architecture

```text
Yu-Gi-Oh! Card API
        ↓
    Card Service
        ↓
     Card Model
        ↓
 ┌──────┴─────────┐
 ↓                ↓
Search        Collection
                  ↓
             localStorage
                  ↓
            Collection UI

                  ↓
             Deck Model
                  ↓
            Deck Service
                  ↓
          ┌───────┼────────┐
          ↓       ↓        ↓
        Main    Extra     Side
          └───────┼────────┘
                  ↓
           Deck Validation
                  ↓
               Deck UI
```

## Project Structure

```text
client/
└── src/
    ├── assets/
    │
    ├── models/
    │   ├── Card.ts
    │   ├── CollectionCard.ts
    │   └── Deck.ts
    │
    ├── services/
    │   ├── cardApi.ts
    │   ├── collectionService.ts
    │   ├── deckService.ts
    │   └── __tests__/
    │       └── deckService.test.ts
    │
    ├── App.tsx
    ├── App.css
    ├── index.css
    └── main.tsx
```

## Testing

The deck service is tested using Vitest.

Tests currently cover:

* Empty deck creation
* Adding cards
* Card quantities
* Three-copy limits
* Removing cards
* Removing all copies
* Deck card counts
* Main Deck validation
* Extra Deck limits
* Side Deck limits
* Three-copy limits across deck sections

Run the test suite with:

```bash
npm test
```

Run tests once without watch mode:

```bash
npx vitest run
```

Run linting:

```bash
npm run lint
```

Build the project:

```bash
npm run build
```

## Current Features

### Card Database

- Search Yu-Gi-Oh! cards using the YGOPRODeck API.
- View card information and images.
- Add cards to a personal collection.

### Collection Management

- Track owned card quantities.
- Search, filter, and sort owned cards.
- View collection statistics.
- Compare owned quantities with cards currently assigned to a deck.
- Identify missing copies.

### Deck Building

- Manage Main, Extra, and Side Decks.
- Enforce deck section and copy limits.
- Apply Advanced Format banlist restrictions.
- Restrict card additions based on collection ownership.
- Save deck information locally.

### Deck Analysis

- View deck statistics and archetype information.
- Create and manage card relationships.
- Explore relationship graphs and paths.
- Create and save combos.
- Analyze combo candidates and probabilities.
- Run supported combo simulations.
- Generate rule-based deck recommendations.

### User Interface

- Dedicated Builder, Collection, My Deck, and Analysis pages.
- Responsive card displays.
- Deck editing controls.
- Ownership and validation warnings.

## Project Structure

```text
client/
├── docs/
│   └── ARCHITECTURE.md
├── src/
│   ├── components/
│   │   ├── analysis/
│   │   ├── collection/
│   │   └── deck/
│   ├── hooks/
│   ├── models/
│   ├── services/
│   │   └── __tests__/
│   ├── App.tsx
│   └── main.tsx
├── package.json
├── vite.config.ts
└── vitest.config.ts
```

## Development Commands

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Run the test suite:

```bash
npm run test -- --run
```

Check code quality:

```bash
npm run lint
```

Build for production:

```bash
npm run build
```

## Development Roadmap

- **Phase 0:** Project setup and tooling — Complete
- **Phase 1:** Card API integration and models — Complete
- **Phase 2:** Collection and deck services — Complete
- **Phase 3:** User interface, relationship graphs, combo analysis, and integration testing — Complete, pending final verification
- **Phase 4:** Structured card effects and advanced combo engine — Planned
- **Phase 5:** AI-assisted deck analysis and recommendations — Planned

## Documentation

See [Architecture](docs/ARCHITECTURE.md) for an overview of the application's structure and major services.

## Current Limitations

- Deck and collection data are primarily stored locally.
- Combo analysis depends on the relationships and actions represented in the application.
- The system does not yet fully interpret arbitrary Yu-Gi-Oh! card effects.
- Automated recommendations should not be treated as proof that a combo is legal.

The long-term goal is to combine structured game-state simulation with AI-assisted reasoning to provide useful, explainable deck-building recommendations.
Then Phase 2 is officially finished.
