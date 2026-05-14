import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const rootDir = path.resolve(__dirname, '..', '..');

/**
 * @param {string} cwd
 * @param {string} cmd
 * @param {import('child_process').ExecSyncOptions} [opts]
 */
export function sh(cmd, cwd = rootDir, opts = {}) {
  execSync(cmd, { stdio: 'inherit', cwd, ...opts });
}

/**
 * @returns {string[]}
 */
export function stagedPaths() {
  const out = execSync('git diff --cached --name-only -z', {
    encoding: 'utf8',
    cwd: rootDir,
  });
  return out ? out.split('\0').filter(Boolean) : [];
}

/**
 * Changed files between ORIG_HEAD and HEAD (post-merge).
 * @returns {string[]}
 */
export function mergeChangedPaths() {
  try {
    const out = execSync(
      'git diff-tree -r --name-only --no-commit-id ORIG_HEAD HEAD -z',
      { encoding: 'utf8', cwd: rootDir }
    );
    return out ? out.split('\0').filter(Boolean) : [];
  } catch {
    return [];
  }
}

/**
 * @returns {string[]}
 */
export function examplePackageJsonRelPaths() {
  const examplesDir = path.join(rootDir, 'examples');
  if (!fs.existsSync(examplesDir)) return [];

  return fs
    .readdirSync(examplesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join('examples', d.name, 'package.json'))
    .filter((rel) => fs.existsSync(path.join(rootDir, rel)));
}
