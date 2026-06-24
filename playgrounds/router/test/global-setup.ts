import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const playgroundRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);

export default function globalSetup() {
  execSync('pnpm run build', {
    cwd: playgroundRoot,
    stdio: 'inherit',
    env: process.env,
  });
}
