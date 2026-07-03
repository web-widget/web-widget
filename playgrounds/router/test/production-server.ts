import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getAvailablePort } from './get-available-port';

const playgroundRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);

async function waitForServer(serverOrigin: string, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${serverOrigin}/`);
      if (response.ok) {
        return;
      }
    } catch {
      // Server still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(`Production server did not become ready at ${serverOrigin}`);
}

export type ProductionServer = {
  origin: string;
  stop: () => void;
};

export async function startProductionServer(): Promise<ProductionServer> {
  const port = await getAvailablePort();
  const origin = `http://127.0.0.1:${port}`;

  const serverProcess: ChildProcessWithoutNullStreams = spawn(
    process.execPath,
    ['server.js'],
    {
      cwd: playgroundRoot,
      env: {
        ...process.env,
        PORT: String(port),
      },
      stdio: 'pipe',
    }
  );

  serverProcess.stderr.on('data', (chunk: Buffer) => {
    const message = chunk.toString();
    if (/EADDRINUSE|Error/i.test(message)) {
      console.error(message);
    }
  });

  await waitForServer(origin);

  return {
    origin,
    stop() {
      if (!serverProcess.killed) {
        serverProcess.kill('SIGTERM');
      }
    },
  };
}
