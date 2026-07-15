import type { Component, JSX } from 'solid-js';
import {
  ErrorBoundary,
  Suspense,
  createComponent,
  createResource,
  splitProps,
} from 'solid-js';
import { Dynamic } from 'solid-js/web';
import type { Loader, WebWidgetRendererOptions } from '@web-widget/web-widget';
import type { ExtractWidgetProps } from '@web-widget/schema';
import { WebWidgetRenderer } from '@web-widget/web-widget';

export type DefineWebWidgetOptions = Partial<
  Pick<
    WebWidgetRendererOptions,
    'base' | 'import' | 'loading' | 'name' | 'renderStage' | 'renderTarget'
  >
>;

export interface WidgetContainerConfig {
  fallback?: JSX.Element | { pending?: JSX.Element; error?: JSX.Element };
  loading?: WebWidgetRendererOptions['loading'];
  serverOnly?: true;
  clientOnly?: true;
}

export type SolidWidgetComponent<T = unknown> = Component<
  T & { children?: JSX.Element; widget?: WidgetContainerConfig }
>;

function resolveFallback(fallback: WidgetContainerConfig['fallback']): {
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

export function container<M>(
  loader: () => Promise<M>,
  options?: DefineWebWidgetOptions
): SolidWidgetComponent<ExtractWidgetProps<M>>;
export function container<Props>(
  loader: Loader,
  options?: DefineWebWidgetOptions
): SolidWidgetComponent<Props>;
export function container(
  loader: Loader,
  options: DefineWebWidgetOptions = {}
) {
  return ((props: Record<string, any>) => {
    const [local, data] = splitProps(props, ['children', 'widget']);
    if (local.children) throw new TypeError('Children not supported.');
    const widget = local.widget ?? {};
    const fallback = resolveFallback(widget.fallback);
    const renderStage = widget.serverOnly
      ? 'server'
      : widget.clientOnly
        ? 'client'
        : options.renderStage;
    const renderer = new WebWidgetRenderer(loader, {
      ...options,
      children: '',
      data,
      loading: widget.loading ?? options.loading ?? 'lazy',
      renderStage,
      renderTarget: options.renderTarget ?? 'light',
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
            component: renderer.pendingLocalName,
            'aria-busy': 'true',
            style: 'display: contents',
            children: fallback.pending,
          });
        },
      });
    }
    const [html] = createResource(() => renderer.renderInnerHTMLToString());
    const content = () => {
      return createComponent(Dynamic, {
        ...widgetProps,
        get innerHTML() {
          return html();
        },
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
