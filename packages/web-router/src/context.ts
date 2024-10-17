import type { Env, ExecutionContext, FetchContext } from './types';

interface ContextOptions<E extends Env> {
  env: E['Bindings'];
  executionContext?: ExecutionContext;
}

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
}
