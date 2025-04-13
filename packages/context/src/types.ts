import type { MiddlewareContext, Serializable } from '@web-widget/schema';

interface SerializableObject {
  [key: string]: Serializable;
}

export interface SafeSerializableContext extends Partial<MiddlewareContext> {
  params: Record<string, string>;
  /** @deprecated */
  pathname: string;
  request: Request;
  state: SerializableObject;
}
