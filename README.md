# Yu-Gi-Oh Deck Builder

A full-stack Yu-Gi-Oh! deck-building application that helps users build and analyze decks based on the cards they own.

## Project Goals

The application will eventually allow users to:

- Import and manage their Yu-Gi-Oh! card collection
- Search and browse Yu-Gi-Oh! cards
- Build and validate decks
- Analyze deck consistency
- Discover possible combo lines
- Analyze opening hands
- Explore possible end boards
- Receive AI-assisted deck-building suggestions
- Explain combo lines in a human-readable way

## Architecture

The application is divided into a React frontend and a Node.js backend.

```text
React + TypeScript
        |
        | REST API
        v
Node.js + Express
        |
        +-------- PostgreSQL
        |
        +-------- Yu-Gi-Oh! Card API
        |
        +-------- AI Services