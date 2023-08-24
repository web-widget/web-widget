import type { WidgetModule } from "@web-widget/schema";

export type * from "./modules/types";

type JSONValue =
  | string
  | number
  | boolean
  | { [x: string]: JSONValue }
  | Array<JSONValue>;

type JSONProps = { [x: string]: JSONValue };

export type Loader = () => Promise<WidgetModule>;

export interface WebWidgetContainerProps {
  base?: string;
  children /**/?: string;
  data?: JSONProps;
  import?: string;
  inactive?: boolean;
  loading?: string;
  name?: string;
  renderStage /**/?: "server" | "client";
  renderTarget?: "light" | "shadow";
}
