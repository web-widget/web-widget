import Vue from "vue";
import { createRenderer } from "vue-server-renderer";
import { defineRender } from "@web-widget/schema/server-helpers";
import type { DefineVueRenderOptions } from "./types";

export * from "@web-widget/schema/server-helpers";
export * from "./web-widget";

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
  onBeforeCreateApp = () => ({}),
  onCreatedApp = () => {},
  onPrefetchData,
}: DefineVueRenderOptions = {}) => {
  return defineRender(async (context, component, props) => {
    const state = onPrefetchData
      ? await onPrefetchData(context, component, props)
      : undefined;
    const mergedProps = state ? Object.assign(state, props) : props;

    const vNodeData: Vue.VNodeData = {
      props: mergedProps as Record<string, any>,
    };
    const renderer = createRenderer();

    const app = new Vue({
      render(h) {
        return h(component, vNodeData);
      },
      ...onBeforeCreateApp(context, component, mergedProps),
    });

    onCreatedApp(app, context, component, mergedProps);

    const content = await renderer.renderToString(app);
    const stateStringify = state
      ? htmlEscapeJsonString(JSON.stringify(state))
      : undefined;
    return [
      `<web-widget.shell>${content}</web-widget.shell>`,
      stateStringify
        ? `<script as="state" type="application/json">${stateStringify}</script>`
        : "",
    ].join("");
  });
};

export const render = defineVueRender();
