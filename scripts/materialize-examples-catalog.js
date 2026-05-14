#!/usr/bin/env node

/**
 * Materialize pnpm workspace catalog versions into examples' package.json files.
 *
 * Online sandboxes often clone only examples/ and cannot resolve "catalog:".
 * The monorepo still uses catalog: elsewhere; this script keeps examples in sync.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const workspaceYamlPath = path.join(rootDir, 'pnpm-workspace.yaml');
const examplesDir = path.join(rootDir, 'examples');

const DEP_FIELDS = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
];

/**
 * @param {string} text
 * @returns {Record<string, string>}
 */
function parseWorkspaceCatalog(text) {
  const lines = text.split(/\r?\n/);
  let i = lines.findIndex((line) => /^\s*catalog\s*:\s*$/.test(line));
  if (i === -1) {
    throw new Error(`Missing top-level "catalog:" in ${workspaceYamlPath}`);
  }

  const catalogLine = lines[i];
  const baseIndent =
    (catalogLine.match(/^(\s*)catalog\s*:/) ?? ['', ''])[1].length + 2;
  const catalog = {};

  for (i++; i < lines.length; i++) {
    const raw = lines[i];
    if (raw.trim() === '') continue;

    const indentMatch = raw.match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[1].length : 0;
    if (indent < baseIndent) break;

    const t = raw.trim();
    const colon = t.indexOf(':');
    if (colon === -1) break;

    let key = t.slice(0, colon).trim();
    let value = t.slice(colon + 1).trim();
    if (
      (key.startsWith("'") && key.endsWith("'")) ||
      (key.startsWith('"') && key.endsWith('"'))
    ) {
      key = key.slice(1, -1);
    }
    if (
      (value.startsWith("'") && value.endsWith("'")) ||
      (value.startsWith('"') && value.endsWith('"'))
    ) {
      value = value.slice(1, -1);
    }
    catalog[key] = value;
  }

  return catalog;
}

/**
 * @param {string} dir
 * @returns {string[]}
 */
function listExamplePackageJsonPaths(dir) {
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(dir, d.name, 'package.json'))
    .filter((p) => fs.existsSync(p));
}

function main() {
  const checkOnly = process.argv.includes('--check');

  const catalog = parseWorkspaceCatalog(
    fs.readFileSync(workspaceYamlPath, 'utf8')
  );
  const paths = listExamplePackageJsonPaths(examplesDir);

  if (paths.length === 0) {
    console.warn('No examples/*/package.json found.');
    return;
  }

  let changed = 0;

  for (const pkgPath of paths) {
    const raw = fs.readFileSync(pkgPath, 'utf8');
    const pkg = JSON.parse(raw);
    let touched = false;

    for (const field of DEP_FIELDS) {
      const deps = pkg[field];
      if (!deps || typeof deps !== 'object') continue;

      for (const name of Object.keys(deps)) {
        if (!Object.hasOwn(catalog, name)) continue;

        const next = catalog[name];
        if (deps[name] !== next) {
          deps[name] = next;
          touched = true;
        }
      }
    }

    if (touched) {
      changed++;
      const out = JSON.stringify(pkg, null, 2) + '\n';
      if (checkOnly) {
        console.error(`Would update ${path.relative(rootDir, pkgPath)}`);
      } else {
        fs.writeFileSync(pkgPath, out);
        console.log(`Updated ${path.relative(rootDir, pkgPath)}`);
      }
    }
  }

  if (checkOnly && changed > 0) {
    console.error(
      `\n${changed} file(s) out of date — run: pnpm examples-catalog:materialize`
    );
    process.exit(1);
  }

  if (!checkOnly && changed === 0) {
    console.log('examples package.json files already match catalog.');
  }
}

main();
