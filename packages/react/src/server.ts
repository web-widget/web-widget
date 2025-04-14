import {
  defineRender,
  getComponentDescriptor,
  type ComponentProps,
} from '@web-widget/helpers';
import type { FunctionComponent } from 'react';
import { createElement } from 'react';

import type { CreateReactRenderOptions } from './types';
import {
  prerender,
  renderToReadableStream,
  type RenderToReadableStreamOptions,
  type ReactDOMServerReadableStream,
} from './edge';

declare module '@web-widget/schema' {
  interface WidgetRenderOptions {
    react?: {};
  }
  interface RouteRenderOptions {
    react?: StreamOptions;
  }
}

export * from '@web-widget/helpers';
export { useWidgetSyncState as useWidgetState } from '@web-widget/helpers/state';
export * from './components';

type StreamOptions = {
  awaitAllReady?: boolean;
} & RenderToReadableStreamOptions;

export interface ReactRenderOptions {
  react?: StreamOptions;
}

export const createReactRender = ({
  onPrefetchData,
}: CreateReactRenderOptions = {}) => {
  if (onPrefetchData) {
    throw new Error(`"onPrefetchData" is not supported.`);
  }

  return defineRender<unknown, Record<string, string>>(
    async (context, { progressive, react: options } = {}) => {
      const reactRenderOptions: StreamOptions = Object.create(options ?? null);

      let error;
      const componentDescriptor = getComponentDescriptor(context);
      const { component, props } = componentDescriptor;
      const onError = reactRenderOptions.onError;
      const awaitAllReady = reactRenderOptions.awaitAllReady;

      if (!reactRenderOptions.signal) {
        reactRenderOptions.signal = AbortSignal.timeout(1000 * 10);
      }

      reactRenderOptions.onError = (e, i) => {
        error = e;
        if (onError) {
          onError(e, i);
        } else if (!awaitAllReady) {
          console.error(e);
        }
      };

      let vNode;
      if (
        typeof component === 'function' &&
        component.constructor.name === 'AsyncFunction'
      ) {
        // experimental
        vNode = await component(props as ComponentProps<any>);
      } else {
        vNode = createElement(
          component as FunctionComponent,
          props as ComponentProps<any>
        );
      }

      const html = await (progressive
        ? renderToReadableStream(vNode, reactRenderOptions)
        : readableStreamToString(
            (await prerender(vNode, reactRenderOptions)).prelude
          ));

      if (awaitAllReady && typeof html !== 'string') {
        await (html as ReactDOMServerReadableStream).allReady;
      }

      if (error) {
        throw error;
      }

      return html;
    }
  );
};

/**@deprecated Please use `createReactRender` instead.*/
export const defineReactRender = createReactRender;

export const render = createReactRender();

async function readableStreamToString(readableStream: ReadableStream) {
  let result = '';
  const textDecoder = new TextDecoder();
  for await (const chunk of readableStream) {
    result += textDecoder.decode(chunk, { stream: true });
  }
  result += textDecoder.decode(); // flush end character
  return result;
}
