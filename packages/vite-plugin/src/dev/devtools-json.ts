import crypto from 'node:crypto';
import fs from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import type { ViteDevServer } from 'vite';

type NextFunction = (err?: unknown) => void;
type ConnectMiddleware = (
  req: IncomingMessage,
  res: ServerResponse,
  next: NextFunction
) => void;

const DEVTOOLS_JSON_PATH = '/.well-known/appspecific/com.chrome.devtools.json';
const CACHE_FILENAME = 'devtools-workspace-uuid';

/**
 * Returns a stable UUID for the project, persisting it in the Vite cache
 * directory so it survives dev server restarts. Chrome DevTools uses this
 * UUID to remember the workspace folder authorization across sessions.
 */
export function getWorkspaceUuid(cacheDir: string): string {
  const uuidFile = path.join(cacheDir, CACHE_FILENAME);
  try {
    if (fs.existsSync(uuidFile)) {
      const existing = fs.readFileSync(uuidFile, 'utf-8').trim();
      if (existing) return existing;
    }
  } catch {
    // ignore read errors — generate a new UUID below
  }

  const uuid = crypto.randomUUID();
  try {
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.writeFileSync(uuidFile, uuid, 'utf-8');
  } catch {
    // If persistence fails (read-only fs, permissions), return an in-memory
    // UUID. It won't survive a restart but is functional for the session.
  }
  return uuid;
}

/**
 * Creates a Connect middleware that responds to Chrome DevTools'
 * `/.well-known/appspecific/com.chrome.devtools.json` request.
 *
 * This enables **Automatic Workspace Folders**: DevTools maps network
 * resources to local source files without manual setup, and AI-assisted
 * CSS edits can be persisted directly to disk.
 *
 * @see https://github.com/ChromeDevTools/vite-plugin-devtools-json
 */
export function createDevToolsJsonMiddleware(
  viteServer: ViteDevServer
): ConnectMiddleware {
  const root = viteServer.config.root;
  const uuid = getWorkspaceUuid(viteServer.config.cacheDir);
  const body = JSON.stringify({
    workspace: { root, uuid },
  });

  return (req, res, next) => {
    const url = req.url ?? '';
    const pathname = url.split('?')[0];
    if (pathname === DEVTOOLS_JSON_PATH) {
      res.setHeader('content-type', 'application/json; charset=utf-8');
      res.setHeader('cache-control', 'no-cache');
      res.end(body);
      return;
    }
    next();
  };
}
