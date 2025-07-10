import { defineServerRender } from '@web-widget/helpers';
import { type Component, createSSRApp, h, Suspense } from 'vue';
import {
  renderToString,
  renderToWebStream,
  type SSRContext,
} from 'vue/server-renderer';
import type { CreateVueRenderOptions } from './types';
import errorHandler from './error-handler';

declare module '@web-widget/schema' {
  interface ServerRenderOptions {
    vue?: {};
  }
}

export * from '@web-widget/helpers';
export { useWidgetAsyncState as useWidgetState } from '@web-widget/helpers/state';
export * from './components';

// Helper function to create the WidgetSuspense component
const createWidgetSuspense = (component: Component) => (props: any) =>
  h(Suspense, null, [h(component, props)]);

export interface VueRenderOptions {
  vue?: SSRContext;
}

export const createVueRender = ({
  onCreatedApp = async () => {},
}: CreateVueRenderOptions = {}) => {
  return defineServerRender<Component>(
    async (component, data, { progressive, vue: options }) => {
      data = data ?? {};

      if (!component) {
        throw new TypeError(`Missing component.`);
      }

      const ssrContext: SSRContext = Object.create(options ?? null);

      let error;
      const context = { data, progressive }; // Context for lifecycle hooks
      const WidgetSuspense = createWidgetSuspense(component);
      const app = createSSRApp(WidgetSuspense, data as any);

      errorHandler(app, (err) => {
        error = err;
      });

      // Call the user-defined lifecycle hook
      await onCreatedApp(app, context, component, data);

      // Render the app to a string or stream based on the progressive flag
      const html = progressive
        ? renderToWebStream(app, ssrContext)
        : await renderToString(app, ssrContext);

      if (ssrContext?.teleports) {
        const file = Reflect.get(component, '__file') ?? 'unknown';
        throw new Error(
          `Teleports are not supported in SSR: ${JSON.stringify(ssrContext.teleports, null, 2)} in ${file}` +
            `\nDo conditionally render Teleport when mounted on the client.`
        );
      }

      if (error) {
        throw error;
      }

      return html;
    }
  );
};

/**@deprecated Please use `createVueRender` instead.*/
export const defineVueRender = createVueRender;

export const render = createVueRender();
