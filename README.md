# Yu-Gi-Oh! Deck Builder

A web application designed to help Yu-Gi-Oh! players build decks using the cards they currently own.

The long-term goal is to combine card collection management, deck construction, combo analysis, and AI-assisted deck building into one application.

## Project Goals

The application will eventually allow users to:

- Search the Yu-Gi-Oh! card database
- Manage their personal card collection
- Track how many copies of each card they own
- Build Main, Extra, and Side Decks
- Build decks using only cards in their collection
- Validate deck construction rules
- Analyze possible card combinations and combo lines
- Identify possible end boards
- Provide AI-assisted deck-building recommendations

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