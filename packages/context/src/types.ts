import type { MiddlewareContext } from '@web-widget/schema';

type JSONValue =
  | string
  | number
  | boolean
  | { [x: string]: JSONValue }
  | Array<JSONValue>;

export type JSONObject = { [x: string]: JSONValue };

export interface SafeSerializableContext extends Partial<MiddlewareContext> {
  params: Record<string, string>;
  /** @deprecated */
  pathname: string;
  request: Request;
  state: JSONObject;
}
