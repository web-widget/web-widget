import type { WidgetModule, Meta } from "@web-widget/helpers";
export type * from "@web-widget/helpers";

type JSONValue =
  | string
  | number
  | boolean
  | { [x: string]: JSONValue }
  | Array<JSONValue>;

export type JSONProps = { [x: string]: JSONValue };

export type Loader = () => Promise<WidgetModule>;

export interface WebWidgetElementProps {
  base?: string;
  data?: JSONProps;
  import?: string;
  inactive?: boolean;
  loading?: "lazy" | "eager" | "idle";
  meta?: Meta;
  name?: string;
  // recovering?: boolean;
  renderTarget?: "light" | "shadow";
}

export interface WebWidgetRendererOptions extends WebWidgetElementProps {
  children?: string;
  renderStage?: "server" | "client";
}
