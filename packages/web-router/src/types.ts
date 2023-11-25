/* eslint-disable @typescript-eslint/no-unused-vars */
import type {
  Meta,
  RouteModule,
  RouteRenderResult,
  WidgetComponent,
  WidgetComponentProps,
  WidgetModule,
  WidgetRender,
  WidgetRenderContext,
  WidgetRenderResult,
} from "@web-widget/schema/server-helpers";

import type { Context } from "./context";
import type { Application } from "./application";

export * from "@web-widget/schema/server-helpers";

////////////////////////////////////////
//////                            //////
//////           Utils            //////
//////                            //////
////////////////////////////////////////

type IfAnyThenEmptyObject<T> = 0 extends 1 & T ? {} : T;

type IntersectNonAnyTypes<T extends any[]> = T extends [
  infer Head,
  ...infer Rest,
]
  ? IfAnyThenEmptyObject<Head> & IntersectNonAnyTypes<Rest>
  : {};

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;

////////////////////////////////////////
//////                            //////
//////           Values           //////
//////                            //////
////////////////////////////////////////

export type StatusCode = number;
export type Bindings = Record<string, unknown>;
export type Variables = Record<string, unknown>;

export type Env = {
  Bindings?: Bindings;
  Variables?: Variables;
};

export type Next = () => Promise<Response>;

export type Input = {
  in?: Partial<ValidationTargets>;
  out?: Partial<{ [K in keyof ValidationTargets]: unknown }>;
};

export { Context };

////////////////////////////////////////
//////                            //////
//////          Handlers          //////
//////                            //////
////////////////////////////////////////

type HandlerResponse = Response | Promise<Response>;

export type Handler<E extends Env = any, R extends HandlerResponse = any> = (
  c: Context<E>,
  next: Next
) => R;

export type MiddlewareHandler<E extends Env = any> = (
  c: Context<E>,
  next: Next
) => Promise<Response>;

export type H<E extends Env = any, R extends HandlerResponse = any> =
  | Handler<E, R>
  | MiddlewareHandler<E>;

export type NotFoundHandler<E extends Env = any> = (
  c: Context<E>
) => Response | Promise<Response>;
export type ErrorHandler<E extends Env = any> = (
  err: Error,
  c: Context<E>
) => Response | Promise<Response>;

////////////////////////////////////////
//////                            //////
//////     HandlerInterface       //////
//////                            //////
////////////////////////////////////////

export interface HandlerInterface<
  E extends Env = Env,
  M extends string = string,
  S extends Schema = {},
  BasePath extends string = "/",
> {
  //// app.get(...handlers[])

  // app.get(handler)
  <
    P extends string = ExtractKey<S> extends never ? BasePath : ExtractKey<S>,
    I extends Input = {},
    R extends HandlerResponse = any,
    E2 extends Env = E,
  >(
    handler: H<E2, R>
  ): Application<E & E2, S & ToSchema<M, P, I["in"], R>, BasePath>;

  // app.get(handler, handler)
  <
    P extends string = ExtractKey<S> extends never ? BasePath : ExtractKey<S>,
    I extends Input = {},
    R extends HandlerResponse = any,
    E2 extends Env = E,
    E3 extends Env = IntersectNonAnyTypes<[E, E2]>,
  >(
    ...handlers: [H<E2, R>, H<E3, R>]
  ): Application<E & E2 & E3, S & ToSchema<M, P, I["in"], R>, BasePath>;

  // app.get(handler x 3)
  <
    P extends string = ExtractKey<S> extends never ? BasePath : ExtractKey<S>,
    R extends HandlerResponse = any,
    I extends Input = {},
    I2 extends Input = I,
    I3 extends Input = I & I2,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>,
  >(
    ...handlers: [H<E2, R>, H<E3, R>, H<E4, R>]
  ): Application<E & E2 & E3 & E4, S & ToSchema<M, P, I3["in"], R>, BasePath>;

  // app.get(handler x 4)
  <
    P extends string = ExtractKey<S> extends never ? BasePath : ExtractKey<S>,
    R extends HandlerResponse = any,
    I extends Input = {},
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I & I2 & I3,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4]>,
  >(
    ...handlers: [H<E2, R>, H<E3, R>, H<E4, R>, H<E5, R>]
  ): Application<
    E & E2 & E3 & E4 & E5,
    S & ToSchema<M, P, I4["in"], R>,
    BasePath
  >;

  // app.get(handler x 5)
  <
    P extends string = ExtractKey<S> extends never ? BasePath : ExtractKey<S>,
    R extends HandlerResponse = any,
    I extends Input = {},
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I2 & I3,
    I5 extends Input = I & I2 & I3 & I4,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = E,
    E6 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5]>,
  >(
    ...handlers: [H<E2, R>, H<E3, R>, H<E4, R>, H<E5, R>, H<E6, R>]
  ): Application<
    E & E2 & E3 & E4 & E5 & E6,
    S & ToSchema<M, P, I5["in"], R>,
    BasePath
  >;

  // app.get(...handlers[])
  <
    P extends string = ExtractKey<S> extends never ? BasePath : ExtractKey<S>,
    I extends Input = {},
    R extends HandlerResponse = any,
  >(
    ...handlers: H<E, R>[]
  ): Application<E, S & ToSchema<M, P, I["in"], R>, BasePath>;

  ////  app.get(path)

  // app.get(path)
  <P extends string, R extends HandlerResponse = any, I extends Input = {}>(
    path: P
  ): Application<
    E,
    S & ToSchema<M, MergePath<BasePath, P>, I["in"], R>,
    BasePath
  >;

  ////  app.get(path, ...handlers[])

  // app.get(path, handler)
  <
    P extends string,
    P2 extends string = P,
    R extends HandlerResponse = any,
    I extends Input = {},
    E2 extends Env = E,
  >(
    path: P,
    handler: H<E2, R>
  ): Application<
    E & E2,
    S & ToSchema<M, MergePath<BasePath, P>, I["in"], R>,
    BasePath
  >;

  // app.get(path, handler, handler)
  <
    P extends string,
    P2 extends string = P,
    P3 extends string = P,
    R extends HandlerResponse = any,
    I extends Input = {},
    E2 extends Env = E,
    E3 extends Env = IntersectNonAnyTypes<[E, E2]>,
  >(
    path: P,
    ...handlers: [H<E2, R>, H<E3, R>]
  ): Application<
    E & E2 & E3,
    S & ToSchema<M, MergePath<BasePath, P>, I["in"], R>,
    BasePath
  >;

  // app.get(path, handler x3)
  <
    P extends string,
    P2 extends string = P,
    P3 extends string = P,
    P4 extends string = P,
    R extends HandlerResponse = any,
    I extends Input = {},
    I2 extends Input = I,
    I3 extends Input = I & I2,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>,
  >(
    path: P,
    ...handlers: [H<E2, R>, H<E3, R>, H<E4, R>]
  ): Application<
    E & E2 & E3 & E4,
    S & ToSchema<M, MergePath<BasePath, P>, I3["in"], R>,
    BasePath
  >;

  // app.get(path, handler x4)
  <
    P extends string,
    P2 extends string = P,
    P3 extends string = P,
    P4 extends string = P,
    P5 extends string = P,
    R extends HandlerResponse = any,
    I extends Input = {},
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I & I2 & I3,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4]>,
  >(
    path: P,
    ...handlers: [H<E2, R>, H<E3, R>, H<E4, R>, H<E5, R>]
  ): Application<
    E & E2 & E3 & E4 & E5,
    S & ToSchema<M, MergePath<BasePath, P>, I4["in"], R>,
    BasePath
  >;

  // app.get(path, handler x5)
  <
    P extends string,
    P2 extends string = P,
    P3 extends string = P,
    P4 extends string = P,
    P5 extends string = P,
    P6 extends string = P,
    R extends HandlerResponse = any,
    I extends Input = {},
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I2 & I3,
    I5 extends Input = I & I2 & I3 & I4,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = E,
    E6 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5]>,
  >(
    path: P,
    ...handlers: [H<E2, R>, H<E3, R>, H<E4, R>, H<E5, R>, H<E6, R>]
  ): Application<
    E & E2 & E3 & E4 & E5 & E6,
    S & ToSchema<M, MergePath<BasePath, P>, I5["in"], R>,
    BasePath
  >;

  // app.get(path, ...handlers[])
  <P extends string, I extends Input = {}, R extends HandlerResponse = any>(
    path: P,
    ...handlers: H<E, R>[]
  ): Application<
    E,
    S & ToSchema<M, MergePath<BasePath, P>, I["in"], R>,
    BasePath
  >;
}

////////////////////////////////////////
//////                            //////
////// MiddlewareHandlerInterface //////
//////                            //////
////////////////////////////////////////

export interface MiddlewareHandlerInterface<
  E extends Env = Env,
  S extends Schema = {},
  BasePath extends string = "/",
> {
  //// app.get(...handlers[])
  <E2 extends Env = E>(
    ...handlers: MiddlewareHandler<E2>[]
  ): Application<E, S, BasePath>;

  //// app.get(path, ...handlers[])
  <P extends string, E2 extends Env = E>(
    path: P,
    ...handlers: MiddlewareHandler<E2>[]
  ): Application<E, S, BasePath>;
}

////////////////////////////////////////
//////                            //////
//////     OnHandlerInterface     //////
//////                            //////
////////////////////////////////////////

export interface OnHandlerInterface<
  E extends Env = Env,
  S extends Schema = {},
  BasePath extends string = "/",
> {
  // app.on(method, path, handler, handler)
  <
    M extends string,
    P extends string,
    P2 extends string = P,
    P3 extends string = P,
    R extends HandlerResponse = any,
    I extends Input = {},
    E2 extends Env = E,
    E3 extends Env = IntersectNonAnyTypes<[E, E2]>,
  >(
    method: M,
    path: P,
    ...handlers: [H<E2, R>, H<E3, R>]
  ): Application<
    E,
    S & ToSchema<M, MergePath<BasePath, P>, I["in"], R>,
    BasePath
  >;

  // app.get(method, path, handler x3)
  <
    M extends string,
    P extends string,
    P2 extends string = P,
    P3 extends string = P,
    P4 extends string = P,
    R extends HandlerResponse = any,
    I extends Input = {},
    I2 extends Input = I,
    I3 extends Input = I & I2,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>,
  >(
    method: M,
    path: P,
    ...handlers: [H<E2, R>, H<E3, R>, H<E4, R>]
  ): Application<
    E,
    S & ToSchema<M, MergePath<BasePath, P>, I3["in"], R>,
    BasePath
  >;
  // app.get(method, path, handler x4)
  <
    M extends string,
    P extends string,
    P2 extends string = P,
    P3 extends string = P,
    P4 extends string = P,
    P5 extends string = P,
    R extends HandlerResponse = any,
    I extends Input = {},
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I & I2 & I3,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4]>,
  >(
    method: M,
    path: P,
    ...handlers: [H<E2, R>, H<E3, R>, H<E4, R>, H<E5, R>]
  ): Application<
    E,
    S & ToSchema<M, MergePath<BasePath, P>, I4["in"], R>,
    BasePath
  >;

  // app.get(method, path, handler x5)
  <
    M extends string,
    P extends string,
    P2 extends string = P,
    P3 extends string = P,
    P4 extends string = P,
    P5 extends string = P,
    P6 extends string = P,
    R extends HandlerResponse = any,
    I extends Input = {},
    I2 extends Input = I,
    I3 extends Input = I & I2,
    I4 extends Input = I & I2 & I3,
    I5 extends Input = I & I2 & I3 & I4,
    E2 extends Env = E,
    E3 extends Env = E,
    E4 extends Env = E,
    E5 extends Env = E,
    E6 extends Env = IntersectNonAnyTypes<[E, E2, E3, E4, E5]>,
  >(
    method: M,
    path: P,
    ...handlers: [H<E2, R>, H<E3, R>, H<E4, R>, H<E5, R>, H<E6, R>]
  ): Application<
    E,
    S & ToSchema<M, MergePath<BasePath, P>, I5["in"], R>,
    BasePath
  >;

  <
    M extends string,
    P extends string,
    R extends HandlerResponse = any,
    I extends Input = {},
  >(
    method: M,
    path: P,
    ...handlers: H<E, R>[]
  ): Application<
    E,
    S & ToSchema<M, MergePath<BasePath, P>, I["in"], R>,
    BasePath
  >;

  // app.on(method[], path, ...handler)
  <P extends string, R extends HandlerResponse = any, I extends Input = {}>(
    methods: string[],
    path: P,
    ...handlers: H<E, R>[]
  ): Application<
    E,
    S & ToSchema<string, MergePath<BasePath, P>, I["in"], R>,
    BasePath
  >;
}

type ExtractKey<S> = S extends Record<infer Key, unknown>
  ? Key extends string
    ? Key
    : never
  : string;

////////////////////////////////////////
//////                            //////
//////           ToSchema         //////
//////                            //////
////////////////////////////////////////

export type ToSchema<
  M extends string,
  P extends string,
  I extends Input["in"],
  O,
> = {
  [K in P]: {
    [K2 in M as AddDollar<K2>]: {
      input: unknown extends I ? AddParam<{}, P> : AddParam<I, P>;
      output: unknown extends O ? {} : O;
    };
  };
};

export type Schema = {
  [Path: string]: {
    [Method: `$${Lowercase<string>}`]: {
      input: Partial<ValidationTargets> & {
        param?: Record<string, string>;
      };
      output: {};
    };
  };
};

export type MergeSchemaPath<OrigSchema, SubPath extends string> = {
  [K in keyof OrigSchema as `${MergePath<SubPath, K & string>}`]: OrigSchema[K];
};

export type AddParam<I, P extends string> = ParamKeys<P> extends never
  ? I
  : I & { param: UnionToIntersection<ParamKeyToRecord<ParamKeys<P>>> };

type AddDollar<T extends string> = `$${Lowercase<T>}`;

export type MergePath<A extends string, B extends string> = A extends ""
  ? B
  : A extends "/"
  ? B
  : A extends `${infer P}/`
  ? B extends `/${infer Q}`
    ? `${P}/${Q}`
    : `${P}/${B}`
  : B extends `/${infer Q}`
  ? Q extends ""
    ? A
    : `${A}/${Q}`
  : `${A}/${B}`;

////////////////////////////////////////
//////                             /////
//////      ValidationTargets      /////
//////                             /////
////////////////////////////////////////

export type ValidationTargets = {};

////////////////////////////////////////
//////                            //////
//////      Path parameters       //////
//////                            //////
////////////////////////////////////////

type ParamKeyName<NameWithPattern> =
  NameWithPattern extends `${infer Name}{${infer Rest}`
    ? Rest extends `${infer _Pattern}?`
      ? `${Name}?`
      : Name
    : NameWithPattern;

type ParamKey<Component> = Component extends `:${infer NameWithPattern}`
  ? ParamKeyName<NameWithPattern>
  : never;

export type ParamKeys<Path> = Path extends `${infer Component}/${infer Rest}`
  ? ParamKey<Component> | ParamKeys<Rest>
  : ParamKey<Path>;

export type ParamKeyToRecord<T extends string> = T extends `${infer R}?`
  ? Record<R, string | undefined>
  : { [K in T]: string };

////////////////////////////////////////
//////                            //////
//////         FetchEvent         //////
//////                            //////
////////////////////////////////////////

export abstract class FetchEventLike {
  abstract readonly request: Request;
  abstract respondWith(promise: Response | Promise<Response>): void;
  abstract passThroughOnException(): void;
  abstract waitUntil(promise: Promise<void>): void;
}

////////////////////////////////////////
//////                            //////
//////         MANIFEST         //////
//////                            //////
////////////////////////////////////////

export type Manifest = ManifestResolved;

export interface ManifestResolved {
  routes: {
    module: RouteModule | (() => Promise<RouteModule>);
    name?: string;
    pathname: string;
  }[];
  middlewares: {
    module: MiddlewareModule | (() => Promise<MiddlewareModule>);
    name?: string;
    pathname: string;
  }[];
  fallbacks: {
    module: RouteModule | (() => Promise<RouteModule>);
    name: string;
    pathname: string;
  }[];
  layout: {
    module: LayoutModule | (() => Promise<LayoutModule>);
  };
}

export interface ManifestJSON {
  $schema?: string;
  routes?: {
    module: string;
    name?: string;
    pathname: string;
  }[];
  middlewares?: {
    module: string;
    name?: string;
    pathname: string;
  }[];
  fallbacks?: {
    module: string;
    name: string;
    pathname: string;
  }[];
  layout?: {
    module: string;
    name?: string;
  };
}

// --- MIDDLEWARE ---

export interface MiddlewareModule {
  handler: MiddlewareHandler;
}

// --- LAYOUT ---

export interface LayoutModule extends WidgetModule {}
export type LayoutComponentProps = WidgetComponentProps;
export interface LayoutComponent extends WidgetComponent {}
export interface LayoutRenderContext extends WidgetRenderContext {}
export type LayoutRenderResult = WidgetRenderResult;
export interface LayoutRender extends WidgetRender {}

export interface LayoutModuleDescriptor {
  module: LayoutModule;
  name?: string;
  render: LayoutRender;
}

export interface RootLayoutComponentProps {
  children: RouteRenderResult;
  meta: Meta;
  params: Record<string, string>;
  pathname: string;
  request: Request;
}
