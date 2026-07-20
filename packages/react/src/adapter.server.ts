import { defineServerRender } from '@web-widget/helpers';
import { type FunctionComponent } from 'react';
import { createElement, StrictMode } from 'react';

import {
  renderToReadableStream,
  renderToString,
  type RenderToReadableStreamOptions,
  type ReactDOMServerReadableStream,
  type RenderToStringOptions,
} from './edge';
import { createWidgetAdapter } from './components';

declare module '@web-widget/schema' {
  interface ServerRenderOptions {
    react?: StreamOptions;
  }
}

export { resolveFallback } from './components';
export type {
  ReactWidgetComponent,
  ReactWidgetContainerProps,
  ReactWidgetFactory,
  ReactWidgetProps,
  WebWidgetProps,
  WidgetContainerOptions,
} from './components';

export const widget = createWidgetAdapter((children) =>
  renderToString(children, {})
);

type StreamOptions = {
  awaitAllReady?: boolean;
} & RenderToReadableStreamOptions &
  RenderToStringOptions;

export interface ReactRenderOptions {
  react?: StreamOptions;
}

const DEFAULT_TIMEOUT_MS = 1000 * 10;

export const render = defineServerRender<FunctionComponent>(
  async (component, data, { id, progressive, react }) => {
    data = data ?? {};

    if (!component) {
      throw new TypeError(`Missing component.`);
    }

    const reactRenderOptions: StreamOptions = Object.create(react ?? null);

    // React uses this namespace for useId(). It must match hydrateRoot and be
    // unique across independently rendered widget roots in the same document.
    reactRenderOptions.identifierPrefix = id;

    const { onError, awaitAllReady, signal } = reactRenderOptions;

    reactRenderOptions.signal =
      signal ?? AbortSignal.timeout(DEFAULT_TIMEOUT_MS);

    // Defer error logging to avoid duplicates:
    // - Shell errors cause renderMethod to reject → the framework's onFallback
    //   logs them, so we skip.
    // - Non-shell errors (caught by Suspense/ErrorBoundary) don't reject →
    //   we log them after a successful render.
    // - Post-shell errors (streaming phase) are always non-shell → log directly.
    const preShellErrors: unknown[] = [];
    let shellRendered = false;

    reactRenderOptions.onError = (e: unknown, i: any) => {
      if (shellRendered) {
        console.error(e);
      } else {
        preShellErrors.push(e);
      }
      onError?.(e instanceof Error ? e : new Error(String(e)), i);
    };

    const isAsyncFunction =
      Object.prototype.toString.call(component) === '[object AsyncFunction]';
    let vNode = isAsyncFunction
      ? await component(data as any)
      : createElement(component, data as any);

    vNode = createElement(StrictMode, null, vNode);

    const renderMethod = progressive ? renderToReadableStream : renderToString;
    const result = await renderMethod(vNode, reactRenderOptions);

    // Shell rendered successfully — log collected non-shell errors.
    shellRendered = true;
    for (const e of preShellErrors) {
      console.error(e);
    }

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
