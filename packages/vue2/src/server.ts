import { defineRender, getComponentDescriptor } from '@web-widget/helpers';
import { escapeJson } from '@web-widget/helpers/purify';
// import { Readable } from "node:stream";
// import { TransformStream } from "node:stream/web";
import type { Component } from 'vue';
import Vue from 'vue';
import { createRenderer } from 'vue-server-renderer';
import type { CreateVueRenderOptions } from './types';

export * from '@web-widget/helpers';
export { useWidgetSyncState as useWidgetState } from '@web-widget/helpers/state';
export * from './components';

// const __FEATURE_STREAM__ = false;

// function appendStringToReadableStream(
//   stream: ReadableStream,
//   text: string
// ): ReadableStream {
//   const encoder = new TextEncoder();
//   const uint8Array = encoder.encode(text);
//   return stream.pipeThrough(
//     new TransformStream({
//       flush(controller) {
//         controller.enqueue(uint8Array);
//       },
//     })
//   );
// }

export const createVueRender = ({
  onBeforeCreateApp = async () => ({}),
  onCreatedApp = async () => {},
  onPrefetchData,
}: CreateVueRenderOptions = {}) => {
  return defineRender(async (context) => {
    const componentDescriptor = getComponentDescriptor(context);
    const component = componentDescriptor.component as Component & {
      __name?: string;
    };
    const props = componentDescriptor.props;

    if (component.__name) {
      component.__name = component.__name.replace('@', '-');
    }

    const state = onPrefetchData
      ? await onPrefetchData(context, component, props)
      : undefined;
    const mergedProps = state ? Object.assign({}, state, props) : props;

    const renderer = createRenderer();

    const app = new Vue({
      render: (h) =>
        h(component, {
          props: mergedProps as Record<string, any>,
        }),
      ...(await onBeforeCreateApp(context, component, mergedProps)),
    });

    await onCreatedApp(app, context, component, mergedProps);

    // const result =
    //   __FEATURE_STREAM__ && Readable.toWeb
    //     ? Readable.toWeb(renderer.renderToStream(app))
    //     : await renderer.renderToString(app);

    // NOTE: Avoid vite-plugin-vue2-jsx not working.
    // @see https://github.com/vitejs/vite-plugin-vue2-jsx/blob/f44adfd80a8c2d016947bcd808c88ebfa2d9da1a/src/index.ts#L32-L33
    const ssrContext = {};
    const result = await renderer.renderToString(app, ssrContext);

    app.$destroy();

    if (state) {
      const json = escapeJson(JSON.stringify(state));
      const script = `<script as="state" type="application/json">${json}</script>`;
      // return typeof result === "string"
      //   ? result + script
      //   : appendStringToReadableStream(result, script);
      return result + script;
    } else {
      return result;
    }
  });
};

/**@deprecated Please use `createVueRender` instead.*/
export const defineVueRender = createVueRender;

export const render = createVueRender();
