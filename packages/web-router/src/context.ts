/**
 * @fileoverview Context domain object - Request context and state management
 */
import type {
  Env,
  ExecutionContext,
  FetchContext,
  HTTPException,
  Meta,
  RouteModule,
  RouteRenderOptions,
  ServerRenderOptions,
} from './types';

interface ContextOptions<E extends Env> {
  env: E['Bindings'];
  executionContext?: ExecutionContext;
}

/**
 * Context domain object
 *
 * Enhanced context object containing:
 * - Request/response state management
 * - Module and rendering state
 * - Rendering methods
 * - Error handling state
 */
export class Context<E extends Env = any> implements FetchContext {
  #state = Object.create(null);
  // /** @experimental */
  // env: E["Bindings"] = Object.create(null);
  params = Object.create(null);
  /** @deprecated */
  pathname: string = '*';
  request: Request;
  #waitUntil?: FetchContext['waitUntil'];
  #executionContext?: ExecutionContext;

  // New: Module and rendering related state
  module?: RouteModule;
  meta?: Meta;
  renderOptions?: RouteRenderOptions;
  renderer?: ServerRenderOptions;
  data?: unknown;
  error?: HTTPException;

  constructor(request: Request, options?: ContextOptions<E>) {
    this.request = request;
    this.#executionContext = options?.executionContext;
  }

  get state() {
    return this.#state;
  }

  get waitUntil() {
    if (this.#waitUntil) {
      return this.#waitUntil;
    } else if (this.#executionContext) {
      return (this.#waitUntil = this.#executionContext.waitUntil.bind(
        this.#executionContext
      ));
    } else {
      throw new Error('This context has no FetchEvent.');
    }
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
