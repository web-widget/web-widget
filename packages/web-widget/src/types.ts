import type { WidgetModule, Meta } from "@web-widget/schema/helpers";
export type * from "@web-widget/schema/helpers";

type JSONValue =
  | string
  | number
  | boolean
  | { [x: string]: JSONValue }
  | Array<JSONValue>;

type JSONProps = { [x: string]: JSONValue };

export type Loader = () => Promise<WidgetModule>;

export interface WebWidgetContainerOptions {
  base?: string;
  children /**/?: string;
  data?: JSONProps;
  import?: string;
  inactive?: boolean;
  loading?: "lazy" | "eager" | "idle";
  meta?: Meta;
  name?: string;
  renderStage /**/?: "server" | "client";
  renderTarget?: "light" | "shadow";
}
