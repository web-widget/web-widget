import type { ExecutionContext, FetchContext } from './types';

interface ContextOptions {
  executionContext?: ExecutionContext;
}

type WaitUntil = FetchContext['waitUntil'];

const DEFAULT_SCOPE = Object.freeze(new URLPattern());
const DEFAULT_PARAMS = Object.freeze(Object.create(null));

export class Context implements FetchContext {
  #state: Record<string, unknown> = Object.create(null);
  request: Request;
  params = DEFAULT_PARAMS;
  scope = DEFAULT_SCOPE;
  #waitUntil?: WaitUntil;
  #executionContext?: ExecutionContext;
  #url?: URL;

  constructor(request: Request, options: ContextOptions = {}) {
    this.request = request;
    this.#executionContext = options.executionContext;
  }

  get url() {
    if (!this.#url) {
      this.#url = new URL(this.request.url);
    }
    return this.#url;
  }

  get state() {
    return this.#state;
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
}
