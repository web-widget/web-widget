/**
 * Whether a routemap scan should run invalidation after filesystem events.
 * JSON may round-trip (e.g. rename index@route -> index2@route -> index@route)
 * while module graph and client CSS state still need a refresh.
 */
export function shouldApplyRoutemapUpdate(
  newJson: string,
  cachedJson: string | undefined,
  filesystemDirty: boolean
): boolean {
  if (cachedJson === undefined) {
    return true;
  }
  return newJson !== cachedJson || filesystemDirty;
}

/** Whether the browser should full-reload after a routemap update. */
export function shouldClientFullReload(
  structural: boolean,
  filesystemDirty: boolean
): boolean {
  return structural || filesystemDirty;
}
