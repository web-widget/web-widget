
export type Data = Record<string, unknown | Promise<unknown>> | null

export type Meta =
  | { charSet: "utf-8" }
  | { title: string }
  | { name: string; content: string }
  | { property: string; content: string }
  | { httpEquiv: string; content: string }
  | { "script:ld+json": LdJsonObject }
  | { style: string }
  | { tagName: "meta" | "link"; [name: string]: string }
  | { [name: string]: unknown };

type LdJsonObject = { [Key in string]: LdJsonValue } & {
  [Key in string]?: LdJsonValue | undefined;
};
type LdJsonArray = LdJsonValue[] | readonly LdJsonValue[]
type LdJsonPrimitive = string | number | boolean | null
type LdJsonValue = LdJsonPrimitive | LdJsonObject | LdJsonArray
type component = unknown
export type ServerRenderResult = string | ReadableStream | WritableStream
export type ClientRenderResult = Lifecycles;
export interface Lifecycles<Content = ClientRenderContext> {
  bootstrap?: (content: Content) => Promise<void>
  mount?: (content: Content) => Promise<void>
  update?: (content: Content) => Promise<void>
  unmount: (content: Content) => Promise<void>
}

export type Route = {
  params: Record<string, string>
  pathname: string
  pathnameBase: string
}

interface BaseRenderContext {
  data?: Data
  meta?: Meta[]
  request: Request
  route?: Route
  component?: component
}

export interface ServerRenderContext extends BaseRenderContext {}
export interface ServerRenderErrorContext extends ServerRenderContext {
  error: Error | Response
}

export interface ClientRenderContext extends BaseRenderContext {
  container: HTMLElement
  recovering: boolean // isHydration
  update: (context: {
    data?: Data
    meta?: Meta[]
  }) => Promise<void>
}

export interface ClientRenderErrorContext extends ClientRenderContext {
  error: Error | Response
}

export interface HandlerContext {
  request: Request
  route?: Route
}

export interface ServerHandlerContext extends HandlerContext {
  render: (context: {
    data?: Data
    meta?: Meta[]
  }) => Promise<Response>
}

export interface ClientHandlerContext extends HandlerContext {
  render: (context: {
    data?: Data
    meta?: Meta[]
  }) => Promise<ClientRenderResult>
}

export interface HandlerFunction {
  (handlerContext: ServerHandlerContext): Promise<Response>;
}

export interface HandlerFunction {
  (handlerContext: ClientHandlerContext): Promise<ClientRenderResult>;
}

export interface RenderFuncton {
  (renderContext: ServerRenderContext): Promise<ServerRenderResult>;
}

export interface RenderFuncton<Content = ClientRenderContext> {
  (renderContext: Content): Promise<ClientRenderResult>;
}

export interface Application {
  handler?: HandlerFunction
  render: RenderFuncton
  component?: component
  default?: component
}

export interface Application_v0 extends Lifecycles {
  default?: (renderContext: ClientRenderContext) => ClientRenderResult
}

export type ApplicationLoader = () => Promise<Application | Application_v0>

