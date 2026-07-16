import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
import type { AddressInfo } from 'node:net';

export interface TestServer {
  close(): Promise<void>;
  fetch(path: string, init?: RequestInit): Promise<Response>;
  url: string;
}

export async function runTestServer(
  handler: (request: IncomingMessage, response: ServerResponse) => void
): Promise<TestServer> {
  const server = createServer((request, response) => {
    try {
      Promise.resolve(handler(request, response)).catch((error) => {
        response.statusCode = 500;
        response.end(String(error));
      });
    } catch (error) {
      response.statusCode = 500;
      response.end(String(error));
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const { port } = server.address() as AddressInfo;
  const url = `http://127.0.0.1:${port}`;

  return {
    url,
    fetch: (path, init) => fetch(new URL(path, url), init),
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.closeAllConnections();
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

export async function serializeResponse(response: Response) {
  const text = await response.text();
  let json = {};
  try {
    json = JSON.parse(text);
  } catch {}
  return {
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers),
    json,
    text,
  };
}
