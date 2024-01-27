import type { Component } from "react";
import type { ComponentProps, RenderContext } from "@web-widget/helpers";

export * from "./components";

type JSONValue =
  | string
  | number
  | boolean
  | { [x: string]: JSONValue }
  | Array<JSONValue>;

type JSONProps = { [x: string]: JSONValue };

export interface CreateReactRenderOptions {
  /**@deprecated*/
  onPrefetchData?: (
    context: RenderContext,
    component: Component,
    props: ComponentProps
  ) => Promise<JSONProps>;
}
