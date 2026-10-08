
import { useState } from "react";
import type { Card } from "../models/Card";
import type {
  Combo,
  ComboAction,
  ComboCardRequirement,
  ComboZone,
} from "../models/Combo";

interface Props {
  cards: Card[];
  onSave: (combo: Combo) => void;
  editingCombo?: Combo | null;
  onCancel?: () => void;
}

const actions: ComboAction[] = [
  "normal-summon",
  "special-summon",
  "activate-effect",
  "search",
  "send-to-graveyard",
  "add-to-hand",
  "banish",
  "set-card",
  "other",
];

const zones: ComboZone[] = [
  "hand",
  "deck",
  "field",
  "graveyard",
  "banished",
  "extra",
];

function createDraft(): Combo {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    name: "",
    description: "",
    starters: [],
    requirements: [],
    steps: [],
    endBoardCardIds: [],
    createdAt: now,
    updatedAt: now,
  };
}

export default function ComboEditor({
  cards,
  onSave,
  editingCombo,
  onCancel,
}: Props) {
  const [draft, setDraft] = useState<Combo>(
    () => editingCombo ?? createDraft()
  );

  const [selectedCardId, setSelectedCardId] = useState("");
  const [selectedZone, setSelectedZone] =
    useState<ComboZone>("hand");
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  const [stepCardId, setStepCardId] = useState("");
  const [stepAction, setStepAction] =
    useState<ComboAction>("activate-effect");
  const [stepDescription, setStepDescription] = useState("");

  const [endBoardId, setEndBoardId] = useState("");

  function addRequirement(kind: "starters" | "requirements") {
    const cardId = Number(selectedCardId);

    if (!cardId || selectedQuantity < 1) return;

    const requirement: ComboCardRequirement = {
      cardId,
      quantity: selectedQuantity,
      zone: kind === "starters" ? "hand" : selectedZone,
    };

    setDraft((previous) => ({
      ...previous,
      [kind]: [...previous[kind], requirement],
    }));
  }

  function removeRequirement(
    kind: "starters" | "requirements",
    index: number
  ) {
    setDraft((previous) => ({
      ...previous,
      [kind]: previous[kind].filter((_, i) => i !== index),
    }));
  }

  function addStep() {
    if (!stepCardId || !stepDescription.trim()) return;

    setDraft((previous) => ({
      ...previous,
      steps: [
        ...previous.steps,
        {
          id: crypto.randomUUID(),
          order: previous.steps.length + 1,
          cardId: Number(stepCardId),
          action: stepAction,
          description: stepDescription.trim(),
        },
      ],
    }));

    setStepDescription("");
  }

  function removeStep(stepId: string) {
    setDraft((previous) => ({
      ...previous,
      steps: previous.steps
        .filter((step) => step.id !== stepId)
        .map((step, index) => ({
          ...step,
          order: index + 1,
        })),
    }));
  }

  function cardName(id: number): string {
    return cards.find((card) => card.id === id)?.name ??
      `Card ${id}`;
  }

  function renderRequirements(
    kind: "starters" | "requirements"
  ) {
    return (
      <ul>
        {draft[kind].map((item, index) => (
          <li key={`${kind}-${index}`}>
            {cardName(item.cardId)} ×{item.quantity}
            {" "}({item.zone})
            <button
              type="button"
              onClick={() => removeRequirement(kind, index)}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <section className="combo-editor">
      <h3>{editingCombo ? "Edit Combo" : "Create Combo"}</h3>

      <label>
        Combo Name
        <input
          value={draft.name}
          onChange={(event) =>
            setDraft({
              ...draft,
              name: event.target.value,
            })
          }
        />
      </label>

      <label>
        Description
        <textarea
          value={draft.description}
          onChange={(event) =>
            setDraft({
              ...draft,
              description: event.target.value,
            })
          }
        />
      </label>

      <h4>Starting Cards and Requirements</h4>

      <div className="combo-editor-row">
        <select
          aria-label="Requirement card"
          value={selectedCardId}
          onChange={(event) =>
            setSelectedCardId(event.target.value)
          }
        >
          <option value="">Select card</option>
          {cards.map((card) => (
            <option key={card.id} value={card.id}>
              {card.name}
            </option>
          ))}
        </select>

        <input
          aria-label="Required quantity"
          type="number"
          min="1"
          value={selectedQuantity}
          onChange={(event) =>
            setSelectedQuantity(Number(event.target.value))
          }
        />

        <select
          aria-label="Required zone"
          value={selectedZone}
          onChange={(event) =>
            setSelectedZone(event.target.value as ComboZone)
          }
        >
          {zones.map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => addRequirement("starters")}
        >
          Add Starter
        </button>

        <button
          type="button"
          onClick={() => addRequirement("requirements")}
        >
          Add Requirement
        </button>
      </div>

      <h5>Starters (in hand)</h5>
      {renderRequirements("starters")}

      <h5>Additional Requirements</h5>
      {renderRequirements("requirements")}

      <h4>Combo Steps</h4>

      <div className="combo-editor-row">
        <select
          aria-label="Step card"
          value={stepCardId}
          onChange={(event) =>
            setStepCardId(event.target.value)
          }
        >
          <option value="">Select card</option>
          {cards.map((card) => (
            <option key={card.id} value={card.id}>
              {card.name}
            </option>
          ))}
        </select>

        <select
          aria-label="Step action"
          value={stepAction}
          onChange={(event) =>
            setStepAction(event.target.value as ComboAction)
          }
        >
          {actions.map((action) => (
            <option key={action} value={action}>
              {action}
            </option>
          ))}
        </select>
      </div>

      <textarea
        aria-label="Step description"
        placeholder="Describe the action..."
        value={stepDescription}
        onChange={(event) =>
          setStepDescription(event.target.value)
        }
      />

      <button type="button" onClick={addStep}>
        Add Step
      </button>

      <ol>
        {[...draft.steps]
          .sort((a, b) => a.order - b.order)
          .map((step) => (
            <li key={step.id}>
              <strong>{cardName(step.cardId)}</strong>
              {" — "}{step.action}: {step.description}
              <button
                type="button"
                onClick={() => removeStep(step.id)}
              >
                Remove
              </button>
            </li>
          ))}
      </ol>

      <h4>End Board</h4>

      <select
        aria-label="End-board card"
        value={endBoardId}
        onChange={(event) =>
          setEndBoardId(event.target.value)
        }
      >
        <option value="">Select card</option>
        {cards.map((card) => (
          <option key={card.id} value={card.id}>
            {card.name}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => {
          const id = Number(endBoardId);
          if (!id) return;

          setDraft((previous) => ({
            ...previous,
            endBoardCardIds: [
              ...previous.endBoardCardIds,
              id,
            ],
          }));
        }}
      >
        Add End-Board Card
      </button>

      <ul>
        {draft.endBoardCardIds.map((id, index) => (
          <li key={`${id}-${index}`}>
            {cardName(id)}
            <button
              type="button"
              onClick={() =>
                setDraft((previous) => ({
                  ...previous,
                  endBoardCardIds:
                    previous.endBoardCardIds.filter(
                      (_, i) => i !== index
                    ),
                }))
              }
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      <div className="combo-editor-row">
        <button
          type="button"
          onClick={() =>
            onSave({
              ...draft,
              updatedAt: new Date().toISOString(),
            })
          }
        >
          Save Combo
        </button>

        {onCancel && (
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </section>
  );
}
