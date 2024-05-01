import type { MiddlewareContext } from '@web-widget/schema';

type JSONValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JSONValue }
  | JSONValue[];

export type JSONObject = { [key: string]: JSONValue };

export interface SafeSerializableContext extends Partial<MiddlewareContext> {
  params: Record<string, string>;
  /** @deprecated */
  pathname: string;
  request: Request;
  state: JSONObject;
}
