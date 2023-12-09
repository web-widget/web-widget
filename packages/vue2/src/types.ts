import type { Component, default as Vue } from "vue";
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
  onBeforeCreateApp?: (
    context: RenderContext,
    component: Component,
    props: ComponentProps
  ) => Promise<any>;
  onCreatedApp?: (
    app: Vue,
    context: RenderContext,
    component: Component,
    props: ComponentProps
  ) => Promise<void>;
  onPrefetchData?: (
    context: RenderContext,
    component: Component,
    props: ComponentProps
  ) => Promise<JSONProps>;
}
