import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import NodeAdapter from '@web-widget/node';
import webRouter from './dist/server/index.js';

const port = Number(process.env.PORT ?? 9000);
const host = '127.0.0.1';
const clientRoot = fileURLToPath(new URL('./dist/client', import.meta.url));
const routerHandler = new NodeAdapter(webRouter, {
  defaultOrigin: `http://${host}:${port}`,
}).handler;

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
};

const server = createServer(async (request, response) => {
  const pathname = new URL(request.url ?? '/', `http://${host}:${port}`)
    .pathname;
  if (pathname.startsWith('/assets/')) {
    try {
      const file = await readFile(join(clientRoot, pathname));
      response.setHeader(
        'content-type',
        contentTypes[extname(pathname)] ?? 'application/octet-stream'
      );
      response.end(file);
    } catch {
      response.statusCode = 404;
      response.end('Not found');
    }
    return;
  }
  routerHandler(request, response);
});

server.listen(port, host, () => console.log(`http://${host}:${port}`));
