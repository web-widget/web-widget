#!/usr/bin/env node
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { publint } from 'publint';
import { formatMessage } from 'publint/utils';
import {
  createPublishedPackageJson,
  findPackageJsonPaths,
} from './published-package-manifests.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'web-widget-publint-'));
const excludedDirectories = new Set([
  '.backup',
  '.turbo',
  'coverage',
  'node_modules',
]);

try {
  await Promise.all([
    cp(
      path.join(root, 'package.json'),
      path.join(temporaryRoot, 'package.json')
    ),
    cp(
      path.join(root, 'pnpm-workspace.yaml'),
      path.join(temporaryRoot, 'pnpm-workspace.yaml')
    ),
    cp(path.join(root, 'packages'), path.join(temporaryRoot, 'packages'), {
      recursive: true,
      filter: (source) => !excludedDirectories.has(path.basename(source)),
    }),
  ]);

  const packagePaths = await findPackageJsonPaths(temporaryRoot);
  const packages = [];
  for (const packagePath of packagePaths) {
    const packageJson = JSON.parse(await readFile(packagePath, 'utf8'));
    const published = createPublishedPackageJson(packageJson);
    await writeFile(packagePath, `${JSON.stringify(published, null, 2)}\n`);
    packages.push({
      directory: path.dirname(packagePath),
      packageJson: published,
    });
  }

  const packageDirectories = new Map(
    packages.map(({ directory, packageJson }) => [packageJson.name, directory])
  );
  for (const { directory, packageJson } of packages) {
    const dependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
      ...packageJson.optionalDependencies,
      ...packageJson.peerDependencies,
    };
    for (const [name, version] of Object.entries(dependencies)) {
      const dependencyDirectory = packageDirectories.get(name);
      if (!String(version).startsWith('workspace:') || !dependencyDirectory) {
        continue;
      }
      const linkPath = path.join(directory, 'node_modules', ...name.split('/'));
      await mkdir(path.dirname(linkPath), { recursive: true });
      await symlink(dependencyDirectory, linkPath, 'junction');
    }
  }

  for (const { directory, packageJson } of packages) {
    console.log(`Checking ${packageJson.name}...`);
    const result = await publint({
      pkgDir: directory,
      pack: 'pnpm',
    });
    for (const message of result.messages) {
      console.log(`- ${formatMessage(message, result.pkg)}`);
    }
    if (result.messages.some((message) => message.type === 'error')) {
      process.exitCode = 1;
    }
  }
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
