import { defineClientRender } from '@web-widget/helpers';
import type { App, Component } from 'vue';
import { Suspense, createApp, createSSRApp, h } from 'vue';
import type { CreateVueRenderOptions } from './types';
import errorHandler from './error-handler';

export * from '@web-widget/helpers';
export { useWidgetAsyncState as useWidgetState } from '@web-widget/helpers/state';
export * from './components';

export const createVueRender = ({
  onCreatedApp = async () => {},
}: CreateVueRenderOptions = {}) => {
  return defineClientRender<Component>(
    async (component, data, { recovering, container }) => {
      if (!component) {
        throw new TypeError(`Missing component.`);
      }

      if (!container) {
        throw new Error(`Missing container.`);
      }

      let app: App | null;
      const context = { data, recovering, container }; // This is to be compatible with createVueRender's on*** lifecycle
      const WidgetSuspense = (props: any) =>
        h(Suspense, null, [h(component, props)]);

      return {
        async mount() {
          if (recovering) {
            app = createSSRApp(WidgetSuspense, context as any);
          } else {
            app = createApp(WidgetSuspense, context as any);
          }

          let error;
          errorHandler(app, (err) => {
            error = err;
          });

          await onCreatedApp(app, context, component, data);

          app.mount(container);

          if (error) {
            throw error;
          }
        },

        async unmount() {
          app?.unmount();
          app = null;
        },
      };
    }
  );
};

/**@deprecated Please use `createVueRender` instead.*/
export const defineVueRender = createVueRender;

export const render = createVueRender();
