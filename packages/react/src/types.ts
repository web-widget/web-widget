import type { Component } from "react";
import type { ComponentProps, RenderContext } from "@web-widget/schema";

export * from "./web-widget";

type JSONValue =
  | string
  | number
  | boolean
  | { [x: string]: JSONValue }
  | Array<JSONValue>;

type JSONProps = { [x: string]: JSONValue };

export interface DefineVueRenderOptions {
  onPrefetchData?: (
    context: RenderContext,
    component: Component,
    props: ComponentProps
  ) => Promise<JSONProps>;
}
