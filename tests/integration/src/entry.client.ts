import { HTMLWebWidgetElement } from '@web-widget/web-widget/client';
import { render as reactRender } from '@web-widget/react/adapter';
import { render as vueRender } from '@web-widget/vue/adapter';
import { render as preactRender } from '@web-widget/preact/adapter';
import { render as solidRender } from '@web-widget/solid/adapter';
import { render as svelteRender } from '@web-widget/svelte/adapter';
import './fixture.css';
import './hydration/hydration.css';
import './cases/route/route-plain.css';
import routeModule from '@cases/route/route.module.css';
import './cases/widget/widget-plain.css';
import widgetModule from '@cases/widget/widget.module.css';
import { createApp } from 'vue';
import VueMatrix from './cases/vue/VueMatrix.vue';
import ReactWidget from './hydration/ReactWidget';
import VueWidget from './hydration/VueWidget';
import PreactWidget from './hydration/PreactWidget';
import SolidWidget from './hydration/SolidWidget';
import SvelteWidget from './hydration/SvelteWidget.svelte';

const CLIENT_APP_VERSION = Number('__CLIENT_APP_VERSION__');

async function hasConsistentAppVersion() {
  if (!import.meta.hot) return true;
  const ssrVersion = Number(
    document.querySelector<HTMLMetaElement>('meta[name="app-version"]')?.content
  );
  const response = await fetch('/__integration/app-version');
  const { version: serverVersion } = (await response.json()) as {
    version: number;
  };
  if (ssrVersion !== serverVersion || CLIENT_APP_VERSION !== serverVersion) {
    if (!window.__versionReloadStarted) {
      window.__versionReloadStarted = true;
      location.reload();
    }
    return false;
  }
  return true;
}

if (import.meta.hot) {
  const ssrVersion = Number(
    document.querySelector<HTMLMetaElement>('meta[name="module-version"]')
      ?.content
  );
  const response = await fetch('/__integration/module-version');
  const { version: clientVersion } = (await response.json()) as {
    version: number;
  };
  if (ssrVersion !== clientVersion) {
    location.reload();
    await new Promise<never>(() => {});
  }
}

if (!(await hasConsistentAppVersion())) {
  await new Promise<never>(() => {});
}

const fixture = document.querySelector<HTMLElement>('[data-testid="fixture"]');
const status = document.querySelector<HTMLElement>('[data-testid="status"]');
const widget = document.querySelector<HTMLElement>('[data-testid="widget"]');
const increment = document.querySelector<HTMLButtonElement>(
  '[data-testid="increment"]'
);

if (!fixture || !status || !widget || !increment) {
  throw new Error('Integration fixture markup is missing');
}

document.documentElement.dataset.navigationId = crypto.randomUUID();
document
  .querySelector('[data-case="C02"]')
  ?.classList.add(routeModule.probe ?? routeModule.probeNext);
document.querySelector('[data-case="C06"]')?.classList.add(widgetModule.probe);
createApp(VueMatrix).mount('[data-vue-style-loader]');
fixture.dataset.clientReady = 'true';
status.textContent = 'Client ready';
increment.addEventListener('click', () => {
  widget.dataset.widgetState = String(Number(widget.dataset.widgetState) + 1);
});

const baseHydrationModules = {
  react: { default: ReactWidget, render: reactRender },
  vue: { default: VueWidget, render: vueRender },
  preact: { default: PreactWidget, render: preactRender },
  solid: { default: SolidWidget, render: solidRender },
  svelte: { default: SvelteWidget, render: svelteRender },
};

const hydrationModules = Object.fromEntries(
  Object.entries(baseHydrationModules).map(([adapter, module]) => [
    adapter,
    {
      ...module,
      meta: {
        style: [
          {
            id: `shadow-${adapter}-module`,
            content:
              ':host{display:block}' +
              '.shadow-boundary-probe{' +
              '--shadow-style-owner:module;' +
              'color:rgb(20, 90, 110)' +
              '}',
          },
        ],
      },
    },
  ])
);

window.__mountLateSolid = async () => {
  const host = document.querySelector<HTMLElementTagNameMap['web-widget']>(
    'web-widget[data-late-shadow-widget="solid"]'
  );
  if (!host) throw new Error('Missing late Solid hydration host');
  host.loader = (async () => hydrationModules.solid) as NonNullable<
    typeof host.loader
  >;
  await host.load();
  await host.bootstrap();
  await host.mount();
};

window.__hydrationReady = customElements
  .whenDefined('web-widget')
  .then(() => {
    if (customElements.get('web-widget') !== HTMLWebWidgetElement) {
      throw new Error('The web-widget custom element was not registered');
    }
    return Promise.all(
      Object.entries(hydrationModules).map(async ([adapter, module]) => {
        const hosts = document.querySelectorAll<
          HTMLElementTagNameMap['web-widget']
        >(
          `web-widget[data-hydration-widget="${adapter}"],` +
            `web-widget[data-shadow-widget="${adapter}"]`
        );
        if (hosts.length !== 2) {
          throw new Error(`Missing ${adapter} hydration host`);
        }
        await Promise.all(
          Array.from(hosts).map(async (host) => {
            host.loader = (async () => module) as NonNullable<
              typeof host.loader
            >;
            await host.load();
            await host.bootstrap();
            if (
              host.hasAttribute('data-hydration-widget') &&
              window.__raceBeforeMount
            ) {
              window.__raceWaiting = (window.__raceWaiting ?? 0) + 1;
              await window.__raceBeforeMount;
              if (!(await hasConsistentAppVersion())) {
                await new Promise<never>(() => {});
              }
            }
            await host.mount();
          })
        );
      })
    );
  })
  .then(() => undefined)
  .catch((error) => {
    window.__hydrationErrors.push(error);
  });
