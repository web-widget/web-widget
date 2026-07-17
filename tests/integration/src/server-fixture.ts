import { spawn, type ChildProcess } from 'node:child_process';
import { copyFile, cp, mkdtemp, readFile, rm, symlink } from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { TestInfo } from '@playwright/test';

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);
const viteCli = path.resolve(
  path.dirname(fileURLToPath(import.meta.resolve('vite'))),
  '../../bin/vite.js'
);

export interface FixtureServer {
  baseURL: string;
  logs: string[];
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

async function createFixtureCopy(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'web-widget-integration-'));
  await copyFile(
    path.join(packageRoot, 'index.html'),
    path.join(root, 'index.html')
  );
  await copyFile(
    path.join(packageRoot, 'vite.config.ts'),
    path.join(root, 'vite.config.ts')
  );
  await symlink(
    path.join(packageRoot, 'node_modules'),
    path.join(root, 'node_modules')
  );
  await cp(path.join(packageRoot, 'src'), path.join(root, 'src'), {
    recursive: true,
  });
  return root;
}

async function waitForHealth(
  baseURL: string,
  process: ChildProcess,
  logs: string[]
): Promise<void> {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (process.exitCode !== null) {
      throw new Error(
        `Fixture server exited early (${process.exitCode})\n${logs.join('')}`
      );
    }
    try {
      const response = await fetch(`${baseURL}/__integration/health`);
      if (response.ok && (await response.json()).ready === true) return;
    } catch {
      // The process can be alive before its HTTP listener is ready.
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`Fixture server health check timed out\n${logs.join('')}`);
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

export async function startFixtureServer(): Promise<FixtureServer> {
  const root = await createFixtureCopy();
  const port = await availablePort();
  const baseURL = `http://127.0.0.1:${port}`;
  const logs: string[] = [];
  const child = spawn(
    process.execPath,
    [viteCli, '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
    {
      cwd: root,
      env: { ...process.env, NO_COLOR: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );
  child.stdout?.on('data', (chunk) => logs.push(String(chunk)));
  child.stderr?.on('data', (chunk) => logs.push(String(chunk)));

  try {
    await waitForHealth(baseURL, child, logs);
  } catch (error) {
    await terminate(child);
    await rm(root, { force: true, recursive: true });
    throw error;
  }

  let stopped = false;
  return {
    baseURL,
    logs,
    process: child,
    root,
    async stop() {
      if (stopped) return;
      stopped = true;
      await terminate(child);
      await rm(root, { force: true, recursive: true });
    },
  };
}

export async function withFixtureServer<T>(
  run: (server: FixtureServer) => Promise<T>,
  testInfo?: TestInfo
): Promise<T> {
  const server = await startFixtureServer();
  try {
    return await run(server);
  } finally {
    if (testInfo) {
      await testInfo.attach('fixture-server.log', {
        body: Buffer.from(server.logs.join('')),
        contentType: 'text/plain',
      });
    }
    await server.stop();
  }
}

export async function readSourceFixture(relativePath: string): Promise<string> {
  return readFile(path.join(packageRoot, relativePath), 'utf8');
}
