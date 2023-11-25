import type { Params } from "./router";
import type { Env, FetchEventLike } from "./types";

export interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

export interface ContextVariableMap {}

type ContextOptions<E extends Env> = {
  env: E["Bindings"];
  requester?: FetchEventLike | ExecutionContext;
};

export class Context<E extends Env = any> {
  state: Record<string, unknown> = Object.create(null);
  /**
   * @experimental
   */
  env: E["Bindings"] = Object.create(null);
  error: Error | undefined = undefined;
  params: Params = Object.create(null);
  pathname: string = "*";
  request: Request;
  /**
   * @experimental
   */
  requester: FetchEventLike | ExecutionContext | undefined;

  constructor(request: Request, options?: ContextOptions<E>) {
    this.request = request;
    if (options) {
      this.env = options.env;
      this.requester = options.requester;
    }
  }
}
