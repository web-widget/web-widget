import { describe, expect, test } from 'vitest';
import fetch from './fetch';

/**
 * Streaming SSR produces non-deterministic DOM (chunk order and the position
 * of runtime scripts vary between runs). Instead of snapshot matching, verify
 * that streaming is active and content is delivered.
 */
describe('Streaming SSR', () => {
  test('React /react-streaming streams content progressively', async () => {
    const result = await fetch('/react-streaming');
    expect(result.status).toBe(200);
    expect(result.body).toBeInstanceOf(ReadableStream);

    const body = await result.text();

    // React Suspense boundary markers.
    expect(body).toMatch(/<template id="B:\d+"><\/template>/);
    expect(body).toMatch(/<div hidden id="S:\d+">/);
    expect(body).toContain('$RC(');
  }, 15000);

  test('Vue3 /vue3-streaming streams content progressively', async () => {
    const result = await fetch('/vue3-streaming');
    expect(result.status).toBe(200);
    expect(result.body).toBeInstanceOf(ReadableStream);

    const body = await result.text();

    // Vue3 streaming renders widgets with a `recovering` boundary attribute.
    expect(body).toContain('recovering');
    expect(body).toContain('Vue3 Route: Streaming');
  });
});
