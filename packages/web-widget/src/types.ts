import type { WidgetModule } from "@web-widget/schema";

export type * from "./applications/types";

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
  loading?: string;
  name?: string;
  recovering?: boolean;
  renderTarget?: "light" | "shadow";
}
