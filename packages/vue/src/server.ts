import { __ENV__ } from "./web-widget";
import { createSSRApp, h, Fragment } from "vue";
import { defineRender } from "@web-widget/schema/server-helpers";
import { renderToWebStream } from "vue/server-renderer";
import type { DefineVueRenderOptions } from "./types";

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

export const defineVueRender = ({
  onCreatedApp = () => {},
  onPrefetchData,
}: DefineVueRenderOptions = {}) => {
  return defineRender(async (context, component, props) => {
    const state = onPrefetchData
      ? await onPrefetchData(context, component, props)
      : undefined;
    const mergedProps = state ? Object.assign(state, props) : props;

    if (state) {
      const stateStringify = htmlEscapeJsonString(JSON.stringify(state));
      const vNode = h(Fragment, null, [
        h(component, mergedProps as Record<string, any>),
        h("script", {
          as: "state",
          type: "application/json",
          innerHTML: stateStringify,
        }),
      ]);

      const app = createSSRApp(vNode);
      onCreatedApp(app, context, component, props);

      return renderToWebStream(app);
    } else {
      const app = createSSRApp(component, mergedProps as Record<string, any>);
      onCreatedApp(app, context, component, props);
      return renderToWebStream(app);
    }
  });
};

export const render = defineVueRender();
