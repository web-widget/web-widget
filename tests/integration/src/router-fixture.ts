import { spawn, type ChildProcess } from 'node:child_process';
import {
  copyFile,
  cp,
  mkdtemp,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { TestInfo } from '@playwright/test';

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);
const workspaceRoot = path.resolve(packageRoot, '../..');
const fixtureSourceRoot = path.join(packageRoot, 'fixtures/shadow-router');
const viteCli = path.resolve(
  path.dirname(fileURLToPath(import.meta.resolve('vite'))),
  '../../bin/vite.js'
);

export interface RouterFixture {
  baseURL: string;
  logs: string[];
  mode: 'dev' | 'production';
  process: ChildProcess;
  root: string;
  stop(): Promise<void>;
}

async function availablePort(): Promise<number> {
  const server = net.createServer();
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  );
  return port;
}

async function terminate(process: ChildProcess): Promise<void> {
  if (process.exitCode !== null) return;
  process.kill('SIGTERM');
  const exited = new Promise<void>((resolve) =>
    process.once('exit', () => resolve())
  );
  const forced = new Promise<void>((resolve) =>
    setTimeout(() => {
      if (process.exitCode === null) process.kill('SIGKILL');
      resolve();
    }, 3_000)
  );
  await Promise.race([exited, forced]);
  if (process.exitCode === null) await exited;
}

async function createRouterCopy(): Promise<string> {
  // Vite resolves macOS' /var symlink to /private/var before checking
  // server.fs.allow. Keep the fixture root canonical so client CSS transforms
  // are not rejected as if the copied file did not exist.
  const root = await realpath(
    await mkdtemp(path.join(os.tmpdir(), 'web-widget-router-'))
  );
  await Promise.all([
    cp(path.join(fixtureSourceRoot, 'routes'), path.join(root, 'routes'), {
      recursive: true,
    }),
    cp(path.join(fixtureSourceRoot, 'styles'), path.join(root, 'styles'), {
      recursive: true,
    }),
    cp(path.join(fixtureSourceRoot, 'widgets'), path.join(root, 'widgets'), {
      recursive: true,
    }),
    ...[
      'entry.client.ts',
      'entry.server.ts',
      'importmap.client.json',
      'package.json',
      'routemap.server.json',
      'server.js',
      'tsconfig.json',
      'vite.config.ts',
    ].map((file) =>
      copyFile(path.join(fixtureSourceRoot, file), path.join(root, file))
    ),
  ]);
  await symlink(
    path.join(packageRoot, 'node_modules'),
    path.join(root, 'node_modules')
  );
  return root;
}

function collectLogs(process: ChildProcess, logs: string[]) {
  process.stdout?.on('data', (chunk) => logs.push(String(chunk)));
  process.stderr?.on('data', (chunk) => logs.push(String(chunk)));
}

async function buildRouter(root: string, logs: string[]) {
  const process = spawn(globalThis.process.execPath, [viteCli, 'build'], {
    cwd: root,
    env: {
      ...globalThis.process.env,
      NO_COLOR: '1',
      WEB_WIDGET_WORKSPACE_ROOT: workspaceRoot,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  collectLogs(process, logs);
  const exitCode = await new Promise<number | null>((resolve) =>
    process.once('exit', resolve)
  );
  if (exitCode !== 0) {
    throw new Error(
      `Router fixture build failed (${exitCode})\n${logs.join('')}`
    );
  }
}

async function waitForServer(
  baseURL: string,
  process: ChildProcess,
  logs: string[]
) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (process.exitCode !== null) {
      throw new Error(
        `Router fixture exited early (${process.exitCode})\n${logs.join('')}`
      );
    }
    try {
      const response = await fetch(`${baseURL}/shadow-dom-ssr`);
      if (response.ok) return;
    } catch {
      // The listener can be ready before the route graph has warmed up.
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Router fixture timed out\n${logs.join('')}`);
}

export async function startRouterFixture(
  mode: RouterFixture['mode']
): Promise<RouterFixture> {
  const temporary = mode === 'dev';
  const root = temporary ? await createRouterCopy() : fixtureSourceRoot;
  const logs: string[] = [];
  try {
    if (mode === 'production') await buildRouter(root, logs);
    const port = await availablePort();
    const baseURL = `http://127.0.0.1:${port}`;
    const args =
      mode === 'production'
        ? [path.join(root, 'server.js')]
        : [
            viteCli,
            '--host',
            '127.0.0.1',
            '--port',
            String(port),
            '--strictPort',
          ];
    const process = spawn(globalThis.process.execPath, args, {
      cwd: root,
      env: {
        ...globalThis.process.env,
        NO_COLOR: '1',
        PORT: String(port),
        WEB_WIDGET_WORKSPACE_ROOT: workspaceRoot,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    collectLogs(process, logs);
    await waitForServer(baseURL, process, logs);

    let stopped = false;
    return {
      baseURL,
      logs,
      mode,
      process,
      root,
      async stop() {
        if (stopped) return;
        stopped = true;
        await terminate(process);
        if (temporary) await rm(root, { force: true, recursive: true });
      },
    };
  } catch (error) {
    if (temporary) await rm(root, { force: true, recursive: true });
    throw error;
  }
}

export async function mutateRouterSource(
  fixture: RouterFixture,
  relativePath: string,
  update: (source: string) => string
) {
  const file = path.join(fixture.root, relativePath);
  const source = await readFile(file, 'utf8');
  const next = update(source);
  if (next === source)
    throw new Error(`Mutation did not change ${relativePath}`);
  await writeFile(file, next);
}

export async function withRouterFixture<T>(
  mode: RouterFixture['mode'],
  run: (fixture: RouterFixture) => Promise<T>,
  testInfo?: TestInfo
): Promise<T> {
  const fixture = await startRouterFixture(mode);
  try {
    return await run(fixture);
  } finally {
    if (testInfo) {
      await testInfo.attach(`router-${mode}.log`, {
        body: Buffer.from(fixture.logs.join('')),
        contentType: 'text/plain',
      });
    }
    await fixture.stop();
  }
}
