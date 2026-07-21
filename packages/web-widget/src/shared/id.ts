let nextId = 0;
const allocatedIds = new Set<string>();

/** Resolves a user ID or creates a short ID that is not already allocated. */
export function resolveWebWidgetId(id?: string): string {
  if (id !== undefined) {
    allocatedIds.add(id);
    return id;
  }

  let generatedId: string;
  do {
    generatedId = `w${(nextId++).toString(36)}`;
  } while (
    allocatedIds.has(generatedId) ||
    (typeof document !== 'undefined' &&
      document.getElementById(generatedId) !== null)
  );
  allocatedIds.add(generatedId);
  return generatedId;
}
