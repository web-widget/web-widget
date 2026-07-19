import { describe, expect, test } from 'vitest';
import fetch from './fetch';

function expectUnifiedStates(
  body: string,
  title: string,
  expectPending = true
) {
  expect(body).toContain(`${title}: Progressive streaming`);
  if (expectPending) expect(body).toContain('Pending: loading content...');
  expect(body).toContain('Hello World');
  expect(body).toContain('React Widget');
  expect(body).toContain('Vue 3 Widget');
  expect(body).toContain(
    'Multiple pending items are replaced in completion order'
  );
  expect(body).toContain('Pending content is replaced when rendering fails');
}

/**
 * Streaming SSR produces non-deterministic DOM (chunk order and the position
 * of runtime scripts vary between runs). Instead of snapshot matching, verify
 * that streaming is active and content is delivered.
 */
describe('Streaming SSR', () => {
  test('React /streaming/react streams content progressively', async () => {
    const result = await fetch('/streaming/react');
    expect(result.status).toBe(200);
    expect(result.body).toBeInstanceOf(ReadableStream);

    const body = await result.text();

    // React Suspense boundary markers.
    expect(body).toMatch(/<template id="B:\d+"><\/template>/);
    expect(body).toMatch(/<div hidden id="S:\d+">/);
    expect(body).toContain('$RC(');
    expectUnifiedStates(body, 'React');
  }, 15000);

  test('Vue3 /streaming/vue3 streams content progressively', async () => {
    const result = await fetch('/streaming/vue3');
    expect(result.status).toBe(200);
    expect(result.body).toBeInstanceOf(ReadableStream);

    const body = await result.text();

    // Vue3 streaming renders widgets with a `recovering` boundary attribute.
    expect(body).toContain('recovering');
    expectUnifiedStates(body, 'Vue 3', false);
  });

  test('HTML /streaming/html streams content progressively', async () => {
    const result = await fetch('/streaming/html');
    expect(result.status).toBe(200);
    expect(result.body).toBeInstanceOf(ReadableStream);

    const body = await result.text();

    // Suspense boundary markers ($H-prefixed to avoid React conflicts).
    expect(body).toMatch(/<template id="HB:\d+"><\/template>/);
    expect(body).toMatch(/<div hidden id="HS:\d+">/);
    expect(body).toContain('$HRC(');

    expectUnifiedStates(body, 'HTML');
  }, 15000);

  test('HTML /streaming/html/suspense streams native suspense boundaries', async () => {
    const result = await fetch('/streaming/html/suspense');
    expect(result.status).toBe(200);
    expect(result.body).toBeInstanceOf(ReadableStream);

    const body = await result.text();

    expect(body).toContain('HTML: Suspense component streaming');
    expect(body).toContain(
      'Independent boundaries resolve in completion order'
    );
    expect(body).toContain('Nested content resolved.');
    expect(body).toContain('Error: section failed to load.');
  }, 15000);

  test('Solid /streaming/solid streams content progressively', async () => {
    const result = await fetch('/streaming/solid');
    expect(result.status).toBe(200);
    expect(result.body).toBeInstanceOf(ReadableStream);

    const body = await result.text();

    expectUnifiedStates(body, 'Solid');
  }, 15000);

  test('Preact /streaming/preact streams content progressively', async () => {
    const result = await fetch('/streaming/preact');
    expect(result.status).toBe(200);
    expect(result.body).toBeInstanceOf(ReadableStream);

    const body = await result.text();

    expectUnifiedStates(body, 'Preact');
  }, 15000);

  test('React /streaming/react/shell-error returns 500 for shell errors', async () => {
    const result = await fetch('/streaming/react/shell-error');
    expect(result.status).toBe(500);
    expect(result.body).toBeInstanceOf(ReadableStream);

    const body = await result.text();

    // The _500 fallback page is served.
    expect(body).toContain('500');
    expect(body).toContain('Shell error');
  }, 15000);

  test('HTML /streaming/html/shell-error returns 500 for shell errors', async () => {
    const result = await fetch('/streaming/html/shell-error');
    expect(result.status).toBe(500);

    const body = await result.text();

    // The _500 fallback page is served.
    expect(body).toContain('500');
    expect(body).toContain('Shell error');
  }, 15000);

  test('Vue3 /streaming/vue3/shell-error returns 500 for shell errors', async () => {
    const result = await fetch('/streaming/vue3/shell-error');
    expect(result.status).toBe(500);

    const body = await result.text();

    // The _500 fallback page is served.
    expect(body).toContain('500');
    expect(body).toContain('Shell error');
  }, 15000);

  test.each([
    ['Solid', '/streaming/solid/shell-error'],
    ['Preact', '/streaming/preact/shell-error'],
  ])(
    '%s shell errors return 500',
    async (_name, pathname) => {
      const result = await fetch(pathname);
      expect(result.status).toBe(500);
      expect(await result.text()).toContain('Shell error');
    },
    15000
  );

  test('HTML /html-streaming-error recovers from errors', async () => {
    const result = await fetch('/streaming/html/error');
    expect(result.status).toBe(200);
    expect(result.body).toBeInstanceOf(ReadableStream);

    const body = await result.text();

    // Successful sections render.
    expect(body).toContain('Section loaded successfully!');
    expect(body).toContain('Page recovered');

    // Failed suspense and widget show error UI (swapped via $HRC).
    expect(body).toContain('Something went wrong.');
  }, 15000);
});
