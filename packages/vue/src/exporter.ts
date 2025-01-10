import type { ClientWidgetRenderContext } from '@web-widget/helpers';
import { defineRender, getComponentDescriptor } from '@web-widget/helpers';
import type { App } from 'vue';
import { Suspense, createApp, createSSRApp, h } from 'vue';
import type { CreateVueRenderOptions } from './types';
import installErrorHandler from './error-handler';
import { renderToWebStream, type SSRContext } from 'vue/server-renderer';

declare module '@web-widget/schema' {
  interface WidgetRenderOptions {
    vue?: {};
  }
  interface RouteRenderOptions {
    vue?: SSRContext;
  }
}

const createClientVueRender = ({
  onCreatedApp = async () => {},
}: CreateVueRenderOptions = {}) => {
  return defineRender(async (context) => {
    const { recovering, container } = context as ClientWidgetRenderContext;
    const componentDescriptor = getComponentDescriptor(context);
    const { component, props } = componentDescriptor;
    if (!container) {
      throw new Error(`Container required.`);
    }

    let app: App | null;
    const WidgetSuspense = (props: any) =>
      h(Suspense, null, [h(component, props)]);

    return {
      async mount() {
        if (recovering) {
          app = createSSRApp(WidgetSuspense, props as any);
        } else {
          app = createApp(WidgetSuspense, props as any);
        }

        installErrorHandler(app);
        await onCreatedApp(app, context, component, props);

        app.mount(container);
      },

      async unmount() {
        app?.unmount();
        app = null;
      },
    };
  });
};

const createServerVueRender = ({
  onCreatedApp = async () => {},
}: CreateVueRenderOptions = {}) => {
  return defineRender<unknown, Record<string, string>>(
    async (context, { vue: ssrContext } = {}) => {
      const componentDescriptor = getComponentDescriptor(context);
      const { component, props } = componentDescriptor;

      const WidgetSuspense = (props: any) =>
        h(Suspense, null, [h(component, props)]);
      const app = createSSRApp(WidgetSuspense, props as any);

      installErrorHandler(app);
      await onCreatedApp(app, context, component, props);
      return renderToWebStream(app, ssrContext);
    }
  );
};

export const createVueRender = /*#__PURE__*/ import.meta.env.SSR
  ? createServerVueRender
  : createClientVueRender;

/**
 * Export components to a format that can be rendered by the [Web Widget](https://web-widget.js.org).
 */
export const exporter = /*#__PURE__*/ createVueRender();
