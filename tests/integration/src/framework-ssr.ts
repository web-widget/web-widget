import { render as solidRender } from '@web-widget/solid/adapter';
import { render as svelteRender } from '@web-widget/svelte/adapter';
import SolidWidget from './hydration/SolidWidget.tsx?solid-ssr';
import SvelteWidget from './hydration/SvelteWidget.svelte';

type ServerAdapter = (
  component: unknown,
  data: unknown,
  options: { key: string; progressive: boolean }
) => Promise<ReadableStream<string> | string>;

export interface FrameworkSSRFragments {
  solidLight: string;
  solidLateShadow: string;
  solidShadow: string;
  svelteLight: string;
  svelteShadow: string;
}

export async function renderFrameworkSSR(): Promise<FrameworkSSRFragments> {
  // TypeScript resolves the browser condition for the public adapter export in
  // this mixed client/server project. Vite SSR resolves the server condition.
  const renderSolid = solidRender as unknown as ServerAdapter;
  const renderSvelte = svelteRender as unknown as ServerAdapter;
  const [solidLight, solidShadow, solidLateShadow, svelteLight, svelteShadow] =
    await Promise.all([
      renderSolid(SolidWidget, {}, { key: 'solid-light', progressive: false }),
      renderSolid(SolidWidget, {}, { key: 'solid-shadow', progressive: false }),
      renderSolid(
        SolidWidget,
        {},
        {
          key: 'solid-late-shadow',
          progressive: false,
        }
      ),
      renderSvelte(
        SvelteWidget,
        {},
        { key: 'svelte-light', progressive: false }
      ),
      renderSvelte(
        SvelteWidget,
        {},
        { key: 'svelte-shadow', progressive: false }
      ),
    ]);

  return {
    solidLight: String(solidLight),
    solidLateShadow: String(solidLateShadow),
    solidShadow: String(solidShadow),
    svelteLight: String(svelteLight),
    svelteShadow: String(svelteShadow),
  };
}

export function injectFrameworkSSR(
  template: string,
  fragments: FrameworkSSRFragments
): string {
  return template
    .replace('__SOLID_LIGHT_SSR__', fragments.solidLight)
    .replace('__SOLID_SHADOW_SSR__', fragments.solidShadow)
    .replace('__SOLID_LATE_SHADOW_SSR__', fragments.solidLateShadow)
    .replace('__SVELTE_LIGHT_SSR__', fragments.svelteLight)
    .replace('__SVELTE_SHADOW_SSR__', fragments.svelteShadow);
}
