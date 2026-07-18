import { h as hPreact } from 'preact';
import { render as renderPreact } from '@web-widget/preact/adapter';
import { render as renderSolid } from '@web-widget/solid/adapter';
import { render as renderSvelte } from '@web-widget/svelte/adapter';
import { render as renderVue } from '@web-widget/vue/adapter';
import { render as renderVue2 } from '@web-widget/vue2/adapter';
import { render as renderLit } from '@web-widget/lit/adapter';
import { render as renderWebComponents } from '@web-widget/web-components/adapter';
import { describe, expect, test, vi } from 'vitest';

async function readChunks(stream: ReadableStream<string>) {
  const chunks: string[] = [];
  for await (const chunk of stream) {
    expect(typeof chunk).toBe('string');
    chunks.push(chunk);
  }
  return chunks.join('');
}

describe('framework adapter progressive rendering contract', () => {
  test('Preact returns buffered HTML by default and a text stream when progressive', async () => {
    const Component = () => hPreact('p', null, 'Preact output');

    const buffered = await renderPreact(Component, {}, { progressive: false });
    const progressive = await renderPreact(
      Component,
      {},
      {
        progressive: true,
      }
    );

    expect(typeof buffered).toBe('string');
    expect(progressive).toBeInstanceOf(ReadableStream);
    await expect(
      readChunks(progressive as ReadableStream<string>)
    ).resolves.toContain('Preact output');
  });

  test('Preact rejects progressive shell errors before returning a stream', async () => {
    const Component = () => {
      throw new Error('Preact shell error');
    };

    await expect(
      renderPreact(Component, {}, { progressive: true })
    ).rejects.toThrow('Preact shell error');
  });

  test('Solid returns buffered HTML by default and a text stream when progressive', async () => {
    const Component = () => 'Solid output';

    const buffered = await renderSolid(
      Component,
      {},
      {
        id: 'solid-buffered',
        progressive: false,
      }
    );
    const progressive = await renderSolid(
      Component,
      {},
      {
        id: 'solid-progressive',
        progressive: true,
      }
    );

    expect(typeof buffered).toBe('string');
    expect(progressive).toBeInstanceOf(ReadableStream);
    await expect(
      readChunks(progressive as ReadableStream<string>)
    ).resolves.toContain('Solid output');
  });

  test('Solid rejects progressive shell errors before returning a stream', async () => {
    const Component = () => {
      throw new Error('Solid shell error');
    };

    await expect(
      renderSolid(
        Component,
        {},
        {
          id: 'solid-error',
          progressive: true,
        }
      )
    ).rejects.toThrow('Solid shell error');
  });

  test('Vue 3 returns buffered HTML by default and a text stream when progressive', async () => {
    const Component = () => 'Vue 3 output';

    const buffered = await renderVue(Component, {}, { progressive: false });
    const progressive = await renderVue(Component, {}, { progressive: true });

    expect(typeof buffered).toBe('string');
    expect(progressive).toBeInstanceOf(ReadableStream);
    await expect(
      readChunks(progressive as ReadableStream<string>)
    ).resolves.toContain('Vue 3 output');
  });

  test.each([
    [
      'Svelte',
      renderSvelte,
      ((renderer: { push(value: string): void }) =>
        renderer.push('Svelte output')) as any,
    ],
    ['Vue 2', renderVue2, { render: (h: any) => h('p', 'Vue 2 output') }],
    ['Lit', renderLit, null],
    ['Web Components', renderWebComponents, null],
  ])(
    '%s explicitly warns when progressive rendering is unavailable',
    async (_name, render, component) => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await render(
        component as never,
        {},
        { progressive: true }
      );

      expect(typeof result).toBe('string');
      expect(warn).toHaveBeenCalledOnce();
      warn.mockRestore();
    }
  );
});
