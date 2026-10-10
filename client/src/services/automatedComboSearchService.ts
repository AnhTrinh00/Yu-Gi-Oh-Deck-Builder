
import type { CardEffectDefinition } from "../models/CardEffect";
import type { GameState } from "../models/GameState";
import type {
  ComboSearchAction,
  ComboSearchOptions,
  ComboSearchResult,
  ComboSearchStats,
  DiscoveredCombo,
} from "../models/ComboSearch";

import {
  generateComboCandidates,
} from "./comboCandidateGenerationService";

import {
  generateSelectionBranches,
} from "./comboSelectionBranchService";

import {
  getComboStateFingerprint,
} from "./comboStateFingerprintService";

import {
  executeRegisteredEffectWithSelections,
} from "./registeredEffectSelectionService";

import {
  validateCardInstanceSync,
} from "./cardInstanceService";

import {
  isFieldSynchronized,
} from "./fieldZoneService";

export interface SearchEffectRegistry {
  get(effectId: string): CardEffectDefinition | undefined | null;
  getAll(): CardEffectDefinition[];
}

interface SearchNode {
  state: GameState;
  actions: ComboSearchAction[];
  depth: number;
}

const DEFAULTS = {
  maxDepth: 4,
  maxNodes: 500,
  maxResults: 100,
  maxCandidatesPerNode: 50,
  maxSelectionBranches: 32,
};

function bounded(
  value: number | undefined,
  fallback: number,
  maximum: number
): number {
  if (value === undefined) return fallback;

  if (!Number.isFinite(value)) return fallback;

  return Math.min(
    maximum,
    Math.max(0, Math.floor(value))
  );
}

function validateSearchState(
  state: GameState
): string[] {
  const errors: string[] = [];

  if (!state.cardInstances) {
    errors.push("Card-instance tracking is required.");
  }

  if (!state.fieldState) {
    errors.push("Field tracking is required.");
  }

  if (!state.turnState) {
    errors.push("Turn tracking is required.");
  }

  if (!state.effectUsage) {
    errors.push("Effect usage tracking is required.");
  }

  if (errors.length > 0) return errors;

  errors.push(...validateCardInstanceSync(state));

  if (!isFieldSynchronized(state)) {
    errors.push("Field state is not synchronized.");
  }

  return errors;
}

function collectCandidates(
  state: GameState,
  registry: SearchEffectRegistry,
  maxCandidates: number,
  includeExperimental: boolean
): {
  effects: CardEffectDefinition[];
  truncated: boolean;
} {
  // First perform preliminary filtering.
  // Request all effects so selection-required
  // candidates are not lost to the limit.
  const generated = generateComboCandidates(
    state,
    registry,
    {
      maxCandidates: registry.getAll().length,
      includeExperimental,
    }
  );

  const candidateIds = new Set(
    generated.candidates.map(c => c.effectId)
  );

  // Phase 4.5.1 rejects ambiguous selections.
  // Phase 4.5.3 can now expand those candidates.
  for (const rejection of generated.rejected) {
    if (
      rejection.reason ===
      "Effect requires an explicit card-instance selection."
    ) {
      candidateIds.add(rejection.effectId);
    }
  }

  const sortedIds = [...candidateIds].sort();

  return {
    effects: sortedIds
      .slice(0, maxCandidates)
      .map(id => registry.get(id))
      .filter(
        (effect): effect is CardEffectDefinition =>
          effect !== undefined && effect !== null
      ),
    truncated:
      generated.truncated ||
      sortedIds.length > maxCandidates,
  };
}

export function discoverCombos(
  initialState: GameState,
  registry: SearchEffectRegistry,
  options: ComboSearchOptions = {}
): ComboSearchResult {
  const maxDepth = bounded(
    options.maxDepth,
    DEFAULTS.maxDepth,
    20
  );

  const maxNodes = bounded(
    options.maxNodes,
    DEFAULTS.maxNodes,
    10000
  );

  const maxResults = bounded(
    options.maxResults,
    DEFAULTS.maxResults,
    5000
  );

  const maxCandidates = bounded(
    options.maxCandidatesPerNode,
    DEFAULTS.maxCandidatesPerNode,
    500
  );

  const maxBranches = bounded(
    options.maxSelectionBranches,
    DEFAULTS.maxSelectionBranches,
    500
  );

  const warnings: string[] = [];

  const stats: ComboSearchStats = {
    exploredNodes: 0,
    generatedTransitions: 0,
    successfulTransitions: 0,
    rejectedTransitions: 0,
    duplicateStates: 0,
    truncated: false,
  };

  const combos: DiscoveredCombo[] = [];

  const initialErrors = validateSearchState(
    initialState
  );

  if (initialErrors.length > 0) {
    return {
      initialState,
      combos,
      stats,
      warnings: initialErrors,
    };
  }

  const visited = new Set<string>([
    getComboStateFingerprint(initialState),
  ]);

  const queue: SearchNode[] = [{
    state: structuredClone(initialState),
    actions: [],
    depth: 0,
  }];

  let head = 0;

  while (head < queue.length) {
    if (stats.exploredNodes >= maxNodes) {
      stats.truncated = true;
      break;
    }

    if (combos.length >= maxResults) {
      stats.truncated = true;
      break;
    }

    const node = queue[head++];

    stats.exploredNodes++;

    if (node.depth >= maxDepth) continue;

    const generated = collectCandidates(
      node.state,
      registry,
      maxCandidates,
      options.includeExperimental ?? false
    );

    if (generated.truncated) {
      stats.truncated = true;
    }

    for (const effect of generated.effects) {
      const branches = generateSelectionBranches(
        node.state,
        effect,
        maxBranches
      );

      for (const selections of branches) {
        stats.generatedTransitions++;

        const execution =
          executeRegisteredEffectWithSelections(
            node.state,
            registry,
            effect.id,
            selections
          );

        if (!execution.success) {
          stats.rejectedTransitions++;
          continue;
        }

        const nextState = execution.state;

        const syncErrors = validateSearchState(
          nextState
        );

        if (syncErrors.length > 0) {
          stats.rejectedTransitions++;
          continue;
        }

        stats.successfulTransitions++;

        const stateKey =
          getComboStateFingerprint(nextState);

        if (visited.has(stateKey)) {
          stats.duplicateStates++;
          continue;
        }

        visited.add(stateKey);

        const action: ComboSearchAction = {
          id: `candidate:${effect.id}`,
          effectId: effect.id,
          sourceCardId: effect.sourceCardId,
          description: effect.label,
          selections: structuredClone(selections),
        };

        const actions = [
          ...node.actions,
          action,
        ];

        combos.push({
          id: `combo-${combos.length + 1}`,
          actions,
          finalState: nextState,
          depth: actions.length,
          stateKey,
        });

        if (combos.length >= maxResults) {
          stats.truncated = true;
          break;
        }

        if (node.depth + 1 < maxDepth) {
          if (queue.length >= maxNodes) {
            stats.truncated = true;
          } else {
            queue.push({
              state: nextState,
              actions,
              depth: node.depth + 1,
            });
          }
        }
      }

      if (combos.length >= maxResults) break;
    }
  }

  if (stats.truncated) {
    warnings.push(
      "Search limits were reached; results may be incomplete."
    );
  }

  warnings.push(
    "Discovered combos are validated by the registered-effect executor, not by a complete Yu-Gi-Oh! rules engine."
  );

  return {
    initialState: structuredClone(initialState),
    combos,
    stats,
    warnings,
  };
}
