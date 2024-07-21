import type { MiddlewareContext, SerializableValue } from '@web-widget/schema';

interface SerializableObject {
  [key: string]: SerializableValue;
}

export interface SafeSerializableContext extends Partial<MiddlewareContext> {
  params: Record<string, string>;
  request: Request;
  state: SerializableObject;
}
