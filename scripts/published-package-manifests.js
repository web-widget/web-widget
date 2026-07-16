import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

function omitDevelopmentConditions(value) {
  if (Array.isArray(value)) return value.map(omitDevelopmentConditions);
  if (value === null || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== 'development')
      .map(([key, child]) => [key, omitDevelopmentConditions(child)])
  );
}

export function createPublishedPackageJson(packageJson) {
  const published = structuredClone(packageJson);
  if (published.exports !== undefined) {
    published.exports =
      published.publishConfig?.exports ??
      omitDevelopmentConditions(published.exports);
  }
  return published;
}

export async function findPackageJsonPaths(root) {
  const packagesDir = path.join(root, 'packages');
  const entries = await readdir(packagesDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(packagesDir, entry.name, 'package.json'));
}

export async function withPublishedPackageManifests(packagePaths, callback) {
  const originals = new Map();
  try {
    for (const packagePath of packagePaths) {
      const original = await readFile(packagePath, 'utf8');
      originals.set(packagePath, original);
      const packageJson = JSON.parse(original);
      const published = createPublishedPackageJson(packageJson);
      await writeFile(packagePath, `${JSON.stringify(published, null, 2)}\n`);
    }
    return await callback();
  } finally {
    await Promise.all(
      [...originals].map(([packagePath, original]) =>
        writeFile(packagePath, original)
      )
    );
  }
}
