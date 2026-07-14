import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { describe, expect, test, jest } from '@jest/globals';
import {
  createDevToolsJsonMiddleware,
  getWorkspaceUuid,
} from './devtools-json';

function mockReq(url: string): IncomingMessage {
  return { url } as IncomingMessage;
}

function mockRes() {
  const headers: Record<string, string> = {};
  let body = '';
  let ended = false;
  const res = {
    setHeader(key: string, value: string) {
      headers[key] = value;
    },
    end(data?: string) {
      if (data) body = data;
      ended = true;
    },
  } as unknown as ServerResponse;
  return {
    res,
    headers,
    get ended() {
      return ended;
    },
    get body() {
      return body;
    },
  };
}

describe('getWorkspaceUuid', () => {
  test('generates a valid UUID v4 on first call', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ww-devtools-'));
    const uuid = getWorkspaceUuid(dir);
    expect(uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
    fs.rmSync(dir, { recursive: true });
  });

  test('persists UUID across calls', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ww-devtools-'));
    const first = getWorkspaceUuid(dir);
    const second = getWorkspaceUuid(dir);
    expect(second).toBe(first);
    fs.rmSync(dir, { recursive: true });
  });

  test('returns in-memory UUID when cache dir is unwritable', () => {
    const uuid = getWorkspaceUuid('/nonexistent/path/that/cannot/be/created');
    expect(uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });
});

describe('createDevToolsJsonMiddleware', () => {
  function createMiddleware(root = '/project', cacheDir?: string) {
    const dir =
      cacheDir ?? fs.mkdtempSync(path.join(os.tmpdir(), 'ww-devtools-'));
    const viteServer = {
      config: { root, cacheDir: dir },
    } as never;
    const middleware = createDevToolsJsonMiddleware(viteServer);
    return {
      middleware,
      cleanup: () => fs.rmSync(dir, { recursive: true, force: true }),
    };
  }

  test('responds to /.well-known/appspecific/com.chrome.devtools.json', () => {
    const { middleware, cleanup } = createMiddleware('/my/project');

    const mock = mockRes();
    const next = jest.fn();

    middleware(
      mockReq('/.well-known/appspecific/com.chrome.devtools.json'),
      mock.res,
      next
    );

    expect(mock.ended).toBe(true);
    expect(next).not.toHaveBeenCalled();
    expect(mock.headers['content-type']).toBe(
      'application/json; charset=utf-8'
    );
    expect(mock.headers['cache-control']).toBe('no-cache');

    const json = JSON.parse(mock.body);
    expect(json.workspace.root).toBe('/my/project');
    expect(json.workspace.uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );

    cleanup();
  });

  test('strips query string when matching path', () => {
    const { middleware, cleanup } = createMiddleware();

    const mock = mockRes();
    const next = jest.fn();

    middleware(
      mockReq('/.well-known/appspecific/com.chrome.devtools.json?cache=bust'),
      mock.res,
      next
    );

    expect(mock.ended).toBe(true);
    expect(next).not.toHaveBeenCalled();
    cleanup();
  });

  test('calls next() for unrelated paths', () => {
    const { middleware, cleanup } = createMiddleware();

    const mock = mockRes();
    const next = jest.fn();

    middleware(mockReq('/some/page'), mock.res, next);

    expect(next).toHaveBeenCalled();
    cleanup();
  });

  test('returns stable UUID across middleware invocations', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ww-devtools-'));
    const { middleware, cleanup } = createMiddleware('/project', dir);

    const r1 = mockRes();
    middleware(
      mockReq('/.well-known/appspecific/com.chrome.devtools.json'),
      r1.res,
      jest.fn()
    );
    const uuid1 = JSON.parse(r1.body).workspace.uuid;

    // Simulate a second dev server start with the same cache dir
    const viteServer2 = {
      config: { root: '/project', cacheDir: dir },
    } as never;
    const middleware2 = createDevToolsJsonMiddleware(viteServer2);
    const r2 = mockRes();
    middleware2(
      mockReq('/.well-known/appspecific/com.chrome.devtools.json'),
      r2.res,
      jest.fn()
    );
    const uuid2 = JSON.parse(r2.body).workspace.uuid;

    expect(uuid2).toBe(uuid1);
    cleanup();
  });
});
