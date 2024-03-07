import type { Params } from './router';
import type { Env, FetchEventLike } from './types';

export interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// export interface ContextVariableMap {}

type ContextOptions<E extends Env> = {
  env: E['Bindings'];
  executionContext?: FetchEventLike | ExecutionContext;
};

export class Context<E extends Env = any> {
  state = Object.create(null);
  // /**
  //  * @experimental
  //  */
  // env: E["Bindings"] = Object.create(null);
  error?: unknown;
  params: Params = Object.create(null);
  pathname: string = '*';
  request: Request;
  // /**
  //  * @experimental
  //  */
  // executionContext: FetchEventLike | ExecutionContext | undefined;

  constructor(request: Request, options?: ContextOptions<E>) {
    this.request = request;
    // if (options) {
    //   this.env = options.env;
    //   this.executionContext = options.executionContext;
    // }
  }
}
