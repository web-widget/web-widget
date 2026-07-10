import { defineServerRender } from '@web-widget/helpers';
import { Component, type FunctionComponent, type ReactNode } from 'react';
import { createElement, StrictMode } from 'react';

import {
  renderToReadableStream,
  renderToString,
  type RenderToReadableStreamOptions,
  type ReactDOMServerReadableStream,
  type RenderToStringOptions,
} from './edge';

declare module '@web-widget/schema' {
  interface ServerRenderOptions {
    react?: StreamOptions;
  }
}

export * from '@web-widget/helpers';
export { useWidgetSyncState as useWidgetState } from '@web-widget/helpers/state';
export * from './components';

type StreamOptions = {
  awaitAllReady?: boolean;
} & RenderToReadableStreamOptions &
  RenderToStringOptions;

export interface ReactRenderOptions {
  react?: StreamOptions;
}

const DEFAULT_TIMEOUT_MS = 1000 * 10;

/**
 * Route-level ErrorBoundary that acts as the last line of defense during
 * streaming SSR. Errors not caught by widget-level boundaries bubble here.
 */
class RouteErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('[route] Uncaught rendering error:', error);
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

export const render = defineServerRender<FunctionComponent>(
  async (component, data, { progressive, react }) => {
    data = data ?? {};

    if (!component) {
      throw new TypeError(`Missing component.`);
    }

    const reactRenderOptions: StreamOptions = Object.create(react ?? null);

    const { onError, awaitAllReady, signal } = reactRenderOptions;

    reactRenderOptions.signal =
      signal ?? AbortSignal.timeout(DEFAULT_TIMEOUT_MS);

    reactRenderOptions.onError = (e: unknown, i: any) => {
      // Per React docs: onError must always call console.error.
      console.error(e);
      onError?.(e instanceof Error ? e : new Error(String(e)), i);
    };

    const isAsyncFunction =
      Object.prototype.toString.call(component) === '[object AsyncFunction]';
    let vNode = isAsyncFunction
      ? await component(data as any)
      : createElement(component, data as any);

    if (progressive) {
      // In streaming mode, wrap in RouteErrorBoundary to prevent shell errors
      // from aborting the stream (which would leave the client with nothing).
      // The error is still reported via onError → didError.
      vNode = createElement(RouteErrorBoundary, null, vNode);
    }

    vNode = createElement(StrictMode, null, vNode);

    const renderMethod = progressive ? renderToReadableStream : renderToString;
    const result = await renderMethod(vNode, reactRenderOptions);

    if (
      progressive &&
      awaitAllReady &&
      'allReady' in (result as ReactDOMServerReadableStream)
    ) {
      await (result as ReactDOMServerReadableStream).allReady;
    }

    return result;
  }
);
