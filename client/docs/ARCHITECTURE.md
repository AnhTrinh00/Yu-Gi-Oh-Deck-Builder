# Yu-Gi-Oh! Deck Builder — Architecture

## Overview

The Yu-Gi-Oh! Deck Builder is a React and TypeScript application that helps players manage owned cards, construct decks, analyze card relationships, and explore possible combos.

The application currently uses client-side state management and localStorage for deck and collection persistence.

## Technology Stack

- React
- TypeScript
- Vite
- Vitest
- React Router
- YGOPRODeck API
- Browser localStorage

## Application Pages

### Builder

Search the card database, view card information, add cards to the collection, and build decks.

### Collection

Browse owned cards, adjust quantities, filter by card properties, and compare ownership with current deck usage.

### My Deck

Manage Main, Extra, and Side Deck cards, edit the deck name, review deck construction rules, and inspect collection compatibility.

### Analysis

Analyze deck composition, card relationships, saved combos, and advanced deck-building information.

## Core Services

### Card and Collection Services

Responsible for card retrieval, collection management, statistics, filtering, and persistence.

### Deck Services

Responsible for deck creation, card addition and removal, deck construction rules, and persistence.

The deck-addition policy checks whether the user is permitted to add a card, considering ownership, section compatibility, deck limits, and format restrictions.

The ownership validation service detects cases where a deck contains more copies than the collection provides.

### Relationship Services

Represent card relationships, maintain relationship data, construct relationship graphs, and support graph analysis and path discovery.

### Combo Services

Represent saved combos and support candidate discovery, validation, probability calculations, and simulation.

### Analysis and Recommendation Services

Analyze deck composition and available card relationships to produce summaries and recommendation candidates.

These systems provide a foundation for future automated combo reasoning.

## Data Flow

Card API → Card Model → Collection and Deck → Relationship and Combo Analysis → Recommendations

Collection and deck changes update application state, which is then reflected in the relevant page components.

## Testing

The application uses Vitest for unit, component, and integration tests.

Current coverage includes deck construction, ownership validation, relationships, combos, statistics, persistence, and route-rendering tests.

## Future Architecture

Phase 4 will extend the analysis system with structured card effects, combo actions, game-state transitions, and more sophisticated combo exploration.

Future AI integration should use validated structured data rather than relying exclusively on generated text to determine whether a combo is legal.