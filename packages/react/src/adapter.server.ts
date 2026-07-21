import { defineServerRender } from '@web-widget/helpers';
import { type FunctionComponent } from 'react';
import { createElement, StrictMode } from 'react';
import type { ReactDOMServerReadableStream } from 'react-dom/server';

import {
  prerenderToString,
  renderToReadableStream,
  type PrerenderToStringOptions,
  type RenderToReadableStreamOptions,
} from './server/react-dom';
import { ReactServerRenderModeContext } from './server/context';
import { createWidgetAdapter } from './widget/factory';

declare module '@web-widget/schema' {
  interface ServerRenderOptions {
    react?: StreamOptions;
  }
}

export { resolveFallback } from './widget/fallback';
export type * from './widget/types';

export const widget = createWidgetAdapter((children) =>
  prerenderToString(
    createElement(
      ReactServerRenderModeContext.Provider,
      { value: 'buffered' },
      children
    ),
    {}
  )
);

type StreamOptions = {
  /** @deprecated */
  awaitAllReady?: boolean;
} & RenderToReadableStreamOptions &
  PrerenderToStringOptions;

export interface ReactRenderOptions {
  react?: StreamOptions;
}

const DEFAULT_TIMEOUT_MS = 1000 * 10;

export const render = defineServerRender<FunctionComponent>(
  async (component, data, { id, progressive, react }) => {
    if (!component) {
      throw new TypeError(`Missing component.`);
    }

    const props = data ?? {};
    const { awaitAllReady, onError, signal, ...configuredOptions } =
      react ?? {};

    // Defer error logging to avoid duplicates:
    // - Shell errors cause renderMethod to reject → the framework's onFallback
    //   logs them, so we skip.
    // - Non-shell errors (caught by Suspense/ErrorBoundary) don't reject →
    //   we log them after a successful render.
    // - Post-shell errors (streaming phase) are always non-shell → log directly.
    const preShellErrors: unknown[] = [];
    let shellRendered = false;

    const reactRenderOptions: StreamOptions = {
      ...configuredOptions,
      // React uses this namespace for useId(). It must match hydrateRoot and
      // be unique across independently rendered widget roots in one document.
      identifierPrefix: id,
      signal: signal ?? AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
      onError(e: unknown, i: any) {
        if (shellRendered) {
          console.error(e);
        } else {
          preShellErrors.push(e);
        }
        onError?.(e instanceof Error ? e : new Error(String(e)), i);
      },
    };

    const isAsyncFunction =
      Object.prototype.toString.call(component) === '[object AsyncFunction]';
    let vNode = isAsyncFunction
      ? await component(props as any)
      : createElement(component, props as any);

    vNode = createElement(
      ReactServerRenderModeContext.Provider,
      { value: progressive ? 'progressive' : 'buffered' },
      createElement(StrictMode, null, vNode)
    );

    const renderMethod = progressive
      ? renderToReadableStream
      : prerenderToString;
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
