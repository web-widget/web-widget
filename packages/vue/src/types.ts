import type { Component, App } from "vue";
import type { ComponentProps, RenderContext } from "@web-widget/schema";

export * from "./web-widget";

type JSONValue =
  | string
  | number
  | boolean
  | { [x: string]: JSONValue }
  | Array<JSONValue>;

type JSONProps = { [x: string]: JSONValue };

export interface CreateVueRenderOptions {
  onCreatedApp?: (
    app: App<Element>,
    context: RenderContext,
    component: Component,
    props: ComponentProps
  ) => Promise<void>;
  /**@deprecated*/
  onPrefetchData?: (
    context: RenderContext,
    component: Component,
    props: ComponentProps
  ) => Promise<JSONProps>;
}
