
import type {
  CardInstanceSelection,
} from "./CardSelection";

export interface EffectExecutionSelections {
  costSelections: CardInstanceSelection[];
  resolutionSelections: CardInstanceSelection[];
}

export function createEmptyEffectSelections():
  EffectExecutionSelections {
  return {
    costSelections: [],
    resolutionSelections: [],
  };
}
