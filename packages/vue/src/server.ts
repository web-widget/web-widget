import { defineRender, getComponentDescriptor } from '@web-widget/helpers';
import { createSSRApp, h, Suspense } from 'vue';
import {
  renderToString,
  renderToWebStream,
  type SSRContext,
} from 'vue/server-renderer';
import type { CreateVueRenderOptions } from './types';
import errorHandler from './error-handler';

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
    async (context, { progressive, vue: ssrContext } = {}) => {
      const componentDescriptor = getComponentDescriptor(context);
      const { component, props } = componentDescriptor;
      const WidgetSuspense = (props: any) =>
        h(Suspense, null, [h(component, props)]);
      const app = createSSRApp(WidgetSuspense, props as any);
      let error;
      errorHandler(app, (err) => {
        error = err;
      });
      await onCreatedApp(app, context, component, props);
      const html = progressive
        ? renderToWebStream(app, ssrContext)
        : await renderToString(app, ssrContext);

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
