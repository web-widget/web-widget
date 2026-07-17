import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { FixtureServer } from './server-fixture';

async function watcherVersion(
  server: FixtureServer,
  relativePath: string
): Promise<number> {
  const url = new URL('/__integration/watcher', server.baseURL);
  url.searchParams.set('file', relativePath);
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(`Watcher endpoint returned ${response.status}`);
  return ((await response.json()) as { version: number }).version;
}

export async function mutateSource(
  server: FixtureServer,
  relativePath: string,
  update: (source: string) => string
): Promise<void> {
  const file = path.join(server.root, relativePath);
  const before = await watcherVersion(server, relativePath);
  const source = await readFile(file, 'utf8');
  const next = update(source);
  if (next === source)
    throw new Error(`Mutation did not change ${relativePath}`);
  await writeFile(file, next);

  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    if ((await watcherVersion(server, relativePath)) > before) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`Vite watcher did not observe ${relativePath}`);
}
