/**
 * @fileoverview Context domain object - Request context and state management
 */
import type { Env, ExecutionContext, FetchContext } from './types';

interface ContextOptions<E extends Env> {
  env: E['Bindings'];
  executionContext?: ExecutionContext;
  /** Client Request; defaults to `request` when omitted. */
  originalRequest?: Request;
}

/**
 * HTTP dispatch context (`FetchContext`).
 * Route fields (`module`, `render`, `html`, …) are provided by {@link ModuleRuntime}.
 */
export class Context<E extends Env = Env> implements FetchContext {
  #state = Object.create(null);
  #request: Request;
  // /** @experimental */
  // env: E["Bindings"] = Object.create(null);
  params = Object.create(null);
  /** @deprecated */
  pathname: string = '*';
  readonly originalRequest: Request;
  #waitUntil?: FetchContext['waitUntil'];
  #executionContext?: ExecutionContext;

  /** Bound per request in Application.handler. */
  rewrite!: FetchContext['rewrite'];

  constructor(request: Request, options?: ContextOptions<E>) {
    this.#request = request;
    this.originalRequest = options?.originalRequest ?? request;
    this.#executionContext = options?.executionContext;
  }

  get request(): Request {
    return this.#request;
  }

  /** @internal Updated by Application on rewrite. */
  updateRequest(request: Request): void {
    this.#request = request;
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
}
