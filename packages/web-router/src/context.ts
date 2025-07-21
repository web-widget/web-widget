/**
 * @fileoverview Context domain object - Request context and state management
 */
import type {
  ExecutionContext,
  FetchContext,
  HTTPException,
  Meta,
  RouteModule,
  RouteRenderOptions,
  ServerRenderOptions,
} from './types';

interface ContextOptions {
  executionContext?: ExecutionContext;
}

type WaitUntil = FetchContext['waitUntil'];

const DEFAULT_SCOPE = Object.freeze(new URLPattern());
const DEFAULT_PARAMS = Object.freeze(Object.create(null));

/**
 * Context domain object
 *
 * Enhanced context object containing:
 * - Request/response state management
 * - Module and rendering state
 * - Rendering methods
 * - Error handling state
 */
export class Context implements FetchContext {
  #state: Record<string, unknown> = Object.create(null);
  #url?: URL;
  params = DEFAULT_PARAMS;
  scope = DEFAULT_SCOPE;
  request: Request;
  #waitUntil?: WaitUntil;
  #executionContext?: ExecutionContext;

  // New: Module and rendering related state
  module?: RouteModule;
  meta?: Meta;
  renderOptions?: RouteRenderOptions;
  renderer?: ServerRenderOptions;
  data?: unknown;
  error?: HTTPException;

  constructor(request: Request, options: ContextOptions = {}) {
    this.request = request;
    this.#executionContext = options.executionContext;
  }

  get state() {
    return this.#state;
  }

  get url() {
    if (!this.#url) {
      this.#url = new URL(this.request.url);
    }
    return this.#url;
  }

  get waitUntil() {
    if (!this.#executionContext) {
      throw new Error('This context has no FetchEvent.');
    }

    if (!this.#waitUntil) {
      this.#waitUntil = this.#executionContext.waitUntil.bind(
        this.#executionContext
      );
    }

    return this.#waitUntil;
  }

  /** @deprecated */
  get pathname() {
    console.warn(
      'The `pathname` property is deprecated. Use `scope.pathname` instead.'
    );
    return this.scope.pathname;
  }

  /**
   * Render page response
   * This method will be bound with concrete implementation in Engine
   */
  render?: (
    options?: {
      data?: unknown;
      error?: HTTPException;
      meta?: Meta;
    },
    renderOptions?: RouteRenderOptions & ResponseInit
  ) => Promise<Response>;

  /**
   * Render page response
   * This method will be bound with concrete implementation in Engine
   */
  html?: (
    data?: unknown,
    options?: {
      error?: HTTPException;
      meta?: Meta;
      renderer?: ServerRenderOptions;
    } & ResponseInit
  ) => Promise<Response>;
}
