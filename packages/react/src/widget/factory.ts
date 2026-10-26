import type { WebWidgetRendererOptions } from '@web-widget/web-widget';
import type { WidgetModuleLoader } from '@web-widget/schema';
import {
  Suspense,
  createElement,
  lazy,
  memo,
  useContext,
  type FunctionComponent,
  type ReactNode,
} from 'react';
import { ReactServerRenderModeContext } from '../server/context';
import { resolveFallback } from './fallback';
import { createWidgetRenderTask } from './task';
import type { ReactWidgetFactory, ReactWidgetProps } from './types';
import { BufferedWidgetView, StreamingWidgetView } from './views';

export function createWidgetAdapter(
  renderChildren?: (children: ReactNode) => Promise<string>
): ReactWidgetFactory {
  return function widget(
    loader: WidgetModuleLoader,
    options: WebWidgetRendererOptions & { native?: true } = {}
  ) {
    const { native, ...rendererOptions } = options;
    const NativeComponent = native
      ? lazy(loader as () => Promise<{ default: FunctionComponent }>)
      : null;

    return memo(function ReactWidget({
      children,
      slot,
      widget = {},
      ...data
    }: ReactWidgetProps) {
      const { fallback, id, loading, clientOnly } = widget;
      if (widget.serverOnly && clientOnly) {
        throw new TypeError('serverOnly and clientOnly cannot both be true.');
      }
      const serverRenderMode = useContext(ReactServerRenderModeContext);
      if (
        widget.serverOnly &&
        NativeComponent &&
        rendererOptions.root !== 'shadow'
      ) {
        return createElement(NativeComponent, { ...data, slot }, children);
      }

      const { pendingFallback, errorFallback } = resolveFallback(fallback);
      const buffered = serverRenderMode === 'buffered';
      const task = createWidgetRenderTask({
        ...rendererOptions,
        clientOnly: widget.clientOnly,
        children,
        data,
        id,
        loader,
        loading: loading ?? rendererOptions.loading,
        renderChildren,
        serverOnly: widget.serverOnly,
        slot,
      });
      const view = createElement(
        buffered ? BufferedWidgetView : StreamingWidgetView,
        {
          clientOnly,
          errorFallback,
          pendingFallback,
          task,
        }
      );

      return buffered || task.opaqueInnerHTML !== undefined
        ? view
        : createElement(Suspense, {
            fallback: pendingFallback,
            children: view,
          });
    });
  } as ReactWidgetFactory;
}
