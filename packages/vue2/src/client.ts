import type { ClientWidgetRenderContext } from '@web-widget/helpers';
import { defineRender, getComponentDescriptor } from '@web-widget/helpers';
import type { Component } from 'vue';
import Vue from 'vue';
import type { CreateVueRenderOptions } from './types';

export * from '@web-widget/helpers';
export { useWidgetSyncState as useWidgetState } from '@web-widget/helpers/state';
export * from './components';

export const createVueRender = ({
  onBeforeCreateApp = async () => ({}),
  onCreatedApp = async () => {},
  onPrefetchData,
}: CreateVueRenderOptions = {}) => {
  return defineRender(async (context) => {
    const { recovering, container } = context as ClientWidgetRenderContext;
    const componentDescriptor = getComponentDescriptor(context);
    const component = componentDescriptor.component as Component & {
      __name?: string;
    };
    const props = componentDescriptor.props;

    if (!container) {
      throw new Error(`Container required.`);
    }

    if (component.__name) {
      // NOTE: Avoid vue warnings: `[Vue warn]: Invalid component name ...`
      component.__name = component.__name.replace('@', '.');
    }

    let app: Vue | null;

    return {
      async mount() {
        let element: Element | Node = container;
        let mergedProps: Record<string, any> = props as any;

        if (recovering) {
          const vue2ssrAttrSelector = `[data-server-rendered="true"]`;
          const ssrRoot =
            container.querySelector(vue2ssrAttrSelector) ||
            container.firstChild;
          const state = container.querySelector(
            'script[as=state]'
          ) as HTMLScriptElement | null;
          const stateContent = state
            ? JSON.parse(state.textContent as string)
            : onPrefetchData
              ? await onPrefetchData(context, component, props)
              : undefined;

          if (!ssrRoot) {
            throw new Error(
              `No element found for hydration: ${vue2ssrAttrSelector}`
            );
          }

          element = ssrRoot;
          mergedProps = stateContent
            ? Object.assign(stateContent, props)
            : props;

          state?.remove();
        }

        app = new Vue({
          render(h) {
            return h(component, {
              props: mergedProps,
            });
          },
          ...(await onBeforeCreateApp(context, component, mergedProps)),
        });

        await onCreatedApp(app, context, component, mergedProps);

        if (recovering) {
          app.$mount(element as Element, recovering);
        } else {
          container.appendChild(app.$mount().$el);
        }
      },

      async unmount() {
        app?.$destroy();
        if ('innerHTML' in container) {
          container.innerHTML = '';
        }
        app = null;
      },
    };
  });
};

/**@deprecated Please use `createVueRender` instead.*/
export const defineVueRender = createVueRender;

export const render = createVueRender();
