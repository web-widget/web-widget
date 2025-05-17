import { KnownMethods, FetchContext } from './http';
import { RouteContext } from './route-module';

export interface MiddlewareModule {
  handler?: MiddlewareHandler | MiddlewareHandlers;
}

export interface MiddlewareHandler {
  (
    context: MiddlewareContext,
    next: MiddlewareNext
  ): MiddlewareResult | Promise<MiddlewareResult>;
}

export type MiddlewareHandlers = {
  [K in KnownMethods]?: MiddlewareHandler;
};

export interface MiddlewareContext
  extends FetchContext,
    Partial<Omit<RouteContext<any, any>, keyof FetchContext<any>>> {}

export interface MiddlewareNext {
  (): MiddlewareResult | Promise<MiddlewareResult>;
}

export type MiddlewareResult = Response;
