/**
 * Monotonic revision bumped when server entry/routemap modules are invalidated.
 * Used only to bust the WebRouter instance cache in dev middleware — not for CSS meta.
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
