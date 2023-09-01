import { defineRender } from "@web-widget/schema/server-helpers";
import { Readable } from "node:stream";
import type { CreateElement, VNode } from "vue";
import Vue from "vue";
import { createRenderer } from "vue-server-renderer";
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
    const shellTag = "web-widget.shell";
    const state = onPrefetchData
      ? await onPrefetchData(context, component, props)
      : undefined;
    const mergedProps = state ? Object.assign(state, props) : props;

    const renderer = createRenderer();
    const vNodeData: Vue.VNodeData = {
      attrs: {
        "data-vue2root": "true",
      },
      props: mergedProps as Record<string, any>,
    };
    const shellTagVNodeData = {};

    let render: (h: CreateElement) => VNode;

    if (state) {
      const stateStringify = htmlEscapeJsonString(JSON.stringify(state));
      render = (h) =>
        // remove: data-server-rendered
        h(shellTag, shellTagVNodeData, [
          h(component, vNodeData),
          h(
            "script",
            {
              attrs: {
                as: "state",
                type: "application/json",
              },
            },
            stateStringify
          ),
        ]);
    } else {
      render = (h) => h(shellTag, shellTagVNodeData, [h(component, vNodeData)]);
    }

    const app = new Vue({
      render,
      ...onBeforeCreateApp(context, component, mergedProps),
    });

    onCreatedApp(app, context, component, mergedProps);

    // NOTE: Node.js Readable.toWeb doesn't seem to be implemented correctly.
    return Readable.toWeb
      ? Readable.toWeb(renderer.renderToStream(app))
      : await renderer.renderToString(app);
  });
};

export const render = defineVueRender();
