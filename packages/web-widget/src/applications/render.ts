import type {
  WidgetModule,
  WidgetModuleV0,
  WidgetRenderContext,
  WidgetRenderResult,
  WidgetRender,
} from "./types";

export const render = async (
  module: WidgetModule | WidgetModuleV0,
  renderContext: WidgetRenderContext
): Promise<WidgetRenderResult> => {
  if (Reflect.has(module, "render")) {
    // v1
    const { render } = module as WidgetModule;
    return (render as WidgetRender)(renderContext);
  } else {
    // v0
    const render = (module as WidgetModuleV0).default;
    if (typeof render === "function") {
      // @ts-ignore
      return render(renderContext);
    } else {
      // support single-spa app
      return module as WidgetRenderResult;
    }
  }
};
