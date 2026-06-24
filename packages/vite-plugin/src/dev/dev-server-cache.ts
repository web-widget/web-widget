/**
 * Monotonic revision bumped when server dev modules are invalidated (HMR / routemap).
 * Used to bust WebRouter and getMeta caches without per-request reload.
 */
let revision = 0;

export function getDevServerRevision(): number {
  return revision;
}

export function bumpDevServerRevision(): void {
  revision++;
}

export function resetDevServerRevisionForTests(): void {
  revision = 0;
}
