import {
  defineRender,
  getComponentDescriptor,
} from "@web-widget/schema/server-helpers";
import { Fragment, createSSRApp, h } from "vue";
import { renderToWebStream, type SSRContext } from "vue/server-renderer";
import type { DefineVueRenderOptions } from "./types";
import { __ENV__ } from "./web-widget";

export * from "@web-widget/schema/server-helpers";
export * from "./web-widget";

Reflect.defineProperty(__ENV__, "server", {
  value: true,
});

const ESCAPE_LOOKUP: { [match: string]: string } = {
  ">": "\\u003e",
  "<": "\\u003c",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029",
};

const ESCAPE_REGEX = /[><\u2028\u2029]/g;

// This utility is based on https://github.com/zertosh/htmlescape
// License: https://github.com/zertosh/htmlescape/blob/0527ca7156a524d256101bb310a9f970f63078ad/LICENSE
function htmlEscapeJsonString(str: string): string {
  return str.replace(ESCAPE_REGEX, (match) => ESCAPE_LOOKUP[match]);
}

export interface VueRenderOptions {
  vue?: SSRContext;
}

export const defineVueRender = ({
  onCreatedApp = () => {},
  onPrefetchData,
}: DefineVueRenderOptions = {}) => {
  return defineRender<VueRenderOptions>(
    async (context, { vue: ssrContext } = {}) => {
      const componentDescriptor = getComponentDescriptor(context);
      const { component, props } = componentDescriptor;
      const state = onPrefetchData
        ? await onPrefetchData(context, component, props)
        : undefined;
      const mergedProps = (
        state ? Object.assign({}, state, props) : props
      ) as Record<string, any>;

      if (state) {
        const stateStringify = htmlEscapeJsonString(JSON.stringify(state));
        const vNode = h(Fragment, null, [
          h(component, mergedProps),
          h("script", {
            as: "state",
            type: "application/json",
            innerHTML: stateStringify,
          }),
        ]);

        const app = createSSRApp(vNode);
        onCreatedApp(app, context, component, mergedProps);

        return renderToWebStream(app, ssrContext);
      } else {
        const app = createSSRApp(component, mergedProps);
        await onCreatedApp(app, context, component, mergedProps);
        return renderToWebStream(app, ssrContext);
      }
    }
  );
};

export const render = defineVueRender();
