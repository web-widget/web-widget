import type {
  ClientWidgetRenderContext,
  ComponentProps,
} from '@web-widget/helpers';
import { defineRender, getComponentDescriptor } from '@web-widget/helpers';
import type { FunctionComponent } from 'react';
import { createElement, StrictMode } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot, hydrateRoot } from 'react-dom/client';
import type { RenderToReadableStreamOptions } from 'react-dom/server';
import { renderToReadableStream } from 'react-dom/server';

type StreamOptions = {
  awaitAllReady?: boolean;
} & RenderToReadableStreamOptions;

export interface ReactRenderOptions {
  react?: StreamOptions;
}

declare module '@web-widget/schema' {
  interface WidgetRenderOptions {
    react?: {};
  }
  interface RouteRenderOptions {
    react?: StreamOptions;
  }
}

const clientRender = /*#__PURE__*/ defineRender(async (context) => {
  const { recovering, container } = context as ClientWidgetRenderContext;
  const componentDescriptor = getComponentDescriptor(context);
  const { component, props } = componentDescriptor;

  if (!container) {
    throw new Error(`Container required.`);
  }

  let root: Root | null;
  return {
    async mount() {
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

      vNode = createElement(StrictMode, null, vNode);

      if (recovering) {
        root = hydrateRoot(container as Element, vNode as any);
      } else {
        root = createRoot(container);
        root.render(vNode as any);
      }
    },

    async unmount() {
      root?.unmount();
      root = null;
    },
  };
});

const serverRender = /*#__PURE__*/ defineRender<
  unknown,
  Record<string, string>
>(async (context, { react: options } = {}) => {
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

  const stream = await renderToReadableStream(vNode, reactRenderOptions);

  if (awaitAllReady) {
    await stream.allReady;
  }

  if (error) {
    throw error;
  }

  return stream;
});

/**
 * Export components to a format that can be rendered by the [Web Widget](https://web-widget.js.org).
 */
export const exporter = /*#__PURE__*/ import.meta.env.SSR
  ? serverRender
  : clientRender;
