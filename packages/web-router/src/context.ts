/**
 * @fileoverview Context domain object - Request context and state management
 */
import type { Env, ExecutionContext, FetchContext } from './types';

interface ContextOptions<E extends Env> {
  env: E['Bindings'];
  executionContext?: ExecutionContext;
  /** Client Request; defaults to `request` when omitted. */
  originalRequest?: RequestInput;
}

/** @internal A host-provided request that materializes on first public access. */
export interface RequestSource {
  readonly method: string;
  readonly url: string;
  toRequest(): Request;
}

export type RequestInput = Request | RequestSource;

function isRequestSource(request: RequestInput): request is RequestSource {
  return 'toRequest' in request;
}

type RewriteDispatcher = (
  context: Context,
  state: unknown,
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;

const EMPTY_PARAMS = Object.freeze(Object.create(null));
const EMPTY_PENDING_TASKS = Object.freeze([]) as readonly Promise<unknown>[];

/**
 * HTTP dispatch context (`FetchContext`).
 * Route fields (`module`, `render`, `html`, …) are provided by {@link ModuleRuntime}.
 */
export class Context<E extends Env = Env> implements FetchContext {
  #state?: Record<string, unknown>;
  #request?: Request;
  #requestSource?: RequestSource;
  #originalRequest?: Request;
  #originalRequestSource?: RequestSource;
  // /** @experimental */
  // env: E["Bindings"] = Object.create(null);
  params = EMPTY_PARAMS;
  /** @deprecated */
  pathname: string = '*';
  #waitUntil?: FetchContext['waitUntil'];
  #executionContext?: ExecutionContext;
  #pendingBackgroundTasks?: Set<Promise<unknown>>;
  #rewrite?: FetchContext['rewrite'];
  #rewriteDispatcher?: RewriteDispatcher;
  #rewriteState?: unknown;

  get rewrite(): FetchContext['rewrite'] {
    return (this.#rewrite ??= (input, init) =>
      this.#rewriteDispatcher!(this, this.#rewriteState, input, init));
  }

  constructor(request: RequestInput, options?: ContextOptions<E>) {
    if (isRequestSource(request)) this.#requestSource = request;
    else this.#request = request;

    const originalRequest = options?.originalRequest;
    if (originalRequest !== undefined && originalRequest !== request) {
      if (isRequestSource(originalRequest)) {
        this.#originalRequestSource = originalRequest;
      } else {
        this.#originalRequest = originalRequest;
      }
    }
    this.#executionContext = options?.executionContext;
  }

  get request(): Request {
    return (this.#request ??= this.#requestSource!.toRequest());
  }

  get originalRequest(): Request {
    return (this.#originalRequest ??=
      this.#originalRequestSource?.toRequest() ?? this.request);
  }

  /** @internal Reads the dispatch method without forcing Request creation. */
  get requestMethod(): string {
    return this.#request?.method ?? this.#requestSource!.method;
  }

  /** @internal Updated by Application on rewrite. */
  updateRequest(request: Request): void {
    this.#request = request;
    this.#requestSource = undefined;
  }

  get state() {
    return (this.#state ??= Object.create(null));
  }

  /** @internal Configures lazy rewrite dispatch without allocating a closure. */
  setRewriteDispatcher(dispatcher: RewriteDispatcher, state: unknown): void {
    this.#rewriteDispatcher = dispatcher;
    this.#rewriteState = state;
  }

  get waitUntil() {
    if (this.#waitUntil) {
      return this.#waitUntil;
    } else if (this.#executionContext) {
      const delegate = this.#executionContext.waitUntil.bind(
        this.#executionContext
      );
      return (this.#waitUntil = (promise: Promise<unknown>) => {
        const pending = (this.#pendingBackgroundTasks ??= new Set());
        const tracked = Promise.resolve(promise).finally(() => {
          pending.delete(tracked);
        });
        pending.add(tracked);
        delegate(promise);
      });
    } else {
      throw new Error('This context has no FetchEvent.');
    }
  }

  /** @internal Pending promises registered via {@link waitUntil}. */
  getPendingBackgroundTasks(): readonly Promise<unknown>[] {
    return this.#pendingBackgroundTasks
      ? [...this.#pendingBackgroundTasks]
      : EMPTY_PENDING_TASKS;
  }
}
