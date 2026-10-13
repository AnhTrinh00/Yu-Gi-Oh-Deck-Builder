# Yu-Gi-Oh! Deck Builder

A web application designed to help Yu-Gi-Oh! players build, manage, and analyze decks using cards from their personal collections.

The application combines card collection management, deck construction, card relationship analysis, structured game-state simulation, and end-board evaluation.

The long-term goal is to integrate Large Language Models (LLMs) to provide intelligent, explainable deck-building recommendations and combo analysis.

## Project Goals

The application aims to allow users to:

- Search the Yu-Gi-Oh! card database.
- Manage their personal card collection.
- Track owned card quantities.
- Construct Main, Extra, and Side Decks.
- Build decks based on cards they currently own.
- Validate deck construction rules and banlist restrictions.
- Discover card relationships and possible combos.
- Create, save, and simulate combo sequences.
- Analyze resulting end boards and remaining resources.
- Evaluate potential disruptions and board strength.
- Receive AI-assisted deck-building recommendations.

## Development Progress

| Phase | Description | Status |
|---|---|---|
| Phase 0 | Project setup and development tooling | Complete |
| Phase 1 | Card API integration and data models | Complete |
| Phase 2 | Collection management and deck-building services | Complete |
| Phase 3 | User interface, card relationships, combo discovery, and integration | Complete |
| Phase 4 | Structured card effects, advanced simulation, and end-board evaluation | Complete — automated verification passed |
| Phase 5 | AI-assisted deck analysis and recommendations | Planned |

## Current Features

### Phase 1 — Card Database and Collection Management

**Card Database**
- Search Yu-Gi-Oh! cards using the YGOPRODeck API.
- Retrieve card information, descriptions, and images.
- Display card attributes and other available metadata.
- Add cards from search results to a personal collection.
- Display owned card quantities.

**Collection Management**
- Add and remove cards.
- Increase or decrease owned quantities.
- Search, filter, and sort collection entries.
- View collection statistics.
- Compare owned quantities against cards assigned to a deck.
- Identify missing copies needed to complete a deck.
- Persist collection information locally.

### Phase 2 — Deck Building

**Deck Management**
- Create and manage a deck.
- Add and remove cards.
- Increase and decrease card quantities.
- Organize cards into Main, Extra, and Side Decks.
- Display total and unique card counts.
- Rename decks.
- Automatically save and load deck data using browser localStorage.
- Clear a deck with confirmation.

**Deck Validation**
- Validate Main, Extra, and Side Deck sizes.
- Enforce a maximum of three copies across deck sections.
- Apply Advanced Format Forbidden, Limited, and Semi-Limited restrictions.
- Restrict additions based on collection ownership.
- Display deck validation and ownership warnings.

### Phase 3 — User Interface and Deck Analysis

**Application Interface**
- Dedicated Builder, Collection, My Deck, and Analysis pages.
- Responsive card displays and deck editing controls.
- Card search and collection management interfaces.
- Deck summaries, statistics, and validation messages.

**Card Relationships**
- Create and manage relationships between cards.
- Represent relationships using graph structures.
- Explore connected cards and relationship paths.
- Analyze relationships for possible combo interactions.

**Combo Discovery**
- Generate combo candidates from registered card relationships.
- Explore possible card sequences.
- Apply configurable discovery depth.
- Calculate opening-hand probabilities.
- Rank and filter discovered candidates.
- Create saved combo drafts from candidate paths.

**Deck Recommendations**
- Generate rule-based recommendations.
- Analyze deck composition and card relationships.
- Display recommendation priorities and supporting evidence.
- Identify possible deck-building improvements.

### Phase 4 — Structured Effects and Advanced Combo Simulation

Phase 4 introduces a structured simulation foundation for evaluating card interactions, combo sequences, and resulting board states.

**Game-State Management**
- Represent cards across hand, deck, Extra Deck, field, graveyard, and banished zones.
- Track individual physical card instances.
- Maintain synchronized card-instance and field-zone representations.
- Track Normal Summon usage and effect activations.
- Represent turn information and gameplay restrictions.
- Support field-slot positioning and movement.

**Structured Card Effects**
- Define and register structured card effects.
- Validate effect definitions.
- Support effect execution and activation checks.
- Manage registered effect selection.
- Handle supported effect chains and targeting.
- Persist structured effect definitions.
- Provide effect templates and builder utilities.

**Advanced Summoning**
- Support structured summoning operations.
- Track summon materials.
- Represent Xyz Monsters and attached materials.
- Support Xyz Material attachment and detachment.
- Maintain instance synchronization during supported summoning operations.

**Combo Simulation**
- Create and save combo sequences.
- Validate combo requirements.
- Execute supported combo actions.
- Simulate saved combos using tracked card instances.
- Maintain synchronized field states during simulation.
- Report completed steps, errors, and warnings.
- Check whether required end-board cards are present.

**End-Board Analysis**
- Identify monsters and Spell/Trap cards remaining on the field.
- Analyze Xyz Materials.
- Track remaining hand, deck, Extra Deck, graveyard, and banished resources.
- Evaluate Normal Summon availability, effect usage, and restrictions.
- Analyze disruptions using registered effect definitions.
- Calculate heuristic end-board scores.
- Display weighted score breakdowns.

**Scoring Presets**
- Balanced
- Control
- Resources
- Board Presence

These presets allow users to evaluate a board with different strategic priorities.

**Important:** The simulator does not yet implement every official Yu-Gi-Oh! rule. Successful simplified simulations are not proof of complete card-effect or summoning legality.

## Deck Construction Rules

The application currently supports the following deck-size rules:

| Deck Section | Allowed Size |
|---|---|
| Main Deck | 40–60 cards |
| Extra Deck | 0–15 cards |
| Side Deck | 0–15 cards |

Additional restrictions include:

- Maximum three copies of a card across all deck sections.
- Advanced Format banlist copy limits.
- Collection ownership checks.
- Main Deck and Extra Deck card classification.

## Current Architecture

```text
YGOPRODeck API
       |
       v
  Card API Service
       |
       v
    Card Model
       |
       +-----------------------+
       |                       |
       v                       v
 Card Search             Collection Service
       |                       |
       |                       v
       |                  localStorage
       |                       |
       +-----------+-----------+
                   |
                   v
              Deck Service
                   |
         +---------+---------+
         |         |         |
         v         v         v
        Main      Extra     Side
         |         |         |
         +---------+---------+
                   |
                   v
           Deck Validation
                   |
                   v
            Deck Analysis
                   |
        +----------+----------+
        |                     |
        v                     v
 Relationship Graph     Structured Effects
        |                     |
        v                     v
 Combo Discovery        Effect Registry
        |                     |
        +----------+----------+
                   |
                   v
             Combo Simulation
                   |
                   v
             Game State
                   |
         +---------+---------+
         |                   |
         v                   v
    Card Instances       Field State
         |                   |
         +---------+---------+
                   |
                   v
           End-Board Analysis
                   |
         +---------+---------+
         |         |         |
         v         v         v
     Resources  Disruptions  Scoring
         |         |         |
         +---------+---------+
                   |
                   v
          Deck Analysis UI
                   |
                   v
        Phase 5: AI Integration
```

## Project Structure

The following is a high-level overview of the application rather than an exhaustive file listing.

```text
Yu-Gi-Oh-Deck-Builder/
|
+-- client/
|   |
|   +-- docs/
|   |   +-- ARCHITECTURE.md
|   |
|   +-- src/
|   |   |
|   |   +-- assets/
|   |   |
|   |   +-- components/
|   |   |   +-- analysis/
|   |   |   +-- collection/
|   |   |   +-- deck/
|   |   |   +-- combo/
|   |   |
|   |   +-- hooks/
|   |   |
|   |   +-- models/
|   |   |   +-- Card.ts
|   |   |   +-- CollectionCard.ts
|   |   |   +-- Deck.ts
|   |   |   +-- Combo.ts
|   |   |   +-- GameState.ts
|   |   |   +-- EndBoardAnalysis.ts
|   |   |   +-- DisruptionAnalysis.ts
|   |   |   +-- EndBoardScore.ts
|   |   |
|   |   +-- services/
|   |   |   +-- __tests__/
|   |   |   +-- cardApi.ts
|   |   |   +-- collectionService.ts
|   |   |   +-- deckService.ts
|   |   |   +-- comboDiscoveryService.ts
|   |   |   +-- comboSimulationService.ts
|   |   |   +-- trackedComboSimulationService.ts
|   |   |   +-- gameStateService.ts
|   |   |   +-- cardInstanceService.ts
|   |   |   +-- fieldZoneService.ts
|   |   |   +-- fieldInstanceService.ts
|   |   |   +-- endBoardAnalysisService.ts
|   |   |   +-- endBoardScoringService.ts
|   |   |
|   |   +-- App.tsx
|   |   +-- App.css
|   |   +-- index.css
|   |   +-- main.tsx
|   |
|   +-- package.json
|   +-- vite.config.ts
|   +-- vitest.config.ts
|
+-- README.md
```

Additional services handle effect registration, execution, chain simulation, Xyz Materials, recommendations, deck persistence, and analysis.

## Technology Stack

| Category | Technology |
|---|---|
| Frontend | React |
| Language | TypeScript |
| Build Tool | Vite |
| Card Database | YGOPRODeck API |
| Testing | Vitest |
| Code Quality | ESLint |
| Current Persistence | Browser localStorage |
| Planned AI Integration | Server-side LLM API |

## Development Setup

### Prerequisites

- Node.js
- npm
- Git

### Installation

Clone the repository and navigate to the frontend:

```bash
git clone <repository-url>
cd Yu-Gi-Oh-Deck-Builder/client
npm install
```

### Start the Development Server

```bash
npm run dev
```

Vite will display the local development URL.

### Run Tests

```bash
npm test -- --run
```

### Run ESLint

```bash
npm run lint
```

### Build for Production

```bash
npm run build
```

### Run All Verification Checks

```bash
npm run all
```

This runs the project's automated tests, linting, and production build.

## Testing and Verification

The application uses Vitest for automated testing.

Tests cover:

- Card collection and deck management.
- Deck validation and ownership rules.
- Card relationship analysis.
- Combo discovery and candidate generation.
- Combo validation and simulation.
- Game-state and card-instance synchronization.
- Field-zone operations.
- Structured card-effect registration and execution.
- Effect chains and targeting.
- Summoning rules and Xyz Materials.
- End-board analysis and resource evaluation.
- Disruption analysis.
- Weighted end-board scoring.
- UI components and application navigation.
- Persistence and integration behavior.

### Latest Verified Results

Phase 4 completion verification:

| Check | Result |
|---|---|
| Test Files | 82 passed |
| Tests | 661 passed |
| ESLint | Passed |
| TypeScript Compilation | Passed |
| Vite Production Build | Passed |

These results represent the verified development checkpoint, not a guarantee that every possible game interaction has been tested.

## Phase 5 — AI-Assisted Deck Building

**Status: Planned**

Phase 5 will introduce an AI-powered analysis layer using the application's existing deck-building and simulation infrastructure.

Planned capabilities include:

**AI Backend**
- Server-side LLM integration.
- Secure API-key management.
- Provider abstraction and error handling.
- Structured request and response validation.

**Deck-Aware AI Context**
- Current deck composition.
- Owned card collection.
- Deck construction restrictions.
- Registered card relationships.
- Saved combo sequences.
- Simulation results and end-board evaluations.

**AI Deck Recommendations**
- Suggest card additions and removals.
- Explain recommended changes.
- Consider collection ownership.
- Respect deck-size and banlist restrictions.
- Distinguish validated recommendations from unverified AI suggestions.

**AI Combo Assistance**
- Propose potential combo sequences.
- Explain possible interactions.
- Compare possible end boards.
- Use deterministic simulation to check supported actions.
- Report limitations when card-specific effects cannot be verified.

**AI User Interface**
- Dedicated AI assistance workspace.
- Deck analysis summaries.
- Explainable card recommendations.
- Suggested combo lines.
- Validation and warning messages.

The AI system will supplement the existing deterministic engine rather than replace it.

## Current Limitations

- Deck, collection, and related application data are primarily stored locally.
- Card relationship graphs represent registered relationships rather than every possible interaction.
- Combo discovery may reach configured exploration limits on dense graphs.
- The simulation engine supports structured actions but does not fully implement arbitrary card effects.
- Registered disruption analysis requires verified effect definitions.
- Heuristic end-board scores do not guarantee competitive performance.
- AI-assisted recommendations have not yet been implemented.
- The frontend currently produces a bundle-size warning that may benefit from future code splitting.

## Documentation

See [Architecture](client/docs/ARCHITECTURE.md) for an overview of the application's architecture and major services.

## Future Vision

The long-term objective is to create a deck-building assistant that combines:

1. Personal card collection management.
2. Rule-aware deck construction.
3. Structured card-effect analysis.
4. Automated combo discovery and simulation.
5. End-board evaluation.
6. AI-assisted reasoning and explainable recommendations.

The goal is not simply to generate deck lists, but to help players understand **why cards work together, how combos develop, what boards they can produce, and how to improve a deck using the cards they own.**