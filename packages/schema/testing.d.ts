import type { ClientRender, ServerRender, ServerRenderResult } from './schema';

type Awaitable<T> = T | Promise<T>;

export interface ConformanceExpect {
  (actual: unknown): {
    toBe(expected: unknown): void;
    toBeInstanceOf(expected: Function): void;
    rejects: { toThrow(expected?: unknown): Promise<void> };
  };
}

export interface ConformanceRunner {
  describe(name: string, suite: () => void): unknown;
  test(name: string, test: () => Awaitable<void>): unknown;
  expect: ConformanceExpect;
}

export interface AdapterModuleFixture<
  Component = unknown,
  Data = unknown,
  Render = ServerRender<Component, Data> | ClientRender<Component, Data>,
> {
  render: Render;
  container: Function;
}

export interface ServerConformanceFixture<Component, Data> {
  module: AdapterModuleFixture<Component, Data, ServerRender<Component, Data>>;
  component: Component;
  data: Data;
  progressive: 'stream' | 'buffered' | 'none';
  assertRendered(
    result: ServerRenderResult,
    context: { progressive: boolean; text: string }
  ): Awaitable<void>;
}

export interface ClientConformanceFixture<Component, Data> {
  module: AdapterModuleFixture<Component, Data, ClientRender<Component, Data>>;
  component: Component;
  data: Data;
  createContainer(): Element | DocumentFragment;
  assertMounted(container: Element | DocumentFragment): Awaitable<void>;
  assertUnmounted(container: Element | DocumentFragment): Awaitable<void>;
  hydration?: {
    prepare(container: Element | DocumentFragment): Awaitable<void>;
    assertRecovered(container: Element | DocumentFragment): Awaitable<void>;
  };
}

export interface AdapterConformanceOptions<
  ServerComponent = unknown,
  ClientComponent = ServerComponent,
  Data = Record<string, unknown>,
> {
  runner: ConformanceRunner;
  adapter: {
    name: string;
    server?: ServerConformanceFixture<ServerComponent, Data>;
    client?: ClientConformanceFixture<ClientComponent, Data>;
  };
}

export function testAdapterConformance<
  ServerComponent = unknown,
  ClientComponent = ServerComponent,
  Data = Record<string, unknown>,
>(
  options: AdapterConformanceOptions<ServerComponent, ClientComponent, Data>
): void;
