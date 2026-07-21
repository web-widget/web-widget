import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);
const distRoot = path.resolve(
  packageRoot,
  process.env.INTEGRATION_DIST_DIR ?? 'dist'
);
const root = path.join(distRoot, 'client');
const template = await readFile(path.join(root, 'index.html'), 'utf8');
const { renderRequest } = await import(
  new URL('../dist/server/entry.server.js', import.meta.url)
);
const host = process.env.HOST ?? '127.0.0.1';
const port = Number(process.env.PORT ?? 4174);

const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
]);

function send(
  response,
  status,
  body,
  contentType = 'text/plain; charset=utf-8',
  headers = {}
) {
  response.writeHead(status, {
    'content-length': Buffer.byteLength(body),
    'content-type': contentType,
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    ...headers,
  });
  response.end(body);
}

async function fileInfo(file) {
  try {
    const info = await stat(file);
    return info.isFile() ? info : undefined;
  } catch {
    return undefined;
  }
}

const server = createServer(async (request, response) => {
  if (request.url === '/__integration/health') {
    send(
      response,
      200,
      JSON.stringify({ ready: true }),
      'application/json; charset=utf-8'
    );
    return;
  }

  if (request.url === '/api/status' && request.method === 'GET') {
    send(
      response,
      200,
      JSON.stringify({ mode: 'production', renderer: 'server-entry' }),
      'application/json; charset=utf-8',
      { 'cache-control': 'no-store' }
    );
    return;
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.setHeader('allow', 'GET, HEAD');
    send(response, 405, 'Method Not Allowed');
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(
      new URL(request.url ?? '/', 'http://integration.test').pathname
    );
  } catch {
    send(response, 400, 'Bad Request');
    return;
  }

  const relative = pathname.replace(/^\/+/, '');
  const candidate = path.resolve(root, relative || 'index.html');
  if (candidate !== root && !candidate.startsWith(`${root}${path.sep}`)) {
    send(response, 403, 'Forbidden');
    return;
  }

  if (path.extname(pathname) === '') {
    const result = await renderRequest(
      new URL(request.url ?? '/', 'http://integration.test'),
      template
    );
    send(response, result.status, result.body, 'text/html; charset=utf-8', {
      'cache-control': 'no-cache',
      ...result.headers,
    });
    return;
  }

  let file = candidate;
  let info = await fileInfo(file);
  if (!info) {
    send(response, 404, 'Not Found');
    return;
  }

  const extension = path.extname(file).toLowerCase();
  response.writeHead(200, {
    'cache-control':
      extension === '.html'
        ? 'no-cache'
        : file.includes(`${path.sep}assets${path.sep}`)
          ? 'public, max-age=31536000, immutable'
          : 'public, max-age=0, must-revalidate',
    'content-length': info.size,
    'content-type': contentTypes.get(extension) ?? 'application/octet-stream',
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
  });
  if (request.method === 'HEAD') {
    response.end();
    return;
  }
  createReadStream(file).pipe(response);
});

server.listen(port, host, () => {
  process.stdout.write(
    `Production fixture listening on http://${host}:${port}\n`
  );
});

function close() {
  server.close((error) => {
    if (error) {
      console.error(error);
      process.exitCode = 1;
    }
  });
}

process.on('SIGINT', close);
process.on('SIGTERM', close);
