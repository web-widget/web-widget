import type { WidgetModule, Meta } from "@web-widget/schema/client-helpers";
export * from "@web-widget/schema/client-helpers";

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
  loading?: "lazy" | "eager";
  meta?: Meta;
  name?: string;
  renderStage /**/?: "server" | "client";
  renderTarget?: "light" | "shadow";
}
