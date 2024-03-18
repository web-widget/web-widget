import type { MiddlewareContext, ScriptDescriptor } from '@web-widget/schema';
import type { JSONObject, SerializableContext } from './types';
import { tryGetAsyncLocalStorage } from './context';
import { SCRIPT_ID, EXPOSED_TO_CLIENT } from './constants';
export const exposedToClient = EXPOSED_TO_CLIENT;

function toJSON(this: any): JSONObject {
  const exposed = this[exposedToClient];
  if (exposed) {
    return pick(this, exposed);
  }
  return {};
}

export function allowExposedToClient(
  object: any,
  allow: string[],
  replace?: boolean
) {
  if (replace) {
    object[exposedToClient] = allow;
  } else {
    object[exposedToClient] = [...(object[exposedToClient] ?? []), ...allow];
  }
}

export function createSerializableContext(
  context: MiddlewareContext
): SerializableContext {
  return {
    ...context,
    state: Object.assign(context.state, { toJSON }),
    [exposedToClient]: ['pathname', 'params', 'state'],
    toJSON,
    widgetState: Object.create(null),
  };
}

export function contextToScriptDescriptor(
  context: SerializableContext
): ScriptDescriptor {
  return {
    id: SCRIPT_ID,
    type: 'application/json',
    // TODO htmlEscapeJsonString
    content: JSON.stringify(context),
  };
}

function pick(object: Record<string, any>, keys: string[]): any {
  const newObject = {};
  for (const key of keys) {
    (newObject as any)[key] = object[key];
  }
  return newObject;
}

export function callContext<T extends (...args: any[]) => any>(
  data: SerializableContext,
  setup: T,
  args?: Parameters<T>
) {
  const ctx = tryGetAsyncLocalStorage<SerializableContext>();
  const fn: () => ReturnType<T> = () =>
    args ? setup(...(args as Parameters<T>)) : setup();
  return ctx.call(data, fn);
}

export function useContext() {
  const ctx = tryGetAsyncLocalStorage();
  return ctx.use() as SerializableContext;
}
