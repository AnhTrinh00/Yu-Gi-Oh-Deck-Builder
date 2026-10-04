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

## Roadmap

* [x] Phase 0 — Project Setup
* [x] Phase 1 — Card Search & Collection
* [x] Phase 2 — Deck Building
* [ ] Phase 3 — Advanced Deck Building
* [ ] Phase 4 — Deck Statistics & Analysis
* [ ] Phase 5 — Combo Analysis
* [ ] Phase 6 — AI-Assisted Deck Building

Future phases will gradually introduce more advanced Yu-Gi-Oh! rules, deck analysis, combo detection, and AI-assisted recommendations.

````

### One change I'd specifically recommend

I would **not** put "build decks using only cards in their collection" under *Current Features* yet.

Right now, the application can add cards from the search results directly to the deck, so the architecture isn't enforcing:

> "You can only add cards that you own."

That's something we should implement in a future deck-building phase.

Likewise, I would keep:

- combo analysis
- end-board identification
- AI recommendations

under **Project Goals**, because those aren't implemented yet.

That distinction makes the README much stronger as a portfolio project: it clearly separates **what exists today** from **what you're building toward**.

After saving this README, you can proceed with:

```powershell
git status
git add .
git commit -m "Complete Phase 2 deck building system"
git push origin main
````

Then Phase 2 is officially finished.
