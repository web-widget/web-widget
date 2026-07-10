/// <reference types="react" />

type WebWidgetFallback = ReactNode | { loading?: ReactNode; error?: ReactNode };

interface WebWidgetSuspenseProps {
  fallback?: WebWidgetFallback;
  experimental_loading?: 'lazy' | 'eager' | 'idle';
  renderStage?: 'server' | 'client';
  experimental_renderTarget?: 'light' | 'shadow';
}

interface ReactWidgetComponent<T = unknown> extends ComponentProps<any> {
  (
    props: {
      children?: ReactNode;
    } & WebWidgetSuspenseProps &
      T
  ): ReactNode;
}

declare namespace JSX {
  interface IntrinsicAttributes extends WebWidgetSuspenseProps {
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
