/**
 * Middleware module type definitions.
 *
 * This module defines the types for middleware functions that can be
 * executed before route handlers. Middleware provides a way to modify
 * the request context, handle authentication, logging, and other
 * cross-cutting concerns.
 *
 * @module Middleware Module Types
 */

import { KnownMethods, FetchContext } from './http';
import { RouteContext } from './route-module';

/**
 * Represents a middleware module that can contain handlers for different HTTP methods.
 * Middleware functions are executed before route handlers and can modify the request context.
 */
export interface MiddlewareModule {
  /** Middleware handlers for different HTTP methods. */
  handler?: MiddlewareHandler | MiddlewareHandlers;
}

/**
 * Represents a middleware handler function.
 * Middleware handlers receive the context and a next function to continue the chain.
 */
export interface MiddlewareHandler {
  /**
   * Executes the middleware logic.
   * @param context - The request context containing all request information.
   * @param next - Function to call the next middleware or route handler.
   * @returns A promise that resolves to a Response or the Response itself.
   */
  (
    context: MiddlewareContext,
    next: MiddlewareNext
  ): MiddlewareResult | Promise<MiddlewareResult>;
}

/**
 * Represents middleware handlers mapped by HTTP method.
 * Each method can have its own middleware handler.
 */
export type MiddlewareHandlers = {
  [K in KnownMethods]?: MiddlewareHandler;
};

/**
 * The context object passed to middleware handlers.
 * Extends FetchContext with additional route-specific properties.
 */
export interface MiddlewareContext
  extends FetchContext,
    Partial<Omit<RouteContext<any, any>, keyof FetchContext<any>>> {}

/**
 * Function to call the next middleware or route handler in the chain.
 */
export interface MiddlewareNext {
  /**
   * Calls the next middleware or route handler.
   * @returns A promise that resolves to a Response or the Response itself.
   */
  (): MiddlewareResult | Promise<MiddlewareResult>;
}

/**
 * The result type for middleware handlers.
 * Middleware must return a Response object.
 */
export type MiddlewareResult = Response;
