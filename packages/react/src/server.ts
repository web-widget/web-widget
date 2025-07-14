import { defineServerRender } from '@web-widget/helpers';
import type { FunctionComponent } from 'react';
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

export const render = defineServerRender<FunctionComponent>(
  async (component, data, { progressive, react }) => {
    data = data ?? {};

    if (!component) {
      throw new TypeError(`Missing component.`);
    }

    const reactRenderOptions: StreamOptions = Object.create(react ?? null);

    let error: unknown;
    const { onError, awaitAllReady, signal } = reactRenderOptions;

    reactRenderOptions.signal =
      signal ?? AbortSignal.timeout(DEFAULT_TIMEOUT_MS);

    reactRenderOptions.onError = (e, i) => {
      error = e;
      onError?.(e, i);
      if (!onError && progressive && !awaitAllReady) {
        console.error(e);
      }
    };

    const isAsyncFunction =
      Object.prototype.toString.call(component) === '[object AsyncFunction]';
    let vNode = isAsyncFunction
      ? await component(data as any)
      : createElement(component, data as any);

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

    if (error) {
      throw error;
    }

    return result;
  }
);
