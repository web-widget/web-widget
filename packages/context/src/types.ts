import type { MiddlewareContext } from '@web-widget/schema';
import type { EXPOSED_TO_CLIENT } from './constants';

type JSONValue =
  | string
  | number
  | boolean
  | { [x: string]: JSONValue }
  | Array<JSONValue>;

export type JSONObject = { [x: string]: JSONValue };

export interface SerializableContext extends MiddlewareContext {
  widgetState: Record<string | symbol, any>;
  [EXPOSED_TO_CLIENT]?: string[];
  toJSON?: () => JSONObject;
}

export interface SafeSerializableContext extends Partial<MiddlewareContext> {
  params: Record<string, string>;
  /** @deprecated */
  pathname: string;
  request: Request;
  state: JSONObject;
  widgetState: Record<string | symbol, any>;
}
