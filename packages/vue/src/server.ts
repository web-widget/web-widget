import type { App, Component } from "vue";
import { createSSRApp } from "vue";
import type {
  ComponentProps,
  RenderContext,
} from "@web-widget/schema/server-helpers";
import { defineRender } from "@web-widget/schema/server-helpers";
import { renderToWebStream } from "vue/server-renderer";

export * from "./web-widget";
export * from "@web-widget/schema/server-helpers";
export interface DefineVueRenderOptions {
  onCreatedApp?: (
    app: App,
    context: RenderContext,
    component: Component,
    props: ComponentProps
  ) => void;
}

export const defineVueRender = ({
  onCreatedApp = () => {},
}: DefineVueRenderOptions = {}) => {
  return defineRender(async (context, component, props) => {
    const rootProps = props as Record<string, any>;
    const app = createSSRApp(component, rootProps);
    onCreatedApp(app, context, component, props);
    return renderToWebStream(app);
  });
};

export const render = defineVueRender();
