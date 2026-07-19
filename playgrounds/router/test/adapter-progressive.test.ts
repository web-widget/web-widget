import { render as renderPreact } from '@web-widget/preact/adapter';
import { render as renderSolid } from '@web-widget/solid/adapter';
import { render as renderSvelte } from '@web-widget/svelte/adapter';
import { render as renderVue2 } from '@web-widget/vue2/adapter';
import { render as renderLit } from '@web-widget/lit/adapter';
import { render as renderWebComponents } from '@web-widget/web-components/adapter';
import { describe, expect, test, vi } from 'vitest';

describe('framework adapter progressive rendering contract', () => {
  test('Preact rejects progressive shell errors before returning a stream', async () => {
    const Component = () => {
      throw new Error('Preact shell error');
    };

    await expect(
      renderPreact(Component, {}, { progressive: true })
    ).rejects.toThrow('Preact shell error');
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

  test.each([
    [
      'Svelte',
      renderSvelte,
      ((renderer: { push(value: string): void }) =>
        renderer.push('Svelte output')) as any,
    ],
    ['Vue 2', renderVue2, { render: (h: any) => h('p', 'Vue 2 output') }],
    ['Lit', renderLit, class {}],
    ['Web Components', renderWebComponents, class {}],
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
