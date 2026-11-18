import { useRef, useState } from "react";
import {
  exportWorkspaceBackup,
  parseWorkspaceBackup,
  restoreWorkspaceBackup,
} from "../../services/persistence/workspaceBackupService";
import { waitForPersonalWrites } from "../../services/persistence/personalWriteQueue";

interface Props {
  beforeBackup: () => Promise<void>;
  beforeRestore: () => Promise<void>;
}

export default function WorkspaceBackupPanel({ beforeBackup, beforeRestore }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setBusy(true);
    setError(null);
    try {
      await beforeBackup();
      await waitForPersonalWrites();
      const json = await exportWorkspaceBackup();
      const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
      try {
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `yugioh-deck-builder-backup-${new Date().toISOString().slice(0, 10)}.json`;
        anchor.click();
      } finally { window.setTimeout(() => URL.revokeObjectURL(url), 0); }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Backup failed.");
    } finally { setBusy(false); }
  }

  async function importFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      if (file.size > 50_000_000) throw new Error("Backup file is too large.");
      const json = await file.text();
      // Validate before presenting a destructive confirmation.
      const backup = parseWorkspaceBackup(json);
      if (!window.confirm(
        `Replace ALL existing decks and personal data with backup from ${backup.exportedAt}? This cannot be undone without a separate backup.`
      )) return;
      await beforeRestore();
      await waitForPersonalWrites();
      await restoreWorkspaceBackup(json);
      window.location.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Restore failed.");
    } finally {
      if (fileInput.current) fileInput.current.value = "";
      setBusy(false);
    }
  }

  return (
    <section aria-label="Workspace backup and restore" className="workspace-backup-panel">
      <h3>Backup and Restore</h3>
      <p>Export your decks, collection, combos, custom effects, templates, and relationships to a JSON file. Restoring replaces the entire workspace.</p>
      <button type="button" disabled={busy} onClick={() => void download()}>Download Workspace Backup</button>{" "}
      <button type="button" disabled={busy} onClick={() => fileInput.current?.click()}>Restore Backup</button>
      <input type="file" ref={fileInput} accept="application/json,.json" hidden aria-label="Select workspace backup"
        onChange={event => {
          const file = event.target.files?.[0];
          if (file) void importFile(file);
        }} />
      {busy && <p role="status">Processing workspace data...</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
