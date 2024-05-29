import type { MiddlewareContext, SerializableValue } from '@web-widget/schema';

type SerializableObject = { [key: string]: SerializableValue };

export interface SafeSerializableContext extends Partial<MiddlewareContext> {
  params: Record<string, string>;
  /** @deprecated */
  pathname: string;
  request: Request;
  state: SerializableObject;
}
