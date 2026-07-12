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

  test('HTML /html-suspense-streaming streams content progressively', async () => {
    const result = await fetch('/html-suspense-streaming');
    expect(result.status).toBe(200);
    expect(result.body).toBeInstanceOf(ReadableStream);

    const body = await result.text();

    // Suspense boundary markers ($H-prefixed to avoid React conflicts).
    expect(body).toMatch(/<template id="HB:\d+"><\/template>/);
    expect(body).toMatch(/<div hidden id="HS:\d+">/);
    expect(body).toContain('$HRC(');

    // Fallback content arrives before resolved content.
    expect(body).toContain('Loading A...');
    expect(body).toContain('Section A loaded!');
  }, 15000);

  test('HTML /html-streaming-error recovers from errors', async () => {
    const result = await fetch('/html-streaming-error');
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
