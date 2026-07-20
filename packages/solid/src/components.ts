import type { Component, JSX } from 'solid-js';
import {
  ErrorBoundary,
  Suspense,
  createComponent,
  createResource,
  splitProps,
} from 'solid-js';
import { Dynamic } from 'solid-js/web';
import type { WebWidgetRendererOptions } from '@web-widget/web-widget';
import type {
  ExtractWidgetProps,
  WidgetContainerOptions,
  WidgetContainerProps,
  WidgetModuleLoader,
} from '@web-widget/schema';
import { WebWidgetRenderer } from '@web-widget/web-widget';
export type { WidgetContainerOptions } from '@web-widget/schema';

export type SolidWidgetContainerProps = WidgetContainerProps<JSX.Element>;

export type SolidWidgetComponent<T = unknown> = Component<
  T & { children?: JSX.Element; widget?: SolidWidgetContainerProps }
>;

function resolveFallback(fallback: SolidWidgetContainerProps['fallback']): {
  pending: JSX.Element;
  error: JSX.Element;
} {
  if (
    fallback !== null &&
    typeof fallback === 'object' &&
    ('pending' in fallback || 'error' in fallback)
  ) {
    return {
      pending: fallback.pending,
      error: fallback.error ?? fallback.pending,
    };
  }
  return { pending: fallback as JSX.Element, error: fallback as JSX.Element };
}

export function widget<M>(
  loader: () => Promise<M>,
  options?: WidgetContainerOptions
): SolidWidgetComponent<ExtractWidgetProps<M>>;
export function widget<Props>(
  loader: WidgetModuleLoader,
  options?: WidgetContainerOptions
): SolidWidgetComponent<Props>;
export function widget(
  loader: WidgetModuleLoader,
  options: WebWidgetRendererOptions = {}
) {
  return ((props: Record<string, any>) => {
    const [local, data] = splitProps(props, ['children', 'widget']);
    if (local.children) throw new TypeError('Children not supported.');
    const widget = local.widget ?? {};
    const fallback = resolveFallback(widget.fallback);
    const renderOptions = {
      id: widget.id,
      loading: widget.loading ?? options.loading,
      renderStage: widget.serverOnly
        ? ('server' as const)
        : widget.clientOnly
          ? ('client' as const)
          : options.renderStage,
    };
    const renderer = new WebWidgetRenderer(loader, {
      ...options,
      children: '',
      data,
      ...renderOptions,
      renderTarget: options.renderTarget,
    });
    const widgetProps = {
      component: renderer.localName,
      ...renderer.attributes,
    };
    if (
      widget.clientOnly &&
      typeof window === 'undefined' &&
      fallback.pending != null
    ) {
      return createComponent(Dynamic, {
        ...widgetProps,
        get children() {
          return createComponent(Dynamic, {
            component: 'div',
            'aria-busy': String(renderer.pendingBoundary.ariaBusy),
            slot: renderer.pendingBoundary.slot,
            style: `display: ${renderer.pendingBoundary.display}`,
            children: fallback.pending,
          });
        },
      });
    }
    const [html] = createResource<string | Error>(() =>
      renderer
        .renderInnerHTMLToString()
        .catch((error: unknown) =>
          error instanceof Error ? error : new Error(String(error))
        )
    );
    const content = () => {
      const result = html();
      if (result instanceof Error) return fallback.error;
      return createComponent(Dynamic, {
        ...widgetProps,
        innerHTML: result,
      });
    };
    return createComponent(ErrorBoundary, {
      fallback: () => fallback.error,
      get children() {
        return createComponent(Suspense, {
          fallback: fallback.pending,
          get children() {
            return content();
          },
        });
      },
    });
  }) as SolidWidgetComponent<any>;
}
