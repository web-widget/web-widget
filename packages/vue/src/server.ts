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

export interface VueRenderOptions {
  vue?: SSRContext;
}

export const createVueRender = ({
  onCreatedApp = async () => {},
}: CreateVueRenderOptions = {}) => {
  return defineServerRender<Component>(
    async (component, data, { progressive, vue: options } = {}) => {
      if (!component) {
        throw new TypeError(`Missing component.`);
      }

      const ssrContext: SSRContext = Object.create(options ?? null);

      let error;
      const context = { data, progressive }; // This is to be compatible with createVueRender's on*** lifecycle
      const WidgetSuspense = (props: any) =>
        h(Suspense, null, [h(component, props)]);
      const app = createSSRApp(WidgetSuspense, data as any);

      errorHandler(app, (err) => {
        error = err;
      });

      await onCreatedApp(app, context, component, data);

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
