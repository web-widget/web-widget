import type { WebWidgetRendererOptions } from '@web-widget/web-widget';
import type { WidgetModuleLoader } from '@web-widget/schema';
import {
  Suspense,
  createElement,
  memo,
  useContext,
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
    options: WebWidgetRendererOptions = {}
  ) {
    return memo(function ReactWidget({
      children,
      slot,
      widget: { fallback, id, loading, serverOnly, clientOnly } = {},
      ...data
    }: ReactWidgetProps) {
      const serverRenderMode = useContext(ReactServerRenderModeContext);
      const renderStage = serverOnly
        ? ('server' as const)
        : clientOnly
          ? ('client' as const)
          : options.renderStage;
      const { pendingFallback, errorFallback } = resolveFallback(fallback);
      const buffered = serverRenderMode === 'buffered';
      const task = createWidgetRenderTask({
        ...options,
        children,
        data,
        id,
        loader,
        loading: loading ?? options.loading,
        renderChildren,
        renderStage,
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

      return buffered
        ? view
        : createElement(Suspense, {
            fallback: pendingFallback,
            children: view,
          });
    });
  } as ReactWidgetFactory;
}
