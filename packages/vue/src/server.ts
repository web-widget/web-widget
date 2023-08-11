import type { App } from "vue";
import { createSSRApp } from "vue";
import { defineRender } from "@web-widget/schema/server-helpers";
import { renderToWebStream } from "vue/server-renderer";

export * from "@web-widget/schema/server-helpers";
export interface DefineVueRenderOptions {
  onCreatedApp?: (app: App) => void;
}

export const defineVueRender = ({
  onCreatedApp = () => {},
}: DefineVueRenderOptions = {}) => {
  return defineRender(async (context, component, props) => {
    const app = createSSRApp(component, props as Record<string, any>);
    onCreatedApp(app);
    return renderToWebStream(app);
  });
};

export const render = defineVueRender();
