/// <reference types="react" />

type WebWidgetFallback = ReactNode | { loading?: ReactNode; error?: ReactNode };

/**
 * Container configuration, isolated from the widget's own props.
 */
type WidgetContainerConfig = {
  /**
   * Fallback UI for loading and error states.
   *
   * Only effective during server-side rendering: loading UI shows while the
   * widget module renders; error UI shows if rendering fails. Both are
   * serialized into the HTML stream — no client-side retry exists in the
   * islands architecture.
   *
   * - `ReactNode` — used for both loading (Suspense) and error (ErrorBoundary).
   * - `{ loading?, error? }` — specify independently; `error` defaults to `loading`.
   */
  fallback?: WebWidgetFallback;
  /** Client-side module loading strategy: `'lazy'` loads on first render, `'eager'` on module parse, `'idle'` on browser idle. */
  loading?: 'lazy' | 'eager' | 'idle';
  /** Widget renders only on the server (SSR), producing static HTML with no client-side mount. Mutually exclusive with `clientOnly`. */
  serverOnly?: true;
  /** Widget renders only on the client, producing no server HTML (empty placeholder until client mount). Mutually exclusive with `serverOnly`. */
  clientOnly?: true;
};

interface ReactWidgetProps {
  widget?: WidgetContainerConfig;
}

interface ReactWidgetComponent<T = unknown> extends ComponentProps<any> {
  (
    props: {
      children?: ReactNode;
    } & ReactWidgetProps &
      T
  ): ReactNode;
}

declare namespace JSX {
  interface IntrinsicAttributes extends ReactWidgetProps {
    key?: Key | null | undefined;
  }
}

declare module '*.widget.jsx' {
  const reactWidgetComponent: ReactWidgetComponent;
  export default reactWidgetComponent;
}

declare module '*.widget.tsx' {
  const reactWidgetComponent: ReactWidgetComponent;
  export default reactWidgetComponent;
}

declare module 'react-dom/server.edge' {
  import type { ReactNode } from 'react';
  import type {
    ReactDOMServerReadableStream,
    RenderToReadableStreamOptions,
  } from 'react-dom/server';

  export function renderToReadableStream(
    children: ReactNode,
    options?: RenderToReadableStreamOptions
  ): Promise<ReactDOMServerReadableStream>;
}

declare module 'react-dom/static.edge' {
  import type { ReactNode } from 'react';
  import type { PrerenderOptions } from 'react-dom/static';

  export function prerender(
    children: ReactNode,
    options?: PrerenderOptions
  ): Promise<{ prelude: ReadableStream }>;
}
