import { access } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from '../src/integration-test';
import { readSourceFixture, withFixtureServer } from '../src/server-fixture';
import { mutateSource } from '../src/source-mutation';

test('uses a temporary copy and waits for source changes', async ({
  request,
}, testInfo) => {
  const sourcePath = 'src/cases/route/route-plain.css';
  const original = await readSourceFixture(sourcePath);

  await withFixtureServer(async (server) => {
    expect(server.root).not.toContain(path.resolve('.'));
    expect(
      (await request.get(`${server.baseURL}/__integration/health`)).ok()
    ).toBe(true);
    await mutateSource(server, sourcePath, (source) =>
      source.replace('17, 34, 51', '51, 68, 85')
    );
    await expect
      .poll(async () =>
        request
          .get(`${server.baseURL}/${sourcePath}`)
          .then((response) => response.text())
      )
      .toContain('51, 68, 85');
  }, testInfo);

  expect(await readSourceFixture(sourcePath)).toBe(original);
});

test('stops the server and removes the copy when the test body fails', async ({}, testInfo) => {
  let pid = 0;
  let root = '';
  let baseURL = '';

  await expect(
    withFixtureServer(async (server) => {
      pid = server.process.pid ?? 0;
      root = server.root;
      baseURL = server.baseURL;
      throw new Error('intentional fixture failure');
    }, testInfo)
  ).rejects.toThrow('intentional fixture failure');

  expect(pid).toBeGreaterThan(0);
  expect(() => process.kill(pid, 0)).toThrow();
  await expect(access(root)).rejects.toThrow();
  await expect(fetch(`${baseURL}/__integration/health`)).rejects.toThrow();
});
