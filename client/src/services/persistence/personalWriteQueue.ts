/**
 * Serializes personal-data writes across the application. A rejected write
 * is reported to its caller and does not poison the next operation.
 */
let tail: Promise<void> = Promise.resolve();

export function enqueuePersonalWrite<T>(operation: () => Promise<T>): Promise<T> {
  const pending = tail.then(operation);
  tail = pending.then(() => undefined, () => undefined);
  return pending;
}

export async function waitForPersonalWrites(): Promise<void> {
  await tail;
}
