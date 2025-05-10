import { defineClientRender } from '@web-widget/helpers';
import { cacheProviderIsLoading } from '@web-widget/helpers/cache';
import type { Component } from 'vue';
import Vue from 'vue';
import type { CreateVueRenderOptions } from './types';

export * from '@web-widget/helpers';
export { useWidgetSyncState as useWidgetState } from '@web-widget/helpers/state';
export * from './components';

type BuildedComponent = Component & {
  __name?: string;
};

export const createVueRender = ({
  onBeforeCreateApp = async () => ({}),
  onCreatedApp = async () => {},
  onPrefetchData,
}: CreateVueRenderOptions = {}) => {
  return defineClientRender<BuildedComponent>(
    async (component, data, { recovering, container }) => {
      if (!component) {
        throw new TypeError(`Missing component.`);
      }

      if (!container) {
        throw new Error(`Missing container.`);
      }

      if (component.__name) {
        // NOTE: Avoid vue warnings: `[Vue warn]: Invalid component name ...`
        component.__name = component.__name.replace('@', '.');
      }

      let app: Vue | null;
      const context = { data, recovering, container }; // This is to be compatible with createVueRender's on*** lifecycle

      return {
        async mount() {
          let ssrRoot: Element | Node = container;
          let mergedProps: Record<string, any> = data as any;

          if (recovering) {
            const vue2ssrAttrSelector = `[data-server-rendered="true"]`;
            const root =
              container.querySelector(vue2ssrAttrSelector) ||
              container.firstElementChild;
            const state = container.querySelector(
              'script[as=state]'
            ) as HTMLScriptElement | null;
            const stateContent = state
              ? JSON.parse(state.textContent as string)
              : onPrefetchData
                ? await onPrefetchData(context, component, data)
                : undefined;

            if (!root) {
              throw new Error(
                `No element found for hydration: ${vue2ssrAttrSelector}`
              );
            }

            ssrRoot = root;
            mergedProps = stateContent
              ? Object.assign(stateContent, data)
              : data;

            state?.remove();
          }

          let loading: unknown;
          app = new Vue({
            render(h) {
              return h(component, {
                props: mergedProps,
              });
            },
            errorCaptured: (err, vm, info) => {
              if (cacheProviderIsLoading(err)) {
                loading = err;
                return false;
              } else {
                throw err;
              }
            },
            ...(await onBeforeCreateApp(context, component, mergedProps)),
          });

          await onCreatedApp(app, context, component, mergedProps);

          if (recovering) {
            app.$mount(ssrRoot as Element, recovering);
          } else {
            container.appendChild(app.$mount().$el);
          }

          if (loading) {
            recovering = false;
            clearInsterHTML(container);
            // NOTE: Let the framework wait for the data to be ready before remounting.
            throw loading;
          }
        },

        async unmount() {
          app?.$destroy();
          clearInsterHTML(container);
          app = null;
        },
      };
    }
  );
};

function clearInsterHTML(container: Element | Node) {
  if ('innerHTML' in container) {
    container.innerHTML = '';
  }
}

/**@deprecated Please use `createVueRender` instead.*/
export const defineVueRender = createVueRender;

export const render = createVueRender();
