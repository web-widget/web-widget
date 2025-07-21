import { defineClientRender } from '@web-widget/helpers';
import type { App, Component } from 'vue';
import { Suspense, createApp, createSSRApp, h } from 'vue';
import type { CreateVueRenderOptions } from './types';
import errorHandler from './error-handler';

export * from '@web-widget/helpers';
export { useWidgetAsyncState as useWidgetState } from '@web-widget/helpers/state';
export * from './components';

// Helper function to create the WidgetSuspense component
const createWidgetSuspense = (component: Component) => (props: any) =>
  h(Suspense, null, [h(component, props)]);

export const createVueRender = ({
  onCreatedApp = async () => {},
}: CreateVueRenderOptions = {}) => {
  return defineClientRender<Component>(
    async (component, data, { recovering, container }) => {
      data = data ?? {};

      if (!component) {
        throw new TypeError(`Missing component.`);
      }

      if (!container) {
        throw new Error(`Missing container.`);
      }

      let app: App | null;
      const context = { data, recovering, container }; // Context for lifecycle hooks
      const WidgetSuspense = createWidgetSuspense(component);

      return {
        async mount() {
          // Choose the appropriate app creation method based on recovery state
          app = recovering
            ? createSSRApp(WidgetSuspense, data as any)
            : createApp(WidgetSuspense, data as any);

          let error;
          errorHandler(app, (err) => {
            error = err;
          });

          // Call the user-defined lifecycle hook
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
