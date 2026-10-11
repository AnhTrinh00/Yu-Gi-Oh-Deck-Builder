import { useState } from "react";

import type { CardEffectDefinition } from "../../models/CardEffect";

import {
  createEffectFromTemplate,
  exportEffectTemplates,
  getBuiltInTemplates,
  importEffectTemplates,
  loadCustomTemplates,
  saveCustomTemplates,
  type CardEffectTemplate,
} from "../../services/cardEffectTemplateService";

interface Props {
  sourceCardId: number;
  currentEffect: CardEffectDefinition;
  onApply: (effect: CardEffectDefinition) => void;
}

const builtIns = getBuiltInTemplates();

export function EffectTemplateManager({
  sourceCardId,
  currentEffect,
  onApply,
}: Props) {
  const [custom, setCustom] = useState<CardEffectTemplate[]>(
    []
  );
  const [loaded, setLoaded] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [selectedId, setSelectedId] = useState(
    builtIns[0]?.id ?? ""
  );
  const [templateName, setTemplateName] = useState("");
  const [importJson, setImportJson] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const templates = [...builtIns, ...custom];

  function message(cause: unknown): string {
    return cause instanceof Error
      ? cause.message
      : "Template operation failed.";
  }

  function initialize(): void {
    if (loaded) return;

    try {
      setCustom(loadCustomTemplates());
      setLoaded(true);
      setError(null);
    } catch (cause) {
      setBlocked(true);
      setError(
        `Saved templates could not be loaded: ${message(cause)}`
      );
    }
  }

  function applyTemplate(): void {
    try {
      const selected = templates.find(
        item => item.id === selectedId
      );

      if (!selected) {
        throw new Error("Select a template first.");
      }

      const id = `${selected.id}-${sourceCardId}-${Date.now()}`;

      onApply(
        createEffectFromTemplate(
          selected,
          sourceCardId,
          id
        )
      );

      setError(null);
    } catch (cause) {
      setError(message(cause));
    }
  }

  function persist(next: CardEffectTemplate[]): void {
    if (blocked) {
      throw new Error(
        "Template storage is blocked until its data is repaired."
      );
    }

    saveCustomTemplates(next);
    setCustom(next);
    setError(null);
  }

  function saveCurrentAsTemplate(): void {
    try {
      const name = templateName.trim();

      if (!name) {
        throw new Error("Enter a template name.");
      }

      const template: CardEffectTemplate = {
        id: `custom-${crypto.randomUUID()}`,
        name,
        description: "Saved from the visual effect builder.",
        effect: structuredClone(currentEffect),
      };

      persist([...custom, template]);
      setTemplateName("");
    } catch (cause) {
      setError(message(cause));
    }
  }

  function removeTemplate(id: string): void {
    try {
      persist(custom.filter(item => item.id !== id));

      if (selectedId === id) {
        setSelectedId(builtIns[0]?.id ?? "");
      }
    } catch (cause) {
      setError(message(cause));
    }
  }

  function importTemplates(): void {
    try {
      const next = importEffectTemplates(
        importJson,
        custom
      );

      persist(next);
      setImportJson("");
      setShowImport(false);
    } catch (cause) {
      setError(message(cause));
    }
  }

  function downloadTemplates(): void {
    const json = exportEffectTemplates(custom);
    const blob = new Blob([json], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = "yugioh-effect-templates.json";
    anchor.click();

    URL.revokeObjectURL(url);
  }

  return (
    <section className="combo-template-manager">
      <h5>Effect Templates</h5>

      {!loaded && !blocked && (
        <button type="button" onClick={initialize}>
          Load Saved Templates
        </button>
      )}

      <p>
        Templates are editable starting points. They do not
        establish official card legality.
      </p>

      <div className="combo-builder-row">
        <label>
          Template
          <select
            value={selectedId}
            onChange={event =>
              setSelectedId(event.target.value)
            }
          >
            <optgroup label="Built-in presets">
              {builtIns.map(template => (
                <option
                  key={template.id}
                  value={template.id}
                >
                  {template.name}
                </option>
              ))}
            </optgroup>

            {custom.length > 0 && (
              <optgroup label="My templates">
                {custom.map(template => (
                  <option
                    key={template.id}
                    value={template.id}
                  >
                    {template.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </label>

        <button type="button" onClick={applyTemplate}>
          Apply Template
        </button>
      </div>

      <p>
        {templates.find(item => item.id === selectedId)
          ?.description}
      </p>

      <div className="combo-builder-row">
        <label>
          Save current effect as template
          <input
            value={templateName}
            onChange={event =>
              setTemplateName(event.target.value)
            }
            placeholder="My searcher effect"
          />
        </label>

        <button
          type="button"
          disabled={!loaded || blocked}
          onClick={saveCurrentAsTemplate}
        >
          Save Template
        </button>
      </div>

      {custom.length > 0 && (
        <div className="combo-template-list">
          {custom.map(template => (
            <div
              className="combo-builder-row"
              key={template.id}
            >
              <span>{template.name}</span>

              <button
                type="button"
                disabled={blocked}
                onClick={() =>
                  removeTemplate(template.id)
                }
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="combo-effect-actions">
        <button
          type="button"
          disabled={!loaded || blocked}
          onClick={downloadTemplates}
        >
          Export My Templates
        </button>

        <button
          type="button"
          disabled={!loaded || blocked}
          onClick={() =>
            setShowImport(value => !value)
          }
        >
          Import Templates
        </button>
      </div>

      {showImport && (
        <div>
          <label htmlFor="template-import-json">
            Paste template JSON
          </label>

          <textarea
            id="template-import-json"
            rows={8}
            value={importJson}
            onChange={event =>
              setImportJson(event.target.value)
            }
          />

          <button
            type="button"
            onClick={importTemplates}
          >
            Import
          </button>
        </div>
      )}

      {error && <p role="alert">{error}</p>}
    </section>
  );
}