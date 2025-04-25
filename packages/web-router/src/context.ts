import type { Env, ExecutionContext, FetchContext } from './types';

interface ContextOptions<E extends Env> {
  env: E['Bindings'];
  executionContext?: ExecutionContext;
}

type WaitUntil = FetchContext['waitUntil'];

const DEFAULT_SCOPE = Object.freeze(new URLPattern());
const DEFAULT_PARAMS = Object.freeze(Object.create(null));

export class Context<E extends Env = any> implements FetchContext {
  #state = Object.create(null);
  // /** @experimental */
  // env: E["Bindings"] = Object.create(null);
  params = DEFAULT_PARAMS;
  request: Request;
  scope: URLPattern = DEFAULT_SCOPE;
  #waitUntil?: WaitUntil;
  #executionContext?: ExecutionContext;

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

  /** @deprecated Use `scope.pathname` instead. */
  get pathname() {
    console.warn(
      'The `pathname` property is deprecated. Use `scope.pathname` instead.'
    );
    return this.scope.pathname;
  }
}
