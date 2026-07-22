import type { ClientRender, ServerRender, ServerRenderResult } from './schema';

type Awaitable<T> = T | Promise<T>;

export interface ConformanceExpect {
  (actual: unknown): {
    toBe(expected: unknown): void;
    toBeInstanceOf(expected: Function): void;
    toBeGreaterThan(expected: number): void;
    toBeGreaterThanOrEqual(expected: number): void;
    toBeLessThan(expected: number): void;
    toContain(expected: unknown): void;
    not: { toContain(expected: unknown): void };
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
  widget: Function;
}

export interface ServerConformanceFixture<Component, Data> {
  module: AdapterModuleFixture<Component, Data, ServerRender<Component, Data>>;
  component: Component;
  data: Data;
  progressive: 'stream' | 'buffered' | 'none';
  slots?: {
    render(): Awaitable<string>;
    hostSlot: string;
    shadowMarker: string;
    lightMarker: string;
  };
  pendingBoundary?: {
    render(): Awaitable<string>;
    marker: string;
  };
  errorFallback?: {
    component: Component;
    data?: Data;
    marker: string;
  };
  renderModes?: {
    render(mode: 'default' | 'serverOnly' | 'clientOnly'): Awaitable<string>;
    serverMarker: string;
  };
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
