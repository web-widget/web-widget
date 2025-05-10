import { defineServerRender } from '@web-widget/helpers';
import type { FunctionComponent } from 'react';
import { createElement, StrictMode } from 'react';

import type { CreateReactRenderOptions } from './types';
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

export const createReactRender = ({}: CreateReactRenderOptions = {}) => {
  return defineServerRender<FunctionComponent>(
    async (component, context, { progressive, react }) => {
      if (!component) {
        throw new TypeError(`Missing component.`);
      }

      const reactRenderOptions: StreamOptions = Object.create(react ?? null);

      let error;
      const onError = reactRenderOptions.onError;
      const awaitAllReady = reactRenderOptions.awaitAllReady;

      if (!reactRenderOptions.signal) {
        reactRenderOptions.signal = AbortSignal.timeout(1000 * 10);
      }

      reactRenderOptions.onError = (e, i) => {
        error = e;
        if (onError) {
          onError(e, i);
        } else if (progressive && !awaitAllReady) {
          console.error(e);
        }
      };

      let vNode;
      if (component.constructor.name === 'AsyncFunction') {
        // experimental
        vNode = await component(context as any);
      } else {
        vNode = createElement(component, context as any);
      }

      vNode = createElement(StrictMode, null, vNode);

      const renderMethod = progressive
        ? renderToReadableStream
        : renderToString;
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
};

/**@deprecated Please use `createReactRender` instead.*/
export const defineReactRender = createReactRender;

export const render = createReactRender();
