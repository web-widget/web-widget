import { defineRender, getComponentDescriptor } from '@web-widget/helpers';
import { createSSRApp, h, Suspense } from 'vue';
import { renderToWebStream, type SSRContext } from 'vue/server-renderer';
import type { CreateVueRenderOptions } from './types';

declare module '@web-widget/schema' {
  interface WidgetRenderOptions {
    vue?: {};
  }
  interface RouteRenderOptions {
    vue?: SSRContext;
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
  onPrefetchData,
}: CreateVueRenderOptions = {}) => {
  if (onPrefetchData) {
    throw new Error(`"onPrefetchData" is not supported.`);
  }

  return defineRender<unknown, Record<string, string>>(
    async (context, { vue: ssrContext } = {}) => {
      const componentDescriptor = getComponentDescriptor(context);
      const { component, props } = componentDescriptor;

      const WidgetSuspense = (props: any) =>
        h(Suspense, null, [h(component, props)]);
      const app = createSSRApp(WidgetSuspense, props as any);

      /**
       * The thrown promise is not necessarily a real error,
       * it will be handled by the web widget container.
       * @see ../../web-widget/src/server.ts#suspense
       */
      app.config.errorHandler = (err, instance, info) => {
        if (err instanceof Promise) {
          return;
        }
        throw err;
      };

      await onCreatedApp(app, context, component, props);
      return renderToWebStream(app, ssrContext);
    }
  );
};

/**@deprecated Please use `createVueRender` instead.*/
export const defineVueRender = createVueRender;

export const render = createVueRender();
